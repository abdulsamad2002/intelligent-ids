const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');

async function setupAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('⚠ Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      username: 'admin',
      password: 'admin123', // Will be hashed by the model
      role: 'admin'
    });

    await admin.save();
    console.log('✓ Admin user created successfully');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  Please change the password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Error setting up admin:', error);
    process.exit(1);
  }
}

setupAdmin();
