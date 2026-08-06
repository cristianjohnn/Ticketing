import { CSATRatingDistribution, CSATStats, RatingEligibilityResponse, TechnicianCSATScorecard, TechnicianPersonalStats, Ticket, TicketRating } from '../types';
import { formatDate, formatRelativeTime } from '../utils/formatters';
import { 
    CSATAnalyticsViewModel, 
    RatingModalViewModel, 
    RatingOptionViewModel, 
    RatingSummaryViewModel, 
    StarDistributionItemViewModel, 
    TechnicianScorecardViewModel 
} from '../viewmodels/rating.viewmodels';

const RATING_OPTIONS: RatingOptionViewModel[] = [
    { value: 1, label: 'Very Poor', description: 'Significant issues, unsatisfied with resolution', colorToken: 'var(--csat-rating-1, #ef4444)' },
    { value: 2, label: 'Poor', description: 'Below expectations, unresolved concerns', colorToken: 'var(--csat-rating-2, #f97316)' },
    { value: 3, label: 'Average', description: 'Acceptable service, standard resolution', colorToken: 'var(--csat-rating-3, #eab308)' },
    { value: 4, label: 'Good', description: 'Met expectations, helpful support', colorToken: 'var(--csat-rating-4, #84cc16)' },
    { value: 5, label: 'Excellent', description: 'Exceptional service and quick resolution', colorToken: 'var(--csat-rating-5, #22c55e)' }
];

export class RatingMapper {
    private static getSentiment(score: number): { sentiment: 'positive' | 'neutral' | 'negative'; label: string; badgeClass: string } {
        if (score >= 4) {
            return { sentiment: 'positive', label: score === 5 ? 'Excellent' : 'Good', badgeClass: 'badge-success' };
        }
        if (score === 3) {
            return { sentiment: 'neutral', label: 'Average', badgeClass: 'badge-warning' };
        }
        return { sentiment: 'negative', label: score === 2 ? 'Poor' : 'Very Poor', badgeClass: 'badge-danger' };
    }

    private static getInitials(name?: string): string {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    private static formatDuration(seconds: number | null): string | null {
        if (!seconds || seconds <= 0) return null;
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        return `${hrs}h ${remMins}m`;
    }

    /**
     * Map a single TicketRating record to a RatingSummaryViewModel
     */
    public static mapToRatingSummary(rating: TicketRating): RatingSummaryViewModel {
        const sentimentInfo = this.getSentiment(rating.rating);
        const clientName = rating.clientName || rating.clientUsername || 'Client';
        const techName = rating.technicianName || rating.technicianUsername || 'Assigned Technician';

        return {
            id: rating.id,
            ticketId: rating.ticketId,
            rating: rating.rating,
            ratingScoreText: `${rating.rating} / 5`,
            sentiment: sentimentInfo.sentiment,
            sentimentLabel: sentimentInfo.label,
            badgeClass: sentimentInfo.badgeClass,
            feedback: rating.feedback || null,
            hasFeedback: !!rating.feedback && rating.feedback.trim().length > 0,
            submittedAtFormatted: formatDate(rating.submittedAt || rating.createdAt),
            submittedAtRelative: formatRelativeTime(rating.submittedAt || rating.createdAt),
            clientName,
            clientInitials: this.getInitials(clientName),
            technicianName: techName,
            technicianInitials: this.getInitials(techName),
            responseTimeFormatted: this.formatDuration(rating.responseTimeSeconds)
        };
    }

    /**
     * Map a Ticket and its RatingEligibilityResponse to a RatingModalViewModel
     */
    public static mapToModalViewModel(ticket: Ticket, eligibility: RatingEligibilityResponse): RatingModalViewModel {
        const techName = ticket.assignee || 'Assigned Technician';
        const expiresInText = eligibility.daysRemaining > 0
            ? `${eligibility.daysRemaining} day${eligibility.daysRemaining > 1 ? 's' : ''} left`
            : 'Survey Expiring Today';

        return {
            ticketId: ticket.id,
            ticketTitle: ticket.title,
            technicianName: techName,
            technicianInitials: this.getInitials(techName),
            resolvedAtFormatted: formatDate(eligibility.resolvedAt || ticket.updatedAt),
            expiresInText,
            canSubmit: eligibility.canRate,
            ratingOptions: RATING_OPTIONS
        };
    }

    /**
     * Map distribution counts (1-5) to formatted distribution item ViewModels
     */
    public static mapDistribution(distribution: CSATRatingDistribution | Record<number, number>, total: number): StarDistributionItemViewModel[] {
        const result: StarDistributionItemViewModel[] = [];
        const distMap = distribution as Record<number, number>;
        for (let star = 5; star >= 1; star--) {
            const count = distMap[star] || 0;
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
            result.push({
                star,
                count,
                countFormatted: count.toLocaleString(),
                percentage,
                percentageFormatted: `${percentage}%`
            });
        }
        return result;
    }

    /**
     * Map TechnicianPersonalStats to TechnicianScorecardViewModel
     */
    public static mapToTechnicianScorecard(stats: TechnicianPersonalStats): TechnicianScorecardViewModel {
        const avgNum = parseFloat(stats.avgRating) || 0;
        const sentimentInfo = this.getSentiment(Math.round(avgNum));
        const distribution = this.mapDistribution(stats.distribution, stats.totalRatings);
        const positiveCount = (stats.distribution[4] || 0) + (stats.distribution[5] || 0);
        const satisfactionPercentage = stats.totalRatings > 0 
            ? `${Math.round((positiveCount / stats.totalRatings) * 100)}%` 
            : '0%';

        const recentFeedback = (stats.recentFeedback || []).map(f => this.mapToRatingSummary(f));

        return {
            technicianId: stats.technicianId,
            technicianName: stats.technicianName,
            technicianInitials: this.getInitials(stats.technicianName),
            technicianUsername: stats.technicianName.toLowerCase().replace(/\s+/g, '.'),
            avgRatingFormatted: avgNum > 0 ? avgNum.toFixed(1) : '—',
            avgRatingValue: avgNum,
            totalRatingsFormatted: stats.totalRatings.toLocaleString(),
            totalRatings: stats.totalRatings,
            responseRate: '—',
            satisfactionPercentage,
            sentiment: sentimentInfo.sentiment,
            distribution,
            recentFeedback
        };
    }

    /**
     * Map leaderboard item (TechnicianCSATScorecard) to TechnicianScorecardViewModel
     */
    public static mapLeaderboardItem(item: TechnicianCSATScorecard): TechnicianScorecardViewModel {
        const avgNum = parseFloat(item.avgRating) || 0;
        const sentimentInfo = this.getSentiment(Math.round(avgNum));
        const distribution = this.mapDistribution(item.distribution, item.ratingsCount);
        const positiveCount = (item.distribution[4] || 0) + (item.distribution[5] || 0);
        const satisfactionPercentage = item.ratingsCount > 0 
            ? `${Math.round((positiveCount / item.ratingsCount) * 100)}%` 
            : '0%';

        return {
            technicianId: item.technicianId,
            technicianName: item.technicianName,
            technicianInitials: this.getInitials(item.technicianName),
            technicianUsername: item.technicianUsername,
            avgRatingFormatted: avgNum > 0 ? avgNum.toFixed(1) : '—',
            avgRatingValue: avgNum,
            totalRatingsFormatted: item.ratingsCount.toLocaleString(),
            totalRatings: item.ratingsCount,
            responseRate: item.responseRate,
            satisfactionPercentage,
            sentiment: sentimentInfo.sentiment,
            distribution,
            recentFeedback: []
        };
    }

    /**
     * Map CSATStats to CSATAnalyticsViewModel
     */
    public static mapToAnalyticsViewModel(stats: CSATStats): CSATAnalyticsViewModel {
        const overallNum = parseFloat(stats.overallAvg) || 0;
        const sentimentInfo = this.getSentiment(Math.round(overallNum));
        const distribution = this.mapDistribution(stats.distribution, stats.totalRatings);
        const leaderboard = (stats.technicianLeaderboard || []).map(item => this.mapLeaderboardItem(item));

        return {
            overallAvgFormatted: overallNum > 0 ? overallNum.toFixed(1) : '—',
            overallAvgValue: overallNum,
            totalRatingsFormatted: stats.totalRatings.toLocaleString(),
            totalRatings: stats.totalRatings,
            resolvedTicketsFormatted: stats.resolvedTickets.toLocaleString(),
            eligibleSurveysFormatted: stats.eligibleSurveys.toLocaleString(),
            responseRate: stats.responseRate,
            sentiment: sentimentInfo.sentiment,
            distribution,
            leaderboard,
            generatedAtFormatted: formatDate(stats.generatedAt)
        };
    }
}
