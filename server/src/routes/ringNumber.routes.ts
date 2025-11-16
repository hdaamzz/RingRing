import { Router } from 'express';
import { container } from '../container.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { RingNumberController } from '../controllers/ringNumber/ringNumber.controller.js';

const router = Router();
const ringNumberController = container.resolve(RingNumberController);
const authMiddleware = container.resolve(AuthMiddleware);

router.post('/assign', 
  (req, res, next) => authMiddleware.verify(req, res, next),
  (req, res) => ringNumberController.assignRingNumber(req, res)
);

router.get('/user/:ringNumber',
  (req, res, next) => authMiddleware.verify(req, res, next),
  (req, res) => ringNumberController.findUserByRingNumber(req, res)
);

export default router;