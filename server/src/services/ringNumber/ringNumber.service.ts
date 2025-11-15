import { injectable, inject } from 'tsyringe';
import { IRingNumberService } from './ringNumber.service.interface.js';
import { IUserRepository } from '../../repositories/user.repository.interface.js';

@injectable()
export class RingNumberService implements IRingNumberService {
  constructor(
    @inject('IUserRepository') private readonly userRepo: IUserRepository
  ) {}

  async generateRingNumber(): Promise<string> {
    const maxAttempts = 10;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const number = Math.floor(10000000 + Math.random() * 90000000).toString();
      
      const ringNumber = `${number.slice(0, 4)}-${number.slice(4, 8)}`;

      const isAvailable = await this.isRingNumberAvailable(ringNumber);
      
      if (isAvailable) {
        return ringNumber;
      }

      attempts++;
    }

    throw new Error('Failed to generate unique Ring Number after multiple attempts');
  }

  async assignRingNumber(userId: string): Promise<string> {
    const user = await this.userRepo.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.ringNumber) {
      throw new Error('User already has a Ring Number');
    }

    const ringNumber = await this.generateRingNumber();

    const updatedUser = await this.userRepo.update(userId, {
      ringNumber,
      ringNumberAssignedAt: new Date(),
    });

    if (!updatedUser) {
      throw new Error('Failed to assign Ring Number');
    }

    return ringNumber;
  }

  async isRingNumberAvailable(ringNumber: string): Promise<boolean> {
    const existingUser = await this.userRepo.findByRingNumber(ringNumber);
    return !existingUser;
  }

  async findUserByRingNumber(ringNumber: string): Promise<any> {
    const user = await this.userRepo.findByRingNumber(ringNumber);
    
    if (!user) {
      throw new Error('User not found with this Ring Number');
    }

    return {
      id: user._id,
      name: user.name,
      picture: user.picture,
      ringNumber: user.ringNumber,
    };
  }
}