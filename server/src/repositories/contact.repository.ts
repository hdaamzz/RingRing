import { injectable } from 'tsyringe';
import { IContactRepository } from './contact.repository.interface.js';
import { IContact } from '../interfaces/schema/contact.interface.js';
import { Contact } from '../models/contact.model.js';

@injectable()
export class ContactRepository implements IContactRepository {
  async create(contactData: Partial<IContact>): Promise<IContact> {
    const contact = new Contact(contactData);
    return await contact.save();
  }

  async findByUserId(userId: string): Promise<IContact[]> {
    return await Contact.find({ userId, isBlocked: false })
      .sort({ isFavorite: -1, lastCallDate: -1 })
      .exec();
  }

  async findById(id: string): Promise<IContact | null> {
    return await Contact.findById(id).exec();
  }

  async findContactRelation(userId: string, contactUserId: string): Promise<IContact | null> {
    return await Contact.findOne({ userId, contactUserId }).exec();
  }

  async updateContact(id: string, data: Partial<IContact>): Promise<IContact | null> {
    return await Contact.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true }
    ).exec();
  }

  async deleteContact(id: string): Promise<boolean> {
    const result = await Contact.findByIdAndDelete(id).exec();
    return !!result;
  }

  async getFavorites(userId: string): Promise<IContact[]> {
    return await Contact.find({ userId, isFavorite: true, isBlocked: false })
      .sort({ lastCallDate: -1 })
      .exec();
  }

  async getBlocked(userId: string): Promise<IContact[]> {
    return await Contact.find({ userId, isBlocked: true }).exec();
  }

  async searchContacts(userId: string, searchTerm: string): Promise<IContact[]> {
    return await Contact.find({
      userId,
      isBlocked: false,
      $or: [
        { nickname: { $regex: searchTerm, $options: 'i' } },
        { notes: { $regex: searchTerm, $options: 'i' } },
      ],
    }).exec();
  }
}