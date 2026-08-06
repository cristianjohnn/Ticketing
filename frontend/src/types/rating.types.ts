export type RatingStatus = 'NOT_ELIGIBLE' | 'ELIGIBLE' | 'RATED' | 'EXPIRED';

export type SubmittedFrom = 'web_portal' | 'mobile' | 'api' | 'email' | 'system';

export interface TicketRating {
    id: string;
    ticketId: string;
    clientId: string;
    technicianId: string | null;
    rating: number; // 1-5
    feedback: string | null;
    responseTimeSeconds: number | null;
    submittedFrom: SubmittedFrom;
    clientVersion: string | null;
    device: string | null;
    submittedAt: string;
    createdAt: string;
    updatedAt: string;
    // Joined presentation fields
    clientName?: string;
    clientUsername?: string;
    technicianName?: string;
    technicianUsername?: string;
    ticketTitle?: string;
}

export interface RatingEligibilityResponse {
    rating: TicketRating | null;
    status: RatingStatus;
    canRate: boolean;
    reason: 'ALREADY_RATED' | 'NOT_RESOLVED' | 'SURVEY_EXPIRED' | 'NOT_OWNER' | null;
    daysRemaining: number;
    resolvedAt?: string;
}

export interface CreateRatingDTO {
    ticketId: string;
    rating: number;
    feedback?: string;
    responseTimeSeconds?: number;
    submittedFrom?: SubmittedFrom;
    clientVersion?: string;
    device?: string;
}

export interface CSATRatingDistribution {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
}

export interface TechnicianCSATScorecard {
    technicianId: string;
    technicianName: string;
    technicianUsername: string;
    avgRating: string;
    ratingsCount: number;
    distribution: CSATRatingDistribution;
    responseRate: string;
}

export interface CSATStats {
    overallAvg: string;
    totalRatings: number;
    resolvedTickets: number;
    eligibleSurveys: number;
    responseRate: string;
    distribution: CSATRatingDistribution;
    technicianLeaderboard: TechnicianCSATScorecard[];
    generatedAt: string;
}

export interface TechnicianPersonalStats {
    technicianId: string;
    technicianName: string;
    avgRating: string;
    totalRatings: number;
    distribution: CSATRatingDistribution;
    recentFeedback: TicketRating[];
}
