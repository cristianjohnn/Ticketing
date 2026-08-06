import { Router } from 'express';
import { RatingController } from '../controllers/rating.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// All CSAT routes require an authenticated user
router.use(requireAuth());

// ─── Rating Submission & Eligibility ──────────────────────────────────────────
// POST /api/v1/ratings -> Submit a rating (strictly original ticket requester)
router.post('/', RatingController.submitRating);

// GET /api/v1/ratings/tickets/:ticketId/eligibility -> Check survey status and expiration
router.get('/tickets/:ticketId/eligibility', RatingController.getEligibility);

// GET /api/v1/ratings/tickets/:ticketId -> Retrieve rating for a ticket
router.get('/tickets/:ticketId', RatingController.getByTicketId);

// ─── User & Technician Views ──────────────────────────────────────────────────
// GET /api/v1/ratings/me -> List ratings submitted by active client
router.get('/me', RatingController.getMyRatings);

// GET /api/v1/ratings/technicians/:technicianId -> Ratings received by technician (Self or Admin)
router.get('/technicians/:technicianId', RatingController.getTechnicianRatings);

// GET /api/v1/ratings/technicians/:technicianId/scorecard -> Technician performance scorecard (Self or Admin)
router.get('/technicians/:technicianId/scorecard', RatingController.getTechnicianScorecard);

// ─── Analytics & Reviews ──────────────────────────────────────────────────────
// GET /api/v1/ratings/feedback/recent -> Recent written reviews (Admin or Technician for own)
router.get('/feedback/recent', RatingController.getRecentFeedback);

// GET /api/v1/ratings/stats/overview -> Global CSAT analytics & leaderboard (Admin only)
router.get('/stats/overview', requireRole('admin'), RatingController.getAdminStats);

export default router;
