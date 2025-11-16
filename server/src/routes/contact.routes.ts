import { Router } from 'express';
import { container } from '../container.js';
import { AuthMiddleware } from '../middlewares/auth.middleware.js';
import { ContactController } from '../controllers/contact/contact.controller.js';

const router = Router();
const contactController = container.resolve(ContactController);
const authMiddleware = container.resolve(AuthMiddleware);

// const authenticate = (req: any, res: any, next: any) => authMiddleware.verify(req, res, next);

router.get('/search', (req, res, next) => authMiddleware.verify(req, res, next), (req, res) => contactController.searchUser(req, res));

router.get('/', (req, res, next) => authMiddleware.verify(req, res, next), (req, res) => contactController.getContacts(req, res));

router.post('/', (req, res, next) => authMiddleware.verify(req, res, next), (req, res) => contactController.addContact(req, res));

router.put('/:contactId', (req, res, next) => authMiddleware.verify(req, res, next), (req, res) => contactController.updateContact(req, res));

router.delete('/:contactId', (req, res, next) => authMiddleware.verify(req, res, next), (req, res) => contactController.deleteContact(req, res));

router.patch('/:contactId/favorite', (req, res, next) => authMiddleware.verify(req, res, next), (req, res) => contactController.toggleFavorite(req, res));

router.patch('/:contactId/block', (req, res, next) => authMiddleware.verify(req, res, next), (req, res) => contactController.blockContact(req, res));

export default router;