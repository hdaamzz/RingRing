export interface Contact {
  id: string;
  name: string;
  email: string;
  picture?: string;
  ringNumber: string;
  isFavorite: boolean;
  isBlocked: boolean;
  nickname?: string;
  lastCallDate?: Date;
  totalCalls: number;
  notes?: string;
  groupTags?: string[];
}

export interface SearchUserResult {
  id: string;
  name: string;
  email: string;
  picture?: string;
  ringNumber: string;
  isContact: boolean;
  isFavorite: boolean;
}