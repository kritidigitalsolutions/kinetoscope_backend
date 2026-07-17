require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const User = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/User.model');
const ClientProfile = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/ClientProfile.model');

connectDB()
  .then(async () => {
    const id1 = '6a464e2aca6673a6be3ef57e';
    const id2 = '6a164e2aca6673a6be3ef57e';

    console.log(`Querying ID 1: ${id1}`);
    const u1 = await User.findById(id1).lean();
    const p1 = await ClientProfile.findOne({ userId: id1 }).lean();
    console.log('User 1:', u1);
    console.log('Profile 1:', p1 ? { _id: p1._id, phone: p1.phone, dob: p1.dob, address: p1.address, panNumber: p1.panNumber, accountNumber: p1.accountNumber } : 'None');

    console.log(`\nQuerying ID 2: ${id2}`);
    const u2 = await User.findById(id2).lean();
    const p2 = await ClientProfile.findOne({ userId: id2 }).lean();
    console.log('User 2:', u2);
    console.log('Profile 2:', p2 ? { _id: p2._id, phone: p2.phone, dob: p2.dob, address: p2.address, panNumber: p2.panNumber, accountNumber: p2.accountNumber } : 'None');

    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
