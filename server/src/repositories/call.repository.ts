import { injectable } from 'tsyringe';
import { ICallRepository } from './call.repository.interface.js';
import { ICall } from '../interfaces/schema/call.interface.js';
import { Call } from '../models/call.model.js';

@injectable()
export class CallRepository implements ICallRepository {
  async create(callData: Partial<ICall>): Promise<ICall> {
    const call = new Call(callData);
    return await call.save();
  }

  async findById(id: string): Promise<ICall | null> {
    return await Call.findById(id).exec();
  }

  async findByUserId(userId: string, limit: number = 20): Promise<ICall[]> {
    return await Call.find({
      $or: [{ callerId: userId }, { receiverId: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async updateCallEnd(id: string, endTime: Date, duration: number): Promise<ICall | null> {
    return await Call.findByIdAndUpdate(
      id,
      {
        $set: {
          endTime,
          duration,
        },
      },
      { new: true }
    ).exec();
  }

  async getCallHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ calls: ICall[]; total: number }> {
    const skip = (page - 1) * limit;

    const [calls, total] = await Promise.all([
      Call.find({
        $or: [{ callerId: userId }, { receiverId: userId }],
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Call.countDocuments({
        $or: [{ callerId: userId }, { receiverId: userId }],
      }),
    ]);

    return { calls, total };
  }
}