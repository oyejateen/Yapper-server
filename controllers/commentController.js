const Comment = require('../models/Comment');
const Post = require('../models/Post');

exports.createComment = async (req, res) => {
  try {
    const { content } = req.body;
    const postId = req.params.postId;
    const userId = req.user.id; // Assuming the auth middleware sets req.user

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const comment = new Comment({
      content,
      post: postId,
      author: userId
    });

    await comment.save();

    // Add comment to the post
    await Post.findByIdAndUpdate(postId, {
      $push: { comments: comment._id }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(400).json({ message: 'Error creating comment', error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await Comment.findByIdAndDelete(req.params.commentId);

    // Remove comment from the post
    await Post.findByIdAndUpdate(comment.post, {
      $pull: { comments: comment._id }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: 'Error deleting comment', error: error.message });
  }
};