import { ICall } from '../interfaces/schema/call.interface.js';

export interface ICallRepository {
  create(callData: Partial<ICall>): Promise<ICall>;
  findById(id: string): Promise<ICall | null>;
  findByUserId(userId: string, limit?: number): Promise<ICall[]>;
  updateCallEnd(id: string, endTime: Date, duration: number): Promise<ICall | null>;
  getCallHistory(userId: string, page: number, limit: number): Promise<{ calls: ICall[]; total: number }>;
}