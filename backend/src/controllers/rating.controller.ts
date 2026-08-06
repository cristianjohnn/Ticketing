import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { RatingService } from '../services/rating.service';
import { CreateRatingDTO } from '../types/rating.types';
import { RatingDomainError } from '../utils/csatErrors';

export class RatingController {
    /**
     * POST /api/v1/ratings
     * Submit a customer satisfaction rating for a resolved ticket.
     * Accessible by authenticated ticket requesters.
     */
    public static async submitRating(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const dto: CreateRatingDTO = {
                ticketId: req.body.ticketId,
                rating: req.body.rating,
                feedback: req.body.feedback,
                submittedFrom: req.body.submittedFrom || 'web_portal',
                clientVersion: req.body.clientVersion,
                device: req.body.device
            };

            const rating = await RatingService.submitRating(req.user.id, req.user.role, dto);

            res.status(201).json({
                message: 'Customer rating submitted successfully.',
                rating
            });
        } catch (err: any) {
            if (err instanceof RatingDomainError) {
                res.status(err.statusCode).json({
                    error: err.name,
                    message: err.message
                });
                return;
            }
            next(err);
        }
    }

    /**
     * GET /api/v1/ratings/tickets/:ticketId/eligibility
     * Check survey status, eligibility, and remaining days for a ticket.
     */
    public static async getEligibility(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const ticketId = req.params.ticketId as string;
            const eligibility = await RatingService.getRatingEligibility(
                ticketId,
                req.user?.id,
                req.user?.role
            );

            res.json(eligibility);
        } catch (err: any) {
            if (err instanceof RatingDomainError) {
                res.status(err.statusCode).json({
                    error: err.name,
                    message: err.message
                });
                return;
            }
            next(err);
        }
    }

    /**
     * GET /api/v1/ratings/tickets/:ticketId
     * Fetch existing rating for a ticket.
     */
    public static async getByTicketId(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const ticketId = req.params.ticketId as string;
            const rating = await RatingService.getRatingByTicketId(ticketId);

            if (!rating) {
                res.status(404).json({ error: 'RatingNotFound', message: `No rating found for ticket ${ticketId}.` });
                return;
            }

            res.json(rating);
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /api/v1/ratings/me
     * Fetch ratings submitted by the currently authenticated client.
     */
    public static async getMyRatings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
            const offset = Math.max(0, Number(req.query.offset) || 0);

            const ratings = await RatingService.getClientRatings(req.user.id, limit, offset);
            res.json({
                ratings,
                count: ratings.length,
                limit,
                offset
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /api/v1/ratings/technicians/:technicianId
     * Fetch ratings attributed to a technician (Admin or the technician themselves).
     */
    public static async getTechnicianRatings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const technicianId = req.params.technicianId as string;
            const isSelf = req.user?.id === technicianId;
            const isAdmin = req.user?.role === 'admin';

            if (!isSelf && !isAdmin) {
                res.status(403).json({ error: 'Forbidden', message: 'Access denied to technician ratings.' });
                return;
            }

            const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
            const offset = Math.max(0, Number(req.query.offset) || 0);

            const ratings = await RatingService.getTechnicianRatings(technicianId, limit, offset);
            res.json({
                ratings,
                count: ratings.length,
                limit,
                offset
            });
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /api/v1/ratings/technicians/:technicianId/scorecard
     * Get personal scorecard summary for a technician.
     */
    public static async getTechnicianScorecard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const technicianId = req.params.technicianId as string;
            const isSelf = req.user?.id === technicianId;
            const isAdmin = req.user?.role === 'admin';

            if (!isSelf && !isAdmin) {
                res.status(403).json({ error: 'Forbidden', message: 'Access denied to technician scorecard.' });
                return;
            }

            const scorecard = await RatingService.getTechnicianScorecard(technicianId);
            res.json(scorecard);
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /api/v1/ratings/feedback/recent
     * Get recent non-empty feedback reviews (Admin or Technician for own reviews).
     */
    public static async getRecentFeedback(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
            const techId = req.query.technicianId as string | undefined;

            if (req.user?.role !== 'admin' && techId !== req.user?.id) {
                res.status(403).json({ error: 'Forbidden', message: 'Access denied to global feedback reviews.' });
                return;
            }

            const feedback = await RatingService.getRecentFeedback(limit, techId);
            res.json({ feedback, count: feedback.length });
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /api/v1/ratings/stats/overview
     * Get global aggregated CSAT statistics, distribution, and technician leaderboard.
     * Restricted to Admin / Support Managers.
     */
    public static async getAdminStats(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
        try {
            if (req.user?.role !== 'admin') {
                res.status(403).json({ error: 'Forbidden', message: 'Admin access required for CSAT overview.' });
                return;
            }

            const stats = await RatingService.getAdminCSATStats();
            res.json(stats);
        } catch (err) {
            next(err);
        }
    }
}
