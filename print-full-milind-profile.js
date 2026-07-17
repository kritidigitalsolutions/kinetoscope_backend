require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const ClientProfile = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/ClientProfile.model');

connectDB()
  .then(async () => {
    const id = '6a464e2aca6673a6be3ef57e';
    const profile = await ClientProfile.findOne({ userId: id }).lean();
    console.log('Full Profile Document:', JSON.stringify(profile, null, 2));
    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
