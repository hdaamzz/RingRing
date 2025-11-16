import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { IContactService } from '../../services/contact/contact.service.interface.js';

@injectable()
export class ContactController {
  constructor(
    @inject('IContactService') private readonly contactService: IContactService
  ) {}


  async searchUser(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { ringNumber } = req.query;

      if (!ringNumber || typeof ringNumber !== 'string') {
        res.status(400).json({ error: 'Ring Number required' });
        return;
      }

      const user = await this.contactService.searchUsers(req.user.userId, ringNumber);

      res.json({ user });
    } catch (error: any) {
      console.error('Search user error:', error);
      res.status(error.message.includes('not found') ? 404 : 500).json({
        error: error.message || 'Failed to search user',
      });
    }
  }


  async addContact(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { ringNumber } = req.body;

      if (!ringNumber) {
        res.status(400).json({ error: 'Ring Number required' });
        return;
      }

      const contact = await this.contactService.addContact(req.user.userId, ringNumber);

      res.json({
        message: 'Contact added successfully',
        contact,
      });
    } catch (error: any) {
      console.error('Add contact error:', error);
      res.status(400).json({ error: error.message || 'Failed to add contact' });
    }
  }

  async getContacts(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const contacts = await this.contactService.getContacts(req.user.userId);

      res.json({ contacts });
    } catch (error: any) {
      console.error('Get contacts error:', error);
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  }


  async updateContact(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { contactId } = req.params;
      const updateData = req.body;

      const contact = await this.contactService.updateContact(
        req.user.userId,
        contactId,
        updateData
      );

      res.json({
        message: 'Contact updated successfully',
        contact,
      });
    } catch (error: any) {
      console.error('Update contact error:', error);
      res.status(400).json({ error: error.message || 'Failed to update contact' });
    }
  }


  async deleteContact(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { contactId } = req.params;

      await this.contactService.deleteContact(req.user.userId, contactId);

      res.json({ message: 'Contact deleted successfully' });
    } catch (error: any) {
      console.error('Delete contact error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete contact' });
    }
  }


  async toggleFavorite(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { contactId } = req.params;

      const contact = await this.contactService.toggleFavorite(req.user.userId, contactId);

      res.json({
        message: 'Favorite status updated',
        contact,
      });
    } catch (error: any) {
      console.error('Toggle favorite error:', error);
      res.status(400).json({ error: error.message || 'Failed to update favorite' });
    }
  }

  async blockContact(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { contactId } = req.params;

      await this.contactService.blockContact(req.user.userId, contactId);

      res.json({ message: 'Contact blocked successfully' });
    } catch (error: any) {
      console.error('Block contact error:', error);
      res.status(400).json({ error: error.message || 'Failed to block contact' });
    }
  }
}