require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const User = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/User.model');
const ClientProfile = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/ClientProfile.model');

connectDB()
  .then(async () => {
    const clients = await User.find({ role: 'client' }).lean();
    console.log(`Total clients in DB: ${clients.length}`);
    for (const c of clients) {
      const p = await ClientProfile.findOne({ userId: c._id }).lean();
      console.log(`\nClient: ${c.name} (${c.email}) [ID: ${c._id}]`);
      console.log('ClientCode:', c.clientCode);
      console.log('AssignedAgent:', c.assignedAgent);
      console.log('Profile KYC:', p ? p.kycStatus : 'No Profile');
      console.log('Profile Phone:', p ? p.phone : 'N/A');
      console.log('Profile BankName:', p ? p.bankName : 'N/A');
      console.log('Profile DOB:', p ? p.dob : 'N/A');
      console.log('Profile Address:', p ? p.address : 'N/A');
    }
    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
