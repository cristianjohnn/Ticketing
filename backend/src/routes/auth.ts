import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { loginLimiter } from '../middleware/security';

const router = Router();

router.post('/login', loginLimiter, AuthController.login);
router.post('/register', AuthController.register);
router.post('/validate', AuthController.validate);
router.post('/logout', AuthController.logout);

export default router;
