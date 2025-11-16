// src/repositories/user.repository.ts
import { injectable } from 'tsyringe';
import { Types } from 'mongoose';
import { IUserRepository } from './user.repository.interface.js';
import UserModel from '../models/user.model.js';
import { IUser } from '../interfaces/schema/user.interface.js';

@injectable()
export class UserRepository implements IUserRepository {
  async findByGoogleId(googleId: string): Promise<IUser | null> {
    const user = await UserModel.findOne({ googleId }).lean<IUser>().exec();
    if (!user) return null;
    
    return {
      ...user,
      _id: user._id?.toString()
    };
  }

  async findById(id: string): Promise<IUser | null> {
    const user = await UserModel.findById(id).lean<IUser>().exec();
    if (!user) return null;
    
    return {
      ...user,
      _id: user._id?.toString()
    };
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await UserModel.findOne({ email }).lean<IUser>().exec();
    if (!user) return null;
    
    return {
      ...user,
      _id: user._id?.toString()
    };
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    const user = new UserModel(userData);
    const savedUser = await user.save();
    const userObject = savedUser.toObject();
    
    return {
      ...userObject,
      _id: (userObject._id as Types.ObjectId).toString()
    };
  }

  async update(id: string, userData: Partial<IUser>): Promise<IUser | null> {
    const user = await UserModel.findByIdAndUpdate(id, userData, { 
      new: true 
    }).lean<IUser>().exec();
    
    if (!user) return null;
    
    return {
      ...user,
      _id: user._id?.toString()
    };
  }

  async delete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id).exec();
    return result !== null;
  }

  async findByRingNumber(ringNumber: string): Promise<IUser | null> {
    const user = await UserModel.findOne({ ringNumber }).lean<IUser>().exec();
    if (!user) return null;
    return {
      ...user,
      _id: user._id?.toString()
    };
  }
}
