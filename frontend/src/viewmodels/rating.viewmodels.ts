export interface RatingOptionViewModel {
    value: number;
    label: string;
    description: string;
    colorToken: string;
}

export interface RatingModalViewModel {
    ticketId: string;
    ticketTitle: string;
    technicianName: string;
    technicianInitials: string;
    resolvedAtFormatted: string;
    expiresInText: string;
    canSubmit: boolean;
    ratingOptions: RatingOptionViewModel[];
}

export interface RatingSummaryViewModel {
    id: string;
    ticketId: string;
    rating: number;
    ratingScoreText: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    sentimentLabel: string;
    badgeClass: string;
    feedback: string | null;
    hasFeedback: boolean;
    submittedAtFormatted: string;
    submittedAtRelative: string;
    clientName: string;
    clientInitials: string;
    technicianName: string;
    technicianInitials: string;
    responseTimeFormatted: string | null;
}

export interface StarDistributionItemViewModel {
    star: number;
    count: number;
    countFormatted: string;
    percentage: number;
    percentageFormatted: string;
}

export interface TechnicianScorecardViewModel {
    technicianId: string;
    technicianName: string;
    technicianInitials: string;
    technicianUsername: string;
    avgRatingFormatted: string;
    avgRatingValue: number;
    totalRatingsFormatted: string;
    totalRatings: number;
    responseRate: string;
    satisfactionPercentage: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    distribution: StarDistributionItemViewModel[];
    recentFeedback: RatingSummaryViewModel[];
}

export interface CSATAnalyticsViewModel {
    overallAvgFormatted: string;
    overallAvgValue: number;
    totalRatingsFormatted: string;
    totalRatings: number;
    resolvedTicketsFormatted: string;
    eligibleSurveysFormatted: string;
    responseRate: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    distribution: StarDistributionItemViewModel[];
    leaderboard: TechnicianScorecardViewModel[];
    generatedAtFormatted: string;
}
