require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const { getAgentClients } = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/controllers/agent/agent-dashboard.controller');
const User = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/User.model');

connectDB()
  .then(async () => {
    // Find an agent user to test with
    const agentUser = await User.findOne({ role: 'agent' });
    if (!agentUser) {
      console.warn('No agent user found in database to run tests.');
      mongoose.disconnect();
      process.exit(0);
    }

    console.log(`Running getAgentClients test for agent: ${agentUser.name} (${agentUser.email})`);

    // Mock request
    const mockReq = {
      user: {
        id: agentUser._id.toString(),
        role: 'agent',
        clientCode: agentUser.clientCode
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
        console.log('\n--- AGENT CLIENTS LIST RESPONSE ---');
        console.log('HTTP Status:', this.statusCode);
        console.log('Success:', payload.success);
        console.log('Count:', payload.count);
        console.log('Clients (first item):', payload.data.clients[0]);
        
        mongoose.disconnect();
        process.exit(0);
      }
    };

    await getAgentClients(mockReq, mockRes, (err) => {
      console.error('Controller next middleware error:', err);
      mongoose.disconnect();
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
