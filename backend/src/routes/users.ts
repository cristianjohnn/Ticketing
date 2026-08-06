import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// Apply auth to all user routes
router.use(requireAuth());

// GET / can be accessed by admin, or it-support (but it-support can only list it-support role)
router.get('/', async (req: any, res: any, next: any) => {
    if (req.user.role === 'admin') {
        if (req.query.role) {
            return await UserController.getActiveByRole(req, res, next);
        }
        return await UserController.getAll(req, res, next);
    }
    if (req.user.role === 'it-support') {
        // Enforce role=it-support query filter for non-admins
        req.query.role = 'it-support';
        return await UserController.getActiveByRole(req, res, next);
    }
    res.status(403).json({ error: 'Access denied.' });
});

router.get('/:id', requireRole('admin'), UserController.getById);
// Self-service change password (any authenticated user)
router.put('/me/change-password', UserController.changePassword);
router.post('/', requireRole('admin'), UserController.create);
router.put('/:id', requireRole('admin'), UserController.update);
router.put('/:id/deactivate', requireRole('admin'), UserController.deactivate);
router.put('/:id/reset-password', requireRole('admin'), UserController.resetPassword);

export default router;
