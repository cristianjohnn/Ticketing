import { CreateRatingDTO, CSATStats, RatingEligibilityResponse, TechnicianPersonalStats, TicketRating } from '../types';
import { api } from './api';

export const ratingsAPI = {
    /**
     * Submit a customer satisfaction rating for a resolved ticket.
     * Strictly client/requester only.
     */
    submitRating: (dto: CreateRatingDTO): Promise<TicketRating> => {
        return api<TicketRating>('/ratings', {
            method: 'POST',
            body: JSON.stringify(dto)
        });
    },

    /**
     * Check survey eligibility, expiration window, and existing rating status for a ticket.
     */
    getEligibility: (ticketId: string): Promise<RatingEligibilityResponse> => {
        return api<RatingEligibilityResponse>(`/ratings/tickets/${encodeURIComponent(ticketId)}/eligibility`);
    },

    /**
     * Fetch immutable rating record for a given ticket.
     */
    getByTicketId: (ticketId: string): Promise<TicketRating | null> => {
        return api<TicketRating | null>(`/ratings/tickets/${encodeURIComponent(ticketId)}`);
    },

    /**
     * Fetch all ratings submitted by the authenticated client.
     */
    getMyRatings: (limit = 50, offset = 0): Promise<TicketRating[]> => {
        const queryParams = new URLSearchParams({
            limit: String(limit),
            offset: String(offset)
        });
        return api<TicketRating[]>(`/ratings/me?${queryParams.toString()}`);
    },

    /**
     * Fetch all ratings attributed to a technician (Self or Admin).
     */
    getTechnicianRatings: (technicianId: string, limit = 50, offset = 0): Promise<TicketRating[]> => {
        const queryParams = new URLSearchParams({
            limit: String(limit),
            offset: String(offset)
        });
        return api<TicketRating[]>(`/ratings/technicians/${encodeURIComponent(technicianId)}?${queryParams.toString()}`);
    },

    /**
     * Fetch personal performance scorecard for a technician.
     */
    getTechnicianScorecard: (technicianId: string): Promise<TechnicianPersonalStats> => {
        return api<TechnicianPersonalStats>(`/ratings/technicians/${encodeURIComponent(technicianId)}/scorecard`);
    },

    /**
     * Fetch recent written feedback reviews across tickets.
     */
    getRecentFeedback: (limit = 20, technicianId?: string): Promise<TicketRating[]> => {
        const queryParams = new URLSearchParams({ limit: String(limit) });
        if (technicianId) {
            queryParams.append('technicianId', technicianId);
        }
        return api<TicketRating[]>(`/ratings/feedback/recent?${queryParams.toString()}`);
    },

    /**
     * Fetch global CSAT metrics and leaderboard (Admin only).
     */
    getAdminStats: (): Promise<CSATStats> => {
        return api<CSATStats>('/ratings/stats/overview');
    }
};
