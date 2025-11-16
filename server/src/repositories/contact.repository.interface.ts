import { IContact } from '../interfaces/schema/contact.interface.js';

export interface IContactRepository {
  create(contactData: Partial<IContact>): Promise<IContact>;
  findByUserId(userId: string): Promise<IContact[]>;
  findById(id: string): Promise<IContact | null>;
  findContactRelation(userId: string, contactUserId: string): Promise<IContact | null>;
  updateContact(id: string, data: Partial<IContact>): Promise<IContact | null>;
  deleteContact(id: string): Promise<boolean>;
  getFavorites(userId: string): Promise<IContact[]>;
  getBlocked(userId: string): Promise<IContact[]>;
  searchContacts(userId: string, searchTerm: string): Promise<IContact[]>;
}