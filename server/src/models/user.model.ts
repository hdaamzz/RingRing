import mongoose, { Schema, Model } from 'mongoose';
import { IUserDocument } from '../interfaces/schema/user.interface';


const userSchema = new Schema<IUserDocument>(
  {
    googleId: { 
      type: String, 
      required: true, 
      unique: true 
    },
    name: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true 
    },
    picture: { 
      type: String 
    },
    emailVerified: { 
      type: Boolean, 
      default: false 
    },
    ringNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    ringNumberAssignedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1, ringNumber: 1 });

const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);

export default UserModel;
