const mongoose = require('mongoose');
const PostSchema = new mongoose.Schema({
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  content: { type: String, required: function() { return !this.media || this.media.length === 0; } },
  media: [{
    type: { type: String, enum: ['image', 'video'] },
    url: String
  }],
  isAnonymous: { type: Boolean, default: false },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  isPinned: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);