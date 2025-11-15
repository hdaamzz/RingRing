export interface ICallService {
  createCall(callerId: string, receiverId: string, callType: 'video' | 'audio'): Promise<any>;
  endCall(callId: string, status: 'completed' | 'missed' | 'rejected' | 'cancelled'): Promise<any>;
  getCallHistory(userId: string, page: number, limit: number): Promise<any>;
}