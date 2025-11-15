import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserDocument extends Document {
  googleId: string;
  name: string;
  email: string;
  picture?: string;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
  },
  {
    timestamps: true,
  }
);

const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);

export default UserModel;
