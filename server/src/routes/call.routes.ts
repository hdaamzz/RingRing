import { Router } from 'express';
import { container } from '../container.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { CallController } from '../controllers/call/call.controller.js';

const router = Router();
const callController = container.resolve(CallController);
const authMiddleware = container.resolve(AuthMiddleware);


router.get('/history',  (req, res, next) => authMiddleware.verify(req, res, next), (req, res) => callController.getCallHistory(req, res));

export default router;