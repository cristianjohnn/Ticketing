import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { loginLimiter } from '../middleware/security';

const router = Router();

router.post('/login', loginLimiter, AuthController.login);

export default router;
