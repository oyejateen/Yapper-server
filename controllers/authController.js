const User = require('../models/User');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate username
    if (username.length < 8 || !/^[a-z0-9]+$/.test(username)) {
      return res.status(400).json({ message: 'Invalid username format' });
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Validate email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email is already in use
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email is already in use' });
    }

    // Validate password
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password)) {
      return res.status(400).json({ message: 'Invalid password format' });
    }

    const user = new User({ username, email, password });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    res.status(400).json({ message: 'Error creating user', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Please provide email/username and password' });
    }

    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }]
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found. Please check your email/username and try again.' });
    }

    if (user.isGoogleUser && !user.password) {
      return res.status(401).json({ message: 'This account was created with Google. Please use Google Sign-In.' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password. Please try again.' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

exports.getCurrentUser = async (req, res) => {
  console.log('getCurrentUser called, req.user:', req.user);
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.googleLogin = async (req, res) => {
  const { access_token } = req.body;
  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const { sub: googleId, email, name, picture } = response.data;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    
    if (!user) {
      // Create a new user if they don't exist
      let username = name.toLowerCase().replace(/\s+/g, '');
      let isUnique = false;
      let counter = 1;

      while (!isUnique) {
        const existingUser = await User.findOne({ username: `${username}${counter}` });
        if (!existingUser) {
          isUnique = true;
          username = `${username}${counter}`;
        } else {
          counter++;
        }
      }

      user = new User({
        username,
        email,
        googleId,
        profilePicture: picture,
        isGoogleUser: true
      });
      await user.save();
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ token: jwtToken, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(400).json({ message: 'Google authentication failed', error: error.message });
  }
};

exports.googleSignup = async (req, res) => {
  const { token } = req.body;
  try {
    const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { sub: googleId, email, name, picture } = response.data;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    if (user) {
      const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token: jwtToken, user: { _id: user._id, username: user.username, email: user.email } });
    }

    // Generate a unique username
    let username = name.toLowerCase().replace(/\s+/g, '');
    let isUnique = false;
    let counter = 1;

    while (!isUnique) {
      const existingUser = await User.findOne({ username: `${username}${counter}` });
      if (!existingUser) {
        isUnique = true;
        username = `${username}${counter}`;
      } else {
        counter++;
      }
    }

    user = new User({
      username,
      email,
      googleId,
      profilePicture: picture,
      isGoogleUser: true
    });
    await user.save();

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(201).json({ token: jwtToken, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Google signup error:', error);
    res.status(400).json({ message: 'Google signup failed', error: error.message });
  }
};

exports.googleOneTap = async (req, res) => {
  const { credential } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    let user = await User.findOne({ $or: [{ googleId }, { email }] });
    
    if (!user) {
      // Create a new user if they don't exist
      let username = name.toLowerCase().replace(/\s+/g, '');
      let isUnique = false;
      let counter = 1;

      while (!isUnique) {
        const existingUser = await User.findOne({ username: `${username}${counter}` });
        if (!existingUser) {
          isUnique = true;
          username = `${username}${counter}`;
        } else {
          counter++;
        }
      }

      user = new User({
        username,
        email,
        googleId,
        profilePicture: picture,
        isGoogleUser: true
      });
      await user.save();
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ token: jwtToken, user: { _id: user._id, username: user.username, email: user.email } });
  } catch (error) {
    console.error('Google One Tap error:', error);
    res.status(400).json({ message: 'Google One Tap authentication failed', error: error.message });
  }
};