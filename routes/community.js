const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const authMiddleware = require('../middleware/auth');

router.get('/', communityController.getAllCommunities);
router.post('/', authMiddleware, communityController.createCommunity);
router.get('/user', authMiddleware, communityController.getUserCommunities);
router.get('/:id', communityController.getCommunity);
router.post('/:id/join', authMiddleware, communityController.joinCommunity);
router.delete('/:id', authMiddleware, communityController.deleteCommunity);
router.delete('/:id/post/:postId', authMiddleware, communityController.deletePost);
router.delete('/:id/comment/:commentId', authMiddleware, communityController.deleteComment);

module.exports = router;