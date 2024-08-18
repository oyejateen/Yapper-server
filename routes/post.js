const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const authMiddleware = require('../middleware/auth');
const commentController = require('../controllers/commentController');

router.post('/:communityId', authMiddleware, postController.createPost);
router.get('/:postId', postController.getPost);
router.put('/:postId', authMiddleware, postController.updatePost);
router.delete('/:postId', authMiddleware, postController.deletePost);
router.post('/:postId/like', authMiddleware, postController.likePost);
router.post('/:postId/dislike', authMiddleware, postController.dislikePost);
router.post('/:postId/comment', authMiddleware, commentController.createComment);
router.delete('/:postId/comment/:commentId', authMiddleware, commentController.deleteComment);

module.exports = router;