import mongoose, { Schema } from 'mongoose';
import { ICall } from '../interfaces/schema/call.interface.js';

const callSchema = new Schema<ICall>(
  {
    callerId: {
      type: String,
      required: true,
      index: true,
    },
    receiverId: {
      type: String,
      required: true,
      index: true,
    },
    callType: {
      type: String,
      enum: ['video', 'audio'],
      default: 'video',
    },
    status: {
      type: String,
      enum: ['missed', 'completed', 'rejected', 'cancelled'],
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

callSchema.index({ callerId: 1, createdAt: -1 });
callSchema.index({ receiverId: 1, createdAt: -1 });
callSchema.index({ callerId: 1, receiverId: 1, createdAt: -1 });

export const Call = mongoose.model<ICall>('Call', callSchema);