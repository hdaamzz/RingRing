import { Router } from 'express';
import { container } from '../container.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { CallController } from '../controllers/call/call.controller.js';

const router = Router();
const callController = container.resolve(CallController);
const authMiddleware = container.resolve(AuthMiddleware);

const authenticate = (req: any, res: any, next: any) => authMiddleware.verify(req, res, next);

router.get('/history', authenticate, (req, res) => callController.getCallHistory(req, res));

export default router;