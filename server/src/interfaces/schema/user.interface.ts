import { Types } from "mongoose";

export interface IUser {
  _id?: Types.ObjectId | string;  googleId: string;
  name: string;
  email: string;
  picture?: string;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}