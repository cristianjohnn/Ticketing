import { ENV } from '../../config/env';

export const CacheKeys = {
    // Generate a versioned key
    buildKey: (domain: string, identifier: string): string => {
        return `ticketing:${ENV.CACHE_VERSION}:${domain}:${identifier}`;
    },

    stats: {
        dashboard: (filtersHash: string) => CacheKeys.buildKey('stats', `dashboard:${filtersHash}`),
        overview: (filtersHash: string) => CacheKeys.buildKey('stats', `overview:${filtersHash}`),
        leaderboard: (filtersHash: string) => CacheKeys.buildKey('stats', `leaderboard:${filtersHash}`),
        recentFeedback: (filtersHash: string) => CacheKeys.buildKey('stats', `recentFeedback:${filtersHash}`),
        kpi: (filtersHash: string) => CacheKeys.buildKey('stats', `kpi:${filtersHash}`),
        trends: (filtersHash: string) => CacheKeys.buildKey('stats', `trends:${filtersHash}`),
        breakdowns: (filtersHash: string) => CacheKeys.buildKey('stats', `breakdowns:${filtersHash}`),
        sidebar: (filtersHash: string) => CacheKeys.buildKey('stats', `sidebar:${filtersHash}`)
    },

    tickets: {
        recent: () => CacheKeys.buildKey('tickets', 'recent'),
        counts: () => CacheKeys.buildKey('tickets', 'counts'),
        detail: (id: string) => CacheKeys.buildKey('tickets', `detail:${id}`),
        history: (id: string) => CacheKeys.buildKey('tickets', `history:${id}`)
    },
    
    csat: {
        overview: () => CacheKeys.buildKey('csat', 'overview'),
        technician: (id: string) => CacheKeys.buildKey('csat', `technician:${id}`)
    },
    
    notifications: {
        user: (userId: string) => CacheKeys.buildKey('notifications', `user:${userId}`)
    }
};
