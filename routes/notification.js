const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationControllers');
const authMiddleware = require('../middleware/auth');

router.post('/subscribe', authMiddleware, notificationController.subscribe);

module.exports = router;
