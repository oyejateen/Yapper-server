const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  profileImage: { type: String },
  bannerImage: { type: String },
  securityQuestion: { type: String, required: true },
  securityAnswer: { type: String, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  }
}, { timestamps: true });

CommunitySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Community', CommunitySchema);