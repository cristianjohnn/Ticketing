import { EventBus } from '../utils/EventBus';
import { CacheService } from '../infrastructure/cache/CacheService';
import { CacheTags } from '../infrastructure/cache/cacheTags';

export class CacheInvalidationService {
    public static initialize() {
        console.log('[CacheInvalidationService] Registering EventBus listeners...');

        // Stats & Tickets Invalidation
        const invalidateStatsAndTickets = async () => {
            await CacheService.invalidateByTag(CacheTags.STATS);
            await CacheService.invalidateByTag(CacheTags.TICKETS);
        };

        EventBus.onPostCommit('ticket.created', invalidateStatsAndTickets);
        EventBus.onPostCommit('ticket.updated', invalidateStatsAndTickets);
        EventBus.onPostCommit('ticket.resolved', invalidateStatsAndTickets);
        EventBus.onPostCommit('ticket.reopened', invalidateStatsAndTickets);
        EventBus.onPostCommit('ticket.deleted', invalidateStatsAndTickets);
        
        // Ratings & CSAT Invalidation
        const invalidateCSAT = async () => {
            await CacheService.invalidateByTag(CacheTags.STATS);
            await CacheService.invalidateByTag(CacheTags.TICKETS);
            await CacheService.invalidateByTag(CacheTags.CSAT);
        };

        EventBus.onPostCommit('ticket.rated', invalidateCSAT);

        // Notifications Invalidation
        const invalidateNotifications = async () => {
            await CacheService.invalidateByTag(CacheTags.NOTIFICATIONS);
        };

        EventBus.onPostCommit('notification.created', invalidateNotifications);
        EventBus.onPostCommit('notification.updated', invalidateNotifications);
        EventBus.onPostCommit('notification.read_all', invalidateNotifications);
    }
}
