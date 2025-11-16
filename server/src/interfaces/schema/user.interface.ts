import { Document, Types } from "mongoose";

export interface IUser {
  _id?: Types.ObjectId | string;  googleId: string;
  name: string;
  email: string;
  picture?: string;
  emailVerified?: boolean;
  ringNumber?: string; 
  ringNumberAssignedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends Document {
  googleId: string;
  name: string;
  email: string;
  picture?: string;
  emailVerified?: boolean;
  ringNumber?: string; 
  ringNumberAssignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}