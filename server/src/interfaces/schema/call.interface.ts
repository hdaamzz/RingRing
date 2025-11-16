export interface ICall {
  _id?: string;
  callerId: string;
  receiverId: string;
  callType: 'video' | 'audio';
  status: 'missed' | 'completed' | 'rejected' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  createdAt?: Date;
  updatedAt?: Date;
}