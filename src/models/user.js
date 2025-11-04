import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false, // Not required for social login users
  },
  authMethod: {
    type: String,
    enum: ['credentials', 'google', 'facebook', 'mixed'], // mixed = social login user who later set password
    default: 'credentials', // Default for email/password signups
  },
  age: {
    type: Number,
    required: false, // Make optional for credentials login
  },
  freeCredits: {
    type: Number,
    default: 10,
  },
  usedCredits: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const EmailCampaignSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  campaignName: {
    type: String,
    required: true,
  },
  emailList: [{
    email: String,
    name: String,
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed'],
      default: 'pending'
    }
  }],
  subject: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  totalCount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'sending', 'completed', 'failed'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const EmailCampaign = mongoose.models.EmailCampaign || mongoose.model('EmailCampaign', EmailCampaignSchema);