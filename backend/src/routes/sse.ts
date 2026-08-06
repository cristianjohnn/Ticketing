import { Router } from 'express';
import { SSEController } from '../controllers/sse.controller';

const router = Router();

router.get('/subscribe', SSEController.subscribe);

export default router;
