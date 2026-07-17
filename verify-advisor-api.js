require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const { getClientWealthAdvisor } = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/controllers/client/client-dashboard.controller');
const User = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/User.model');

connectDB()
  .then(async () => {
    // Find a client user to test with
    const clientUser = await User.findOne({ role: 'client' });
    if (!clientUser) {
      console.warn('No client user found in database to run tests.');
      mongoose.disconnect();
      process.exit(0);
    }

    console.log(`Running Advisor API test for client user: ${clientUser.name} (${clientUser.email})`);

    // Mock request
    const mockReq = {
      user: {
        id: clientUser._id.toString(),
        role: 'client',
        clientCode: clientUser.clientCode
      }
    };

    // Mock response
    const mockRes = {
      statusCode: 200,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (payload) {
        console.log('\n--- ADVISOR API RESPONSE ---');
        console.log('HTTP Status:', this.statusCode);
        console.log('Success:', payload.success);
        console.log('Data:', payload.data);
        
        mongoose.disconnect();
        process.exit(0);
      }
    };

    await getClientWealthAdvisor(mockReq, mockRes, (err) => {
      console.error('Controller next middleware error:', err);
      mongoose.disconnect();
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
