import express from 'express';
import authRouter from './auth.routes.js';
import ringNumberRoutes from './ringNumber.routes.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/ring-number', ringNumberRoutes);

export default router;