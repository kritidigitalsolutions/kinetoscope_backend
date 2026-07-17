require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const User = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/User.model');
const ClientProfile = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/ClientProfile.model');

connectDB()
  .then(async () => {
    const id = '6a161e2aca6673a6be3ef57e';

    console.log(`Querying ID: ${id}`);
    const user = await User.findById(id).lean();
    const profile = await ClientProfile.findOne({ userId: id }).lean();
    console.log('User:', user);
    console.log('Profile:', profile);

    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
