export interface IContactService {
  addContact(userId: string, ringNumber: string): Promise<any>;
  getContacts(userId: string): Promise<any[]>;
  updateContact(userId: string, contactId: string, data: any): Promise<any>;
  deleteContact(userId: string, contactId: string): Promise<boolean>;
  toggleFavorite(userId: string, contactId: string): Promise<any>;
  blockContact(userId: string, contactId: string): Promise<any>;
  unblockContact(userId: string, contactId: string): Promise<any>;
  searchUsers(userId: string, ringNumber: string): Promise<any>;
}