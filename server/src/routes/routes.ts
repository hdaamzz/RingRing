import express from 'express';
import authRouter from './auth.routes.js';
import ringNumberRoutes from './ringNumber.routes.js';
import contactRoutes from './contact.routes.js';
import callRoutes from './call.routes.js';

const router = express.Router();

router.use('/auth', authRouter);
router.use('/ring-number', ringNumberRoutes);
router.use('/contacts', contactRoutes);
router.use('/calls', callRoutes);

export default router;