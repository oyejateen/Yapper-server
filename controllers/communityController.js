const Community = require('../models/Community');
const Post = require('../models/Post');
const User = require('../models/User');

exports.createCommunity = async (req, res) => {
  try {
    const { name, description, profileImage, bannerImage, isPrivate } = req.body;

    if (!name || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const inviteCode = await Community.generateInviteCode();

    const community = new Community({
      name,
      description,
      profileImage,
      bannerImage,
      isPrivate: isPrivate === 'true',
      creator: req.user.id,
      members: [req.user.id],
      location: {
        type: 'Point',
        coordinates: [0, 0] // Default coordinates, update these with actual values when available
      },
      admin: req.user.id,
      inviteCode
    });

    await community.save();

    // Add community to user's communities
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { communities: community._id }
    });

    res.status(201).json(community);
  } catch (error) {
    console.error('Error creating community:', error);
    res.status(500).json({ message: 'Error creating community', error: error.message, stack: error.stack });
  }
};

exports.getAllCommunities = async (req, res) => {
  try {
    console.log('Fetching all public communities');
    const communities = await Community.find({ isPrivate: false }).select('name description profileImage bannerImage');
    res.json(communities);
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({ message: 'Error fetching communities', error: error.message });
  }
};

exports.getCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate({
        path: 'posts',
        options: { sort: { createdAt: -1 } },
        populate: { path: 'author', select: 'username' }
      });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    res.json(community);
  } catch (error) {
    console.error('Error fetching community:', error);
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
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (!community.members.includes(req.user.id)) {
      community.members.push(req.user.id);
      await community.save();
      
      // Update user's communities
      await User.findByIdAndUpdate(req.user.id, {
        $addToSet: { communities: community._id }
      });

      // Check if the user has a push subscription
      const user = await User.findById(req.user.id);
      if (!user.pushSubscription) {
        // If no push subscription, send a flag to the client
        return res.json({ message: 'Joined community successfully', requestNotification: true });
      }
    }
    
    res.json({ message: 'Joined community successfully' });
  } catch (error) {
    console.error('Error joining community:', error);
    res.status(400).json({ message: 'Error joining community', error: error.message });
  }
};

exports.deleteCommunity = async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    if (community.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this community' });
    }
    
    await Community.findByIdAndDelete(req.params.id);
    res.json({ message: 'Community deleted successfully' });
  } catch (error) {
    console.error('Error deleting community:', error);
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

exports.updateCommunity = async (req, res) => {
  try {
    const { name, description } = req.body;
    const community = await Community.findById(req.params.id);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (community.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this community' });
    }

    community.name = name;
    community.description = description;
    await community.save();

    res.json(community);
  } catch (error) {
    console.error('Error updating community:', error);
    res.status(400).json({ message: 'Error updating community', error: error.message });
  }
};

exports.joinCommunityByInvite = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const community = await Community.findOne({ inviteCode });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (!community.members.includes(req.user.id)) {
      community.members.push(req.user.id);
      await community.save();
    }

    res.json({ message: 'Joined community successfully', communityId: community._id });
  } catch (error) {
    res.status(400).json({ message: 'Error joining community', error: error.message });
  }
};