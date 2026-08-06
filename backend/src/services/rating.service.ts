import crypto from 'crypto';
import { db, TxContext } from '../config/db';
import { EventBus } from '../utils/EventBus';
import { CSAT_CONFIG } from '../config/csat.config';
import { RatingRepository } from '../repositories/rating.repository';
import {
    TicketRating,
    CreateRatingDTO,
    RatingStatus,
    CSATStats,
    TechnicianPersonalStats,
    TechnicianCSATScorecard
} from '../types/rating.types';
import {
    DuplicateRatingError,
    TicketNotEligibleForRatingError,
    SurveyExpiredError,
    UnauthorizedRatingError,
    InvalidRatingValueError,
    TicketNotFoundError
} from '../utils/csatErrors';

export class RatingService {
    /**
     * Submit a customer satisfaction rating for a resolved ticket.
     * Enforces all multi-factor domain validations, immutability, and attribution locking.
     * Note: Admins are restricted from submitting ratings to guarantee authentic customer feedback.
     */
    public static async submitRating(
        userId: string,
        userRole: string,
        dto: CreateRatingDTO
    ): Promise<TicketRating> {
        // 1. Validate rating value (must be integer 1 - 5)
        const ratingNum = Number(dto.rating);
        if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            console.warn(`[CSAT Audit] Rejected rating submission for ticket ${dto.ticketId}: Invalid rating value (${dto.rating}) by user ${userId}`);
            throw new InvalidRatingValueError(dto.rating);
        }

        if (!dto.ticketId || typeof dto.ticketId !== 'string') {
            throw new TicketNotFoundError('undefined');
        }

        return await db.withTransaction(async (tx: TxContext) => {
            // 2. Fetch ticket with lock to prevent race conditions
            const ticketRes = await tx.query(
                `SELECT id, status, requester, "userId", primary_assignee_id, resolved_at, resolving_assignee_id, "createdAt", "updatedAt"
                 FROM tickets 
                 WHERE id = $1`,
                [dto.ticketId]
            );

            if (!ticketRes.rows || ticketRes.rows.length === 0) {
                console.warn(`[CSAT Audit] Rejected rating submission: Ticket ${dto.ticketId} not found`);
                throw new TicketNotFoundError(dto.ticketId);
            }

            const ticket = ticketRes.rows[0];

            // 3. Authorization check: Strictly requester only (Admins cannot submit on customer behalf)
            let isRequester = false;
            if (ticket.userId && ticket.userId === userId) {
                isRequester = true;
            } else if (ticket.requester) {
                const userRes = await tx.query('SELECT username FROM users WHERE id = $1', [userId]);
                const username = userRes.rows[0]?.username;
                if (username && username.toLowerCase() === ticket.requester.toLowerCase()) {
                    isRequester = true;
                }
            }

            if (!isRequester) {
                console.warn(`[CSAT Audit] Rejected unauthorized rating submission on ticket ${dto.ticketId} by user ${userId} (Role: ${userRole})`);
                throw new UnauthorizedRatingError('Only the original requester of the ticket may submit CSAT feedback.');
            }

            // 4. Status and resolution check: Ticket must be resolved
            const isResolvedStatus = ticket.status === 'Resolved' || ticket.status === 'Completed' || ticket.status === 'closed';
            const resolvedAtTimestamp = ticket.resolved_at || (isResolvedStatus ? ticket.updatedAt : null);

            if (!isResolvedStatus) {
                console.warn(`[CSAT Audit] Rejected rating submission on ticket ${dto.ticketId}: Ticket is not resolved (Status: ${ticket.status})`);
                throw new TicketNotEligibleForRatingError('Ticket has not been marked as resolved.');
            }

            // 5. Expiration window check using server clock exclusively
            const resolvedDate = new Date(resolvedAtTimestamp);
            const now = new Date();
            const windowMs = CSAT_CONFIG.SURVEY_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
            const diffMs = now.getTime() - resolvedDate.getTime();

            if (diffMs > windowMs) {
                console.warn(`[CSAT Audit] Rejected expired rating submission on ticket ${dto.ticketId} (Resolved: ${resolvedDate.toISOString()}, Now: ${now.toISOString()})`);
                throw new SurveyExpiredError(CSAT_CONFIG.SURVEY_EXPIRATION_DAYS);
            }

            // 6. Duplicate check: ticket must not already be rated (reopening invariant)
            const existingRating = await RatingRepository.findByTicketId(dto.ticketId, tx);
            if (existingRating) {
                console.warn(`[CSAT Audit] Rejected duplicate rating submission on ticket ${dto.ticketId}`);
                throw new DuplicateRatingError(dto.ticketId);
            }

            // 7. Attribution locking: Technician locked to resolving_assignee_id or primary_assignee_id
            const technicianId = ticket.resolving_assignee_id || ticket.primary_assignee_id || null;

            // 8. Calculate response time in seconds strictly as: submitted_at (now) - resolved_at
            const responseTimeSeconds = Math.max(0, Math.floor((now.getTime() - resolvedDate.getTime()) / 1000));

            // 9. Generate rating ID and insert record
            const ratingId = `RAT-${crypto.randomUUID()}`;
            const ratingRecord = await RatingRepository.create({
                id: ratingId,
                ticketId: dto.ticketId,
                clientId: userId,
                technicianId,
                rating: ratingNum,
                feedback: dto.feedback ? dto.feedback.trim() : null,
                responseTimeSeconds,
                submittedFrom: dto.submittedFrom || 'web_portal',
                clientVersion: dto.clientVersion || null,
                device: dto.device || null
            }, tx);

            // 10. Update legacy ticket rating columns for backwards compatibility
            await tx.query(
                `UPDATE tickets 
                 SET rating = $1, "ratingComment" = $2, "updatedAt" = NOW() 
                 WHERE id = $3`,
                [ratingNum, dto.feedback ? dto.feedback.trim() : null, dto.ticketId]
            );

            // 11. Record history event
            await tx.query(`
                INSERT INTO ticket_history ("ticket_id", "actor_id", "event_type", "event_data")
                VALUES ($1, $2, $3, $4)
            `, [
                dto.ticketId,
                userId,
                'ticket_rated',
                JSON.stringify({
                    rating: ratingNum,
                    feedback: dto.feedback ? dto.feedback.trim() : null,
                    technicianId,
                    clientId: userId,
                    responseTimeSeconds,
                    submittedAt: new Date().toISOString()
                })
            ]);

            // 12. Emit domain events for notification deduplication/lifecycle and SSE broadcast
            await EventBus.emit(tx, 'ticket.rated', {
                actorId: userId,
                entityId: dto.ticketId,
                entityType: 'rating',
                metadata: {
                    ratingId: ratingRecord.id,
                    ticketId: dto.ticketId,
                    rating: ratingNum,
                    feedback: dto.feedback ? dto.feedback.trim() : null,
                    technicianId,
                    clientId: userId,
                    hasFeedback: Boolean(dto.feedback && dto.feedback.trim()),
                    responseTimeSeconds,
                    submittedAt: new Date().toISOString()
                }
            });

            if (ratingNum <= CSAT_CONFIG.LOW_RATING_THRESHOLD) {
                await EventBus.emit(tx, 'csat.low_score_alert', {
                    actorId: userId,
                    entityId: ratingRecord.id,
                    entityType: 'rating',
                    metadata: {
                        ratingId: ratingRecord.id,
                        ticketId: dto.ticketId,
                        rating: ratingNum,
                        feedback: dto.feedback ? dto.feedback.trim() : null,
                        technicianId,
                        clientId: userId,
                        responseTimeSeconds,
                        submittedAt: new Date().toISOString()
                    }
                });
            }

            return ratingRecord;
        });
    }

    /**
     * Get rating eligibility and current status for a ticket
     */
    public static async getRatingEligibility(
        ticketId: string,
        userId?: string,
        userRole?: string
    ): Promise<{
        rating: TicketRating | null;
        status: RatingStatus;
        canRate: boolean;
        reason: 'ALREADY_RATED' | 'NOT_RESOLVED' | 'SURVEY_EXPIRED' | 'NOT_OWNER' | null;
        daysRemaining: number;
        resolvedAt: string | null;
    }> {
        const ticketRes = await db.query(
            `SELECT id, status, requester, "userId", primary_assignee_id, resolved_at, resolving_assignee_id, "updatedAt"
             FROM tickets 
             WHERE id = $1`,
            [ticketId]
        );

        if (!ticketRes.rows || ticketRes.rows.length === 0) {
            throw new TicketNotFoundError(ticketId);
        }

        const ticket = ticketRes.rows[0];
        const existingRating = await RatingRepository.findByTicketId(ticketId);

        // 1. If already rated
        if (existingRating) {
            return {
                rating: existingRating,
                status: 'RATED',
                canRate: false,
                reason: 'ALREADY_RATED',
                daysRemaining: 0,
                resolvedAt: ticket.resolved_at ? new Date(ticket.resolved_at).toISOString() : null
            };
        }

        // 2. If not resolved
        const isResolvedStatus = ticket.status === 'Resolved' || ticket.status === 'Completed' || ticket.status === 'closed';
        if (!isResolvedStatus) {
            return {
                rating: null,
                status: 'NOT_ELIGIBLE',
                canRate: false,
                reason: 'NOT_RESOLVED',
                daysRemaining: 0,
                resolvedAt: null
            };
        }

        // 3. Check expiration using server clock
        const resolvedDate = ticket.resolved_at ? new Date(ticket.resolved_at) : new Date(ticket.updatedAt);
        const now = new Date();
        const windowMs = CSAT_CONFIG.SURVEY_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
        const elapsedMs = now.getTime() - resolvedDate.getTime();
        const remainingMs = windowMs - elapsedMs;

        if (remainingMs <= 0) {
            return {
                rating: null,
                status: 'EXPIRED',
                canRate: false,
                reason: 'SURVEY_EXPIRED',
                daysRemaining: 0,
                resolvedAt: resolvedDate.toISOString()
            };
        }

        const daysRemaining = Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));

        // 4. Check user permission to rate (strictly original requester only)
        let isOwner = false;
        if (userId) {
            if (ticket.userId && ticket.userId === userId) {
                isOwner = true;
            } else if (ticket.requester) {
                const userRes = await db.query('SELECT username FROM users WHERE id = $1', [userId]);
                const username = userRes.rows[0]?.username;
                if (username && username.toLowerCase() === ticket.requester.toLowerCase()) {
                    isOwner = true;
                }
            }
        }

        if (!isOwner) {
            return {
                rating: null,
                status: 'NOT_ELIGIBLE',
                canRate: false,
                reason: 'NOT_OWNER',
                daysRemaining,
                resolvedAt: resolvedDate.toISOString()
            };
        }

        return {
            rating: null,
            status: 'ELIGIBLE',
            canRate: true,
            reason: null,
            daysRemaining,
            resolvedAt: resolvedDate.toISOString()
        };
    }

    /**
     * Get rating by ticket ID
     */
    public static async getRatingByTicketId(ticketId: string): Promise<TicketRating | null> {
        return RatingRepository.findByTicketId(ticketId);
    }

    /**
     * Get ratings submitted by a specific client
     */
    public static async getClientRatings(clientId: string, limit = 50, offset = 0): Promise<TicketRating[]> {
        return RatingRepository.findByClientId(clientId, limit, offset);
    }

    /**
     * Get ratings attributed to a technician
     */
    public static async getTechnicianRatings(technicianId: string, limit = 50, offset = 0): Promise<TicketRating[]> {
        return RatingRepository.findByTechnicianId(technicianId, limit, offset);
    }

    /**
     * Get recent feedback comments across tickets
     */
    public static async getRecentFeedback(limit = 20, technicianId?: string): Promise<TicketRating[]> {
        return RatingRepository.findRecentFeedback(limit, technicianId);
    }

    /**
     * Get personal scorecard metrics for a technician
     */
    public static async getTechnicianScorecard(technicianId: string): Promise<TechnicianPersonalStats> {
        const userRes = await db.query(`SELECT "fullName", username FROM users WHERE id = $1`, [technicianId]);
        const user = userRes.rows[0];

        const aggregates = await RatingRepository.getTechnicianAggregates(technicianId);
        const recentFeedback = await RatingRepository.findRecentFeedback(10, technicianId);

        return {
            technicianId,
            technicianName: user ? user.fullName : 'Technician',
            avgRating: aggregates.avgRating.toFixed(2),
            totalRatings: aggregates.totalRatings,
            distribution: aggregates.distribution,
            recentFeedback
        };
    }

    /**
     * Get global aggregated CSAT statistics and technician scorecards for admins
     */
    public static async getAdminCSATStats(): Promise<CSATStats> {
        const aggregates = await RatingRepository.getGlobalCSATAggregates();
        const totalResolved = await RatingRepository.countResolvedTickets();
        const leaderboard = await RatingRepository.getTechnicianLeaderboard();

        const responseRate = totalResolved > 0 
            ? `${Math.min(100, Math.round((aggregates.totalRatings / totalResolved) * 100))}%`
            : '0%';

        const scorecards: TechnicianCSATScorecard[] = leaderboard.map(tech => ({
            technicianId: tech.technicianId,
            technicianName: tech.technicianName,
            technicianUsername: tech.technicianUsername,
            avgRating: tech.avgRating,
            ratingsCount: tech.ratingsCount,
            distribution: tech.distribution,
            responseRate: responseRate
        }));

        return {
            overallAvg: aggregates.overallAvg.toFixed(2),
            totalRatings: aggregates.totalRatings,
            resolvedTickets: totalResolved,
            eligibleSurveys: totalResolved,
            responseRate,
            distribution: aggregates.distribution,
            technicianLeaderboard: scorecards,
            generatedAt: new Date().toISOString()
        };
    }
}
