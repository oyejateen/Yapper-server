const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', communityController.getAllCommunities);
router.post('/', authMiddleware, upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'bannerImage', maxCount: 1 }
]), communityController.createCommunity);
router.get('/user', authMiddleware, communityController.getUserCommunities);
router.get('/:id', communityController.getCommunity);
router.post('/:id/join', authMiddleware, communityController.joinCommunity);
router.delete('/:id', authMiddleware, communityController.deleteCommunity);
router.delete('/:id/post/:postId', authMiddleware, communityController.deletePost);
router.delete('/:id/comment/:commentId', authMiddleware, communityController.deleteComment);
router.put('/:id', authMiddleware, communityController.updateCommunity);
router.post('/join/:inviteCode', authMiddleware, communityController.joinCommunityByInvite);
router.post('/:id/leave', authMiddleware, communityController.leaveCommunity);

module.exports = router;