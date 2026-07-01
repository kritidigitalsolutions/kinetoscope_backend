const mongoose = require('mongoose');
const User = require('./models/User.model');

// Load environment variables
require('dotenv').config();

const run = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const users = await User.find({}, { name: 1, email: 1, role: 1 });
    console.log('--- Registered Users list ---');
    console.log(JSON.stringify(users, null, 2));
    
    console.log('--- Checking for empty or null emails ---');
    const emptyEmails = await User.find({ $or: [{ email: null }, { email: '' }, { email: { $exists: false } }] });
    console.log(`Found ${emptyEmails.length} documents with empty/null/missing emails.`);
    if (emptyEmails.length > 0) {
      console.log(JSON.stringify(emptyEmails, null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error running check:', err);
    process.exit(1);
  }
};

run();
