const Community = require('../models/Community');
const Post = require('../models/Post');

exports.createCommunity = async (req, res) => {
  try {
    console.log('Request body:', req.body);

    const { name, description, securityQuestion, securityAnswer, profileImage, bannerImage } = req.body;

    if (!name || !description || !securityQuestion || !securityAnswer) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const community = new Community({
      name,
      description,
      profileImage,
      bannerImage,
      securityQuestion,
      securityAnswer,
      creator: req.user.userId,
      members: [req.user.userId],
      location: {
        type: 'Point',
        coordinates: [0, 0] // Default coordinates, update these with actual values when available
      },
      admin: req.user.userId // Added admin field
    });

    await community.save();
    res.status(201).json(community);
  } catch (error) {
    console.error('Error creating community:', error);
    res.status(500).json({ message: 'Error creating community', error: error.message, stack: error.stack });
  }
};

exports.getAllCommunities = async (req, res) => {
  try {
    console.log('Fetching all communities');
    const communities = await Community.find().select('name description profileImage');
    res.json(communities);
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({ message: 'Error fetching communities', error: error.message });
  }
};

exports.getCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id).populate('posts');
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    res.json(community);
  } catch (error) {
    res.status(400).json({ message: 'Error fetching community', error: error.message });
  }
};

exports.getNearby = async (req, res) => {
  try {
    const { lat, lng } = req.query;
    const communities = await Community.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: 10000 // 10km radius
        }
      }
    }).limit(10);
    res.json(communities);
  } catch (error) {
    res.status(400).json({ message: 'Error fetching nearby communities', error: error.message });
  }
};


exports.joinCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    if (!community.members.includes(req.user.id)) {
      community.members.push(req.user.id);
      await community.save();
    }
    
    res.json({ message: 'Joined community successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error joining community', error: error.message });
  }
};

exports.deleteCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    if (community.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this community' });
    }
    await Community.findByIdAndDelete(req.params.id);
    res.json({ message: 'Community deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting community', error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    if (community.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }
    await Post.findByIdAndDelete(req.params.postId);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting post', error: error.message });
  }
};

exports.getUserCommunities = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id; // Try both possible user ID locations
    console.log('Fetching communities for user:', userId);
    const communities = await Community.find({ members: userId });
    res.json(communities);
  } catch (error) {
    console.error('Error fetching user communities:', error);
    res.status(400).json({ message: 'Error fetching user communities', error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    if (community.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    await Comment.findByIdAndDelete(req.params.commentId);
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting comment', error: error.message });
  }
};