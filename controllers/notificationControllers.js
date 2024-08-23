const User = require('../models/User');

exports.subscribe = async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.user.id;

    await User.findByIdAndUpdate(userId, { pushSubscription: subscription });

    res.status(201).json({ message: 'Subscription successful' });
  } catch (error) {
    console.error('Error in subscription:', error);
    res.status(500).json({ message: 'Subscription failed', error: error.message });
  }
};