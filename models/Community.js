const mongoose = require('mongoose');

const CommunitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  profileImage: { type: String },
  bannerImage: { type: String },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  },
  isPrivate: { type: Boolean, default: false },
  inviteCode: { type: String, unique: true }
}, { timestamps: true });

CommunitySchema.statics.generateInviteCode = async function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
  } while (await this.findOne({ inviteCode: code }));
  return code;
};

CommunitySchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Community', CommunitySchema);