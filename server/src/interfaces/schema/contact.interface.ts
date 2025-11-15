export interface IContact {
  _id?: string;
  userId: string;              
  contactUserId: string;       
  nickname?: string;       
  isFavorite: boolean; 
  isBlocked: boolean; 
  lastCallDate?: Date; 
  totalCalls: number; 
  notes?: string;
  groupTags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}