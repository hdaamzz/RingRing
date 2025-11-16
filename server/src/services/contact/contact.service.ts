import { injectable, inject } from 'tsyringe';
import { IContactService } from './contact.service.interface.js';
import { IContactRepository } from '../../repositories/contact.repository.interface.js';
import { IUserRepository } from '../../repositories/user.repository.interface.js';

@injectable()
export class ContactService implements IContactService {
  constructor(
    @inject('IContactRepository') private readonly contactRepo: IContactRepository,
    @inject('IUserRepository') private readonly userRepo: IUserRepository
  ) {}


  async addContact(userId: string, ringNumber: string): Promise<any> {
    const contactUser = await this.userRepo.findByRingNumber(ringNumber);
    
    if (!contactUser) {
      throw new Error('User not found with this Ring Number');
    }

    if (contactUser._id?.toString() === userId) {
      throw new Error('Cannot add yourself as a contact');
    }

    const existingContact = await this.contactRepo.findContactRelation(
      userId,
      contactUser._id as string
    );

    if (existingContact) {
      throw new Error('Contact already exists');
    }

    const contact = await this.contactRepo.create({
      userId,
      contactUserId: contactUser._id as string,
      isFavorite: false,
      isBlocked: false,
      totalCalls: 0,
      groupTags: [],
    });

    return {
      id: contact._id,
      name: contactUser.name,
      email: contactUser.email,
      picture: contactUser.picture,
      ringNumber: contactUser.ringNumber,
      isFavorite: contact.isFavorite,
      isBlocked: contact.isBlocked,
      nickname: contact.nickname,
      lastCallDate: contact.lastCallDate,
      totalCalls: contact.totalCalls,
    };
  }

  async getContacts(userId: string): Promise<any[]> {
    const contacts = await this.contactRepo.findByUserId(userId);

    const populatedContacts = await Promise.all(
      contacts.map(async (contact) => {
        const contactUser = await this.userRepo.findById(contact.contactUserId);
        
        if (!contactUser) return null;

        return {
          id: contact._id,
          name: contactUser.name,
          email: contactUser.email,
          picture: contactUser.picture,
          ringNumber: contactUser.ringNumber,
          isFavorite: contact.isFavorite,
          isBlocked: contact.isBlocked,
          nickname: contact.nickname,
          lastCallDate: contact.lastCallDate,
          totalCalls: contact.totalCalls,
          notes: contact.notes,
          groupTags: contact.groupTags,
        };
      })
    );

    return populatedContacts.filter((c) => c !== null);
  }

  async updateContact(userId: string, contactId: string, data: any): Promise<any> {
    const contact = await this.contactRepo.findById(contactId);

    if (!contact || contact.userId !== userId) {
      throw new Error('Contact not found');
    }

    const updated = await this.contactRepo.updateContact(contactId, data);
    
    if (!updated) {
      throw new Error('Failed to update contact');
    }

    const contactUser = await this.userRepo.findById(updated.contactUserId);

    return {
      id: updated._id,
      name: contactUser?.name,
      email: contactUser?.email,
      picture: contactUser?.picture,
      ringNumber: contactUser?.ringNumber,
      isFavorite: updated.isFavorite,
      isBlocked: updated.isBlocked,
      nickname: updated.nickname,
      lastCallDate: updated.lastCallDate,
      totalCalls: updated.totalCalls,
      notes: updated.notes,
      groupTags: updated.groupTags,
    };
  }

  async deleteContact(userId: string, contactId: string): Promise<boolean> {
    const contact = await this.contactRepo.findById(contactId);

    if (!contact || contact.userId !== userId) {
      throw new Error('Contact not found');
    }

    return await this.contactRepo.deleteContact(contactId);
  }

  async toggleFavorite(userId: string, contactId: string): Promise<any> {
    const contact = await this.contactRepo.findById(contactId);

    if (!contact || contact.userId !== userId) {
      throw new Error('Contact not found');
    }

    return await this.updateContact(userId, contactId, {
      isFavorite: !contact.isFavorite,
    });
  }

  async blockContact(userId: string, contactId: string): Promise<any> {
    return await this.updateContact(userId, contactId, { isBlocked: true });
  }

  async unblockContact(userId: string, contactId: string): Promise<any> {
    return await this.updateContact(userId, contactId, { isBlocked: false });
  }

  async searchUsers(userId: string, ringNumber: string): Promise<any> {
    const user = await this.userRepo.findByRingNumber(ringNumber);

    if (!user) {
      throw new Error('User not found');
    }

    if (user._id?.toString() === userId) {
      throw new Error('Cannot search yourself');
    }

    const existingContact = await this.contactRepo.findContactRelation(
      userId,
      user._id as string
    );

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      picture: user.picture,
      ringNumber: user.ringNumber,
      isContact: !!existingContact,
      isFavorite: existingContact?.isFavorite || false,
    };
  }
}