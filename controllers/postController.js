const Post = require('../models/Post');
const Community = require('../models/Community');
const Comment = require('../models/Comment');
const webpush = require('web-push');
const User = require('../models/User');
const dotenv = require('dotenv');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

dotenv.config();

// Configure webpush
if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.log(process.env.PORT, process.env.VAPID_PUBLIC_KEY)
  console.error('VAPID keys are not set in the environment variables');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:teenjat2611@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.createPost = async (req, res) => {
  console.log('Received request body:', req.body);
  console.log('Received file:', req.file);
  try {
    const { title, content, isAnonymous, postType } = req.body;
    const { communityId } = req.params;
    const userId = req.user.id;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const post = new Post({
      community: communityId,
      author: isAnonymous === 'true' ? null : userId,
      title,
      isAnonymous: isAnonymous === 'true',
      media: []
    });

    if (postType === 'text') {
      if (!content) {
        return res.status(400).json({ message: 'Content is required for text posts' });
      }
      post.content = content;
    } else if (postType === 'media') {
      if (!req.file) {
        return res.status(400).json({ message: 'No media file uploaded for media post' });
      }
      
      // Upload file to Cloudinary
      const uploadPromise = new Promise((resolve, reject) => {
        const cldUploadStream = cloudinary.uploader.upload_stream(
          { resource_type: 'auto', folder: 'post_media' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        streamifier.createReadStream(req.file.buffer).pipe(cldUploadStream);
      });

      const result = await uploadPromise;

      post.media.push({
        type: result.resource_type === 'video' ? 'video' : 'image',
        url: result.secure_url
      });
    } else {
      return res.status(400).json({ message: 'Invalid post type' });
    }

    const savedPost = await post.save();
    console.log('Post saved successfully:', savedPost);

    // Add the post to the community's posts array
    await Community.findByIdAndUpdate(communityId, { $push: { posts: savedPost._id } });

    // Send push notification to community members
    const community = await Community.findById(communityId).populate('members');
    const notificationPromises = community.members.map(async (member) => {
      if (member.pushSubscription) {
        try {
          await webpush.sendNotification(
            member.pushSubscription,
            JSON.stringify({
              title: 'New Post in ' + community.name,
              body: savedPost.title
            })
          );
        } catch (error) {
          console.error('Error sending push notification to user:', member._id, error);
          // If the subscription is no longer valid, remove it
          if (error.statusCode === 410) {
            await User.findByIdAndUpdate(member._id, { $unset: { pushSubscription: 1 } });
          }
        }
      }
    });

    // Wait for all notifications to be sent (or fail)
    await Promise.all(notificationPromises);

    res.status(201).json(savedPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Error creating post', error: error.message, stack: error.stack });
  }
};

exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'username' }
      });
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    // Ensure comments is always an array
    post.comments = post.comments || [];
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(400).json({ message: 'Error fetching post', error: error.message });
  }
};

exports.updatePost = async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    post.content = content;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(400).json({ message: 'Error updating post', error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    console.log('Attempting to delete post:', req.params.postId);
    const post = await Post.findById(req.params.postId);

    if (!post) {
      console.log('Post not found:', req.params.postId);
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author && post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.postId);
    
    // Remove post from community
    await Community.findByIdAndUpdate(post.community, { $pull: { posts: post._id } });

    console.log('Post deleted successfully:', req.params.postId);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(400).json({ message: 'Error deleting post', error: error.message });
  }
};

exports.likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user.id;
    const likedIndex = post.likedBy.indexOf(userId);
    const dislikedIndex = post.dislikedBy.indexOf(userId);

    if (likedIndex > -1) {
      // User has already liked, remove the like
      post.likedBy.splice(likedIndex, 1);
    } else {
      // Add like and remove dislike if exists
      post.likedBy.push(userId);
      if (dislikedIndex > -1) {
        post.dislikedBy.splice(dislikedIndex, 1);
      }
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(400).json({ message: 'Error liking post', error: error.message });
  }
};

exports.dislikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user.id;
    const likedIndex = post.likedBy.indexOf(userId);
    const dislikedIndex = post.dislikedBy.indexOf(userId);

    if (dislikedIndex > -1) {
      // User has already disliked, remove the dislike
      post.dislikedBy.splice(dislikedIndex, 1);
    } else {
      // Add dislike and remove like if exists
      post.dislikedBy.push(userId);
      if (likedIndex > -1) {
        post.likedBy.splice(likedIndex, 1);
      }
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(400).json({ message: 'Error disliking post', error: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { content } = req.body;
    const comment = new Comment({
      post: req.params.postId,
      author: req.user.id,
      content
    });
    await comment.save();
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      { $push: { comments: comment._id } },
      { new: true }
    );
    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ message: 'Error adding comment', error: error.message });
  }
};

exports.togglePinPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const community = await Community.findById(post.community);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (community.admin.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only community admin can pin/unpin posts' });
    }

    post.isPinned = !post.isPinned;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error('Error toggling pin status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};