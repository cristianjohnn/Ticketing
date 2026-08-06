import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Legacy dashboard route
router.get('/', requireAuth(), StatsController.getStats as any);

// Phase 5 Analytics routes
router.get('/executive', requireAuth(), StatsController.getExecutiveKPIs as any);
router.get('/tickets/trends', requireAuth(), StatsController.getTicketTrends as any);
router.get('/tickets/breakdowns', requireAuth(), StatsController.getBreakdowns as any);
router.get('/leaderboards', requireAuth(), StatsController.getLeaderboards as any);
router.get('/recent-feedback', requireAuth(), StatsController.getRecentFeedback as any);
router.get('/sidebar', requireAuth(), StatsController.getSidebarStats as any);

export default router;
