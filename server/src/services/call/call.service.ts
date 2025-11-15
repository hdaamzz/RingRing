import { injectable, inject } from 'tsyringe';
import { ICallService } from './call.service.interface.js';
import { ICallRepository } from '../../repositories/call.repository.interface.js';
import { IUserRepository } from '../../repositories/user.repository.interface.js';

@injectable()
export class CallService implements ICallService {
  constructor(
    @inject('ICallRepository') private readonly callRepo: ICallRepository,
    @inject('IUserRepository') private readonly userRepo: IUserRepository
  ) {}

  async createCall(callerId: string, receiverId: string, callType: 'video' | 'audio'): Promise<any> {
    const call = await this.callRepo.create({
      callerId,
      receiverId,
      callType,
      status: 'completed',
      startTime: new Date(),
    });

    return {
      callId: call._id,
      callerId: call.callerId,
      receiverId: call.receiverId,
      callType: call.callType,
      startTime: call.startTime,
    };
  }

  async endCall(callId: string, status: 'completed' | 'missed' | 'rejected' | 'cancelled'): Promise<any> {
    const call = await this.callRepo.findById(callId);

    if (!call) {
      throw new Error('Call not found');
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - call.startTime.getTime()) / 1000);

    const updatedCall = await this.callRepo.updateCallEnd(callId, endTime, duration);

    return {
      callId: updatedCall?._id,
      duration,
      status,
    };
  }

  async getCallHistory(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    const { calls, total } = await this.callRepo.getCallHistory(userId, page, limit);

    const populatedCalls = await Promise.all(
      calls.map(async (call) => {
        const otherUserId = call.callerId === userId ? call.receiverId : call.callerId;
        const otherUser = await this.userRepo.findById(otherUserId);

        return {
          id: call._id,
          type: call.callType,
          status: call.status,
          duration: call.duration,
          startTime: call.startTime,
          endTime: call.endTime,
          isIncoming: call.receiverId === userId,
          contact: {
            id: otherUser?._id,
            name: otherUser?.name,
            picture: otherUser?.picture,
            ringNumber: otherUser?.ringNumber,
          },
        };
      })
    );

    return {
      calls: populatedCalls,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }
}