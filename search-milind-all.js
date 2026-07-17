require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const User = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/User.model');
const ClientProfile = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/ClientProfile.model');

connectDB()
  .then(async () => {
    const users = await User.find({ name: /Milind/i }).lean();
    console.log(`Matching users count: ${users.length}`);
    for (const u of users) {
      console.log('User:', u);
      const p = await ClientProfile.findOne({ userId: u._id }).lean();
      console.log('Profile:', p);
    }
    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
