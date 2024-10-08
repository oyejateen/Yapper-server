const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/google-login', authController.googleLogin);
router.post('/google-signup', authController.googleSignup);
router.post('/google-one-tap', authController.googleOneTap);
module.exports = router;