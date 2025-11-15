import { Router } from 'express';
import { container } from '../container.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { AuthController } from '../controllers/auth/auth.controller.js';

const router = Router();
const authController = container.resolve(AuthController);
const authMiddleware = container.resolve(AuthMiddleware);

router.post('/google', (req, res) => authController.googleLogin(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));


export default router;