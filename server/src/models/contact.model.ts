import mongoose, { Schema } from 'mongoose';
import { IContact } from '../interfaces/schema/contact.interface.js';

const contactSchema = new Schema<IContact>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    contactUserId: {
      type: String,
      required: true,
      index: true,
    },
    nickname: {
      type: String,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    lastCallDate: {
      type: Date,
    },
    totalCalls: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
    },
    groupTags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

contactSchema.index({ userId: 1, contactUserId: 1 }, { unique: true });
contactSchema.index({ userId: 1, isFavorite: 1 });
contactSchema.index({ userId: 1, isBlocked: 1 });

export const Contact = mongoose.model<IContact>('Contact', contactSchema);