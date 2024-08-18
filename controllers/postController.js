const Post = require('../models/Post');
const Community = require('../models/Community');
const Comment = require('../models/Comment');

exports.createPost = async (req, res) => {
  try {
    const { title, content, isAnonymous } = req.body;
    const { communityId } = req.params;

    console.log('Received post data:', { title, content, isAnonymous, communityId });

    const post = new Post({
      community: communityId,
      author: isAnonymous ? null : req.user.id,
      title,
      content,
      isAnonymous
    });

    await post.save();

    const community = await Community.findById(communityId);
    community.posts.push(post._id);
    await community.save();

    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(400).json({ message: 'Error creating post', error: error.message });
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
    const { title, content } = req.body;
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    post.title = title;
    post.content = content;
    await post.save();

    res.json(post);
  } catch (error) {
    res.status(400).json({ message: 'Error updating post', error: error.message });
  }
};

exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.postId);
    
    // Remove post from community
    await Community.findByIdAndUpdate(post.community, { $pull: { posts: post._id } });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
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