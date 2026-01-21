const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new Error('Authentication required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_fallback_secret_key');
    const user = await User.findOne({ _id: decoded._id });

    if (!user) {
      throw new Error('User not found');
    }

    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Please authenticate.',
      message: error.message 
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      error: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

/**
 * Basic API Key check for the IDS Python Engine
 */
const idsAuth = (req, res, next) => {
  const apiKey = req.header('X-IDS-Key');
  const secretKey = process.env.IDS_API_KEY || 'ids_engine_secret_key_7788';

  if (!apiKey || apiKey !== secretKey) {
    return res.status(401).json({ 
      success: false, 
      error: 'Unauthorized: Invalid or missing IDS API Key' 
    });
  }
  next();
};

module.exports = { auth, adminOnly, idsAuth };
