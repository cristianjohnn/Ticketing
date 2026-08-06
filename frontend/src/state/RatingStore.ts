import { ratingsAPI } from '../services/ratingsAPI';
import { sseClient } from '../services/sseClient';
import { CreateRatingDTO, CSATStats, RatingEligibilityResponse, TechnicianPersonalStats, TicketRating } from '../types';

export type RatingStoreEventType = 
    | 'RATING_SUBMITTED' 
    | 'RATING_UPDATED' 
    | 'ELIGIBILITY_CHANGED'
    | 'STATS_INVALIDATED';

export interface RatingStoreEvent {
    type: RatingStoreEventType;
    ticketId?: string;
    technicianId?: string;
    rating?: TicketRating;
    eligibility?: RatingEligibilityResponse;
}

export type RatingStoreSubscriber = (event: RatingStoreEvent) => void;

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

class RatingStore {
    private ratingsByTicketId = new Map<string, CacheEntry<TicketRating | null>>();
    private eligibilityByTicketId = new Map<string, CacheEntry<RatingEligibilityResponse>>();
    private scorecardsByTechId = new Map<string, CacheEntry<TechnicianPersonalStats>>();
    private adminStatsCache: CacheEntry<CSATStats> | null = null;
    private recentFeedbackCache: CacheEntry<TicketRating[]> | null = null;
    
    private subscribers: Set<RatingStoreSubscriber> = new Set();
    private isSSEBound = false;
    private readonly TTL_MS = 60 * 1000; // 60s cache TTL

    constructor() {
        this.bindSSE();
    }

    private bindSSE() {
        if (this.isSSEBound) return;
        
        sseClient.on('ticket.rated', (payload: any) => {
            const ticketId = payload?.metadata?.ticketId || payload?.entityId;
            const technicianId = payload?.metadata?.technicianId;

            if (ticketId) {
                // Invalidate or update cached ticket eligibility
                this.eligibilityByTicketId.delete(ticketId);
                this.ratingsByTicketId.delete(ticketId);

                // Invalidate scorecards & analytics
                if (technicianId) {
                    this.scorecardsByTechId.delete(technicianId);
                }
                this.adminStatsCache = null;
                this.recentFeedbackCache = null;

                this.notifySubscribers({
                    type: 'RATING_SUBMITTED',
                    ticketId,
                    technicianId
                });
            }
        });

        sseClient.on('ticket.resolved', (payload: any) => {
            const ticketId = payload?.entityId;
            if (ticketId) {
                this.eligibilityByTicketId.delete(ticketId);
                this.notifySubscribers({
                    type: 'ELIGIBILITY_CHANGED',
                    ticketId
                });
            }
        });

        sseClient.on('ticket.reopened', (payload: any) => {
            const ticketId = payload?.entityId;
            if (ticketId) {
                this.eligibilityByTicketId.delete(ticketId);
                this.notifySubscribers({
                    type: 'ELIGIBILITY_CHANGED',
                    ticketId
                });
            }
        });

        this.isSSEBound = true;
    }

    /**
     * Subscribe to reactive rating store events
     */
    public subscribe(callback: RatingStoreSubscriber): () => void {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }

    private notifySubscribers(event: RatingStoreEvent) {
        this.subscribers.forEach(cb => {
            try {
                cb(event);
            } catch (err) {
                console.error('[RatingStore] Error in subscriber callback:', err);
            }
        });
    }

    /**
     * Get rating eligibility for a ticket (delegates strictly to backend).
     */
    public async getEligibility(ticketId: string, forceRefresh = false): Promise<RatingEligibilityResponse> {
        const cached = this.eligibilityByTicketId.get(ticketId);
        const now = Date.now();

        if (!forceRefresh && cached && (now - cached.timestamp < this.TTL_MS)) {
            return cached.data;
        }

        const eligibility = await ratingsAPI.getEligibility(ticketId);
        this.eligibilityByTicketId.set(ticketId, { data: eligibility, timestamp: now });
        
        // Also sync rating cache if returned
        if (eligibility.rating) {
            this.ratingsByTicketId.set(ticketId, { data: eligibility.rating, timestamp: now });
        }

        return eligibility;
    }

    /**
     * Get rating for a specific ticket.
     */
    public async getRatingByTicketId(ticketId: string, forceRefresh = false): Promise<TicketRating | null> {
        const cached = this.ratingsByTicketId.get(ticketId);
        const now = Date.now();

        if (!forceRefresh && cached && (now - cached.timestamp < this.TTL_MS)) {
            return cached.data;
        }

        const rating = await ratingsAPI.getByTicketId(ticketId);
        this.ratingsByTicketId.set(ticketId, { data: rating, timestamp: now });
        return rating;
    }

    /**
     * Submit a rating (Strictly client only).
     * Updates caches, emits store events, and invalidates analytics.
     */
    public async submitRating(dto: CreateRatingDTO): Promise<TicketRating> {
        const rating = await ratingsAPI.submitRating(dto);
        const now = Date.now();

        // Update local rating cache
        this.ratingsByTicketId.set(dto.ticketId, { data: rating, timestamp: now });

        // Update local eligibility cache to RATED
        const updatedEligibility: RatingEligibilityResponse = {
            rating,
            status: 'RATED',
            canRate: false,
            reason: 'ALREADY_RATED',
            daysRemaining: 0,
            resolvedAt: rating.submittedAt
        };
        this.eligibilityByTicketId.set(dto.ticketId, { data: updatedEligibility, timestamp: now });

        // Invalidate scorecards & analytics
        if (rating.technicianId) {
            this.scorecardsByTechId.delete(rating.technicianId);
        }
        this.adminStatsCache = null;
        this.recentFeedbackCache = null;

        // Notify all subscribers
        this.notifySubscribers({
            type: 'RATING_SUBMITTED',
            ticketId: dto.ticketId,
            technicianId: rating.technicianId || undefined,
            rating,
            eligibility: updatedEligibility
        });

        return rating;
    }

    /**
     * Get technician scorecard metrics.
     */
    public async getTechnicianScorecard(technicianId: string, forceRefresh = false): Promise<TechnicianPersonalStats> {
        const cached = this.scorecardsByTechId.get(technicianId);
        const now = Date.now();

        if (!forceRefresh && cached && (now - cached.timestamp < this.TTL_MS)) {
            return cached.data;
        }

        const scorecard = await ratingsAPI.getTechnicianScorecard(technicianId);
        this.scorecardsByTechId.set(technicianId, { data: scorecard, timestamp: now });
        return scorecard;
    }

    /**
     * Get recent feedback across tickets.
     */
    public async getRecentFeedback(limit = 20, technicianId?: string, forceRefresh = false): Promise<TicketRating[]> {
        const now = Date.now();
        if (!forceRefresh && !technicianId && this.recentFeedbackCache && (now - this.recentFeedbackCache.timestamp < this.TTL_MS)) {
            return this.recentFeedbackCache.data;
        }

        const feedback = await ratingsAPI.getRecentFeedback(limit, technicianId);
        if (!technicianId) {
            this.recentFeedbackCache = { data: feedback, timestamp: now };
        }
        return feedback;
    }

    /**
     * Get global admin CSAT statistics and technician leaderboard.
     */
    public async getAdminStats(forceRefresh = false): Promise<CSATStats> {
        const now = Date.now();
        if (!forceRefresh && this.adminStatsCache && (now - this.adminStatsCache.timestamp < this.TTL_MS)) {
            return this.adminStatsCache.data;
        }

        const stats = await ratingsAPI.getAdminStats();
        this.adminStatsCache = { data: stats, timestamp: now };
        return stats;
    }

    /**
     * Clear all cached data (e.g., on logout or account switch).
     */
    public clearCache() {
        this.ratingsByTicketId.clear();
        this.eligibilityByTicketId.clear();
        this.scorecardsByTechId.clear();
        this.adminStatsCache = null;
        this.recentFeedbackCache = null;
    }
}

export const ratingStore = new RatingStore();
