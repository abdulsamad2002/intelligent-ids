const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid login credentials' });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid login credentials' });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign(
      { _id: user._id, role: user.role }, 
      process.env.JWT_SECRET || 'your_fallback_secret_key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', auth, async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role,
      last_login: req.user.last_login
    }
  });
});

// POST /api/auth/setup - Create initial admin user (Protected/One-time)
// In a real app, this should be more secure or disabled after first use
router.post('/setup', async (req, res) => {
  try {
    // Check if any users exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return res.status(403).json({ success: false, error: 'System already setup' });
    }

    const { username, password } = req.body;
    const admin = new User({
      username,
      password,
      role: 'admin'
    });

    await admin.save();
    res.status(201).json({ 
      success: true, 
      message: 'Admin user created successfully. Please login.' 
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
