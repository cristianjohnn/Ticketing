import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth());

router.get('/unread', NotificationController.getUnread);
router.get('/all', NotificationController.getAll);
router.put('/read-all', NotificationController.markAllAsRead);
router.put('/bulk/read', NotificationController.markBulkAsRead);
router.put('/:id/read', NotificationController.markAsRead);

export default router;
