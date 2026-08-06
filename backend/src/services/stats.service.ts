import { db } from '../config/db';
import { Stats } from '../types';
import { StatsRepository, StatsFilterParams } from '../repositories/stats.repository';
import { CacheService } from '../infrastructure/cache/CacheService';
import { CacheKeys } from '../infrastructure/cache/cacheKeys';
import { CacheTags } from '../infrastructure/cache/cacheTags';
import { CacheTTL } from '../infrastructure/cache/cacheTTL';

export class StatsService {
    private static getFiltersHash(filters: StatsFilterParams): string {
        return Object.entries(filters)
            .filter(([_, v]) => v !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&') || 'all';
    }

    public static async getExecutiveKPIs(filters: StatsFilterParams) {
        const hash = this.getFiltersHash(filters);
        const key = CacheKeys.stats.kpi(hash);
        return CacheService.remember(key, CacheTTL.STATS, () => StatsRepository.getExecutiveKPIs(filters), [CacheTags.STATS]);
    }

    public static async getTicketTrends(filters: StatsFilterParams) {
        const hash = this.getFiltersHash(filters);
        const key = CacheKeys.stats.trends(hash);
        return CacheService.remember(key, CacheTTL.ANALYTICS, () => StatsRepository.getTicketTrends(filters), [CacheTags.STATS]);
    }

    public static async getBreakdowns(filters: StatsFilterParams) {
        const hash = this.getFiltersHash(filters);
        const key = CacheKeys.stats.breakdowns(hash);
        return CacheService.remember(key, CacheTTL.STATS, () => StatsRepository.getBreakdowns(filters), [CacheTags.STATS]);
    }

    public static async getSidebarStats(filters: StatsFilterParams) {
        const hash = this.getFiltersHash(filters);
        const key = CacheKeys.stats.sidebar(hash);
        return CacheService.remember(key, CacheTTL.DEFAULT, () => StatsRepository.getSidebarStats(filters), [CacheTags.STATS, CacheTags.TICKETS]);
    }

    public static async getLeaderboards(filters: StatsFilterParams) {
        const hash = this.getFiltersHash(filters);
        const key = CacheKeys.stats.leaderboard(hash);
        return CacheService.remember(key, CacheTTL.STATS, () => StatsRepository.getLeaderboards(filters), [CacheTags.STATS, CacheTags.USERS]);
    }

    public static async getRecentFeedback(filters: StatsFilterParams) {
        const hash = this.getFiltersHash(filters);
        const key = CacheKeys.stats.recentFeedback(hash);
        return CacheService.remember(key, CacheTTL.DEFAULT, () => StatsRepository.getRecentFeedback(filters), [CacheTags.STATS, CacheTags.CSAT]);
    }

    // Legacy support for existing dashboard while migrating
    public static async getStats(): Promise<Stats> {
        const key = CacheKeys.stats.dashboard('legacy');
        
        return CacheService.remember(key, CacheTTL.STATS, async () => {
            const res = await db.query(`
                SELECT
                    COUNT(*)::integer as total,
                    SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END)::integer as open,
                    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END)::integer as in_progress,
                    SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END)::integer as resolved,
                    SUM(CASE WHEN severity = 'Severe' AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END)::integer as severe,
                    SUM(CASE WHEN priority = 'Critical' AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END)::integer as critical,
                    AVG(CASE WHEN rating IS NOT NULL THEN rating ELSE NULL END) as raw_avg_rating,
                    SUM(CASE WHEN rating IS NOT NULL THEN 1 ELSE 0 END)::integer as rated
                FROM tickets
            `);
            
            const row = res.rows[0] as any;
            const avgRating = row.raw_avg_rating !== null && row.raw_avg_rating !== undefined
                ? Number(row.raw_avg_rating).toFixed(1)
                : null;

            return {
                total: row.total || 0,
                open: row.open || 0,
                inProgress: row.in_progress || 0,
                resolved: row.resolved || 0,
                severe: row.severe || 0,
                critical: row.critical || 0,
                avgRating,
                rated: row.rated || 0,
            };
        }, [CacheTags.STATS, CacheTags.TICKETS]);
    }
}
