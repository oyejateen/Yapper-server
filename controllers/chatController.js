const ChatMessage = require('../models/ChatMessage');
const Community = require('../models/Community');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'chat_files',
    resource_type: 'auto',
    public_id: (req, file) => `${Date.now()}-${file.originalname}`
  },
});

const upload = multer({ storage: storage }).single('file');

exports.getChatMessages = async (req, res) => {
  try {
    const { communityId } = req.params;
    const messages = await ChatMessage.find({ community: communityId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('author', 'username')
      .populate('replyTo');
    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Error fetching chat messages', error: error.message });
  }
};

exports.createChatMessage = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(500).json({ message: 'Error uploading file', error: err.message });
    }

    try {
      const { communityId } = req.params;
      const { content, isAnonymous, replyTo } = req.body;
      const userId = req.user.id;

      const community = await Community.findById(communityId);
      if (!community) {
        return res.status(404).json({ message: 'Community not found' });
      }

      if (!community.members.includes(userId)) {
        return res.status(403).json({ message: 'You are not a member of this community' });
      }

      let fileUrl = null;
      let fileType = null;
      if (req.file) {
        fileUrl = req.file.path;
        fileType = req.file.mimetype.startsWith('image/') ? 'image' : 
                   req.file.mimetype.startsWith('video/') ? 'video' : 'document';
      }

      const newMessage = new ChatMessage({
        community: communityId,
        author: isAnonymous === 'true' ? null : userId,
        content,
        isAnonymous: isAnonymous === 'true',
        replyTo,
        file: fileUrl ? { url: fileUrl, type: fileType } : null
      });

      await newMessage.save();
      await newMessage.populate('author', 'username');
      await newMessage.populate('replyTo');

      // Schedule file deletion after 48 hours
      if (fileUrl) {
        setTimeout(async () => {
          try {
            await cloudinary.uploader.destroy(req.file.filename);
            console.log(`File ${req.file.filename} deleted from Cloudinary`);
          } catch (error) {
            console.error('Error deleting file from Cloudinary:', error);
          }
        }, 48 * 60 * 60 * 1000); // 48 hours in milliseconds
      }

      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Error creating chat message:', error);
      res.status(500).json({ message: 'Error creating chat message', error: error.message });
    }
  });
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.author.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await ChatMessage.findByIdAndDelete(messageId);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat message:', error);
    res.status(500).json({ message: 'Error deleting chat message', error: error.message });
  }
};
