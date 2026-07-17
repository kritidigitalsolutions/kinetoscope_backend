require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const { getAgentClientById } = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/controllers/agent/agent-dashboard.controller');
const User = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/User.model');

connectDB()
  .then(async () => {
    // Find agent
    const agent = await User.findOne({ role: 'agent' });
    // Find Milind (client)
    const client = await User.findOne({ name: /Milind/i });

    if (!agent || !client) {
      console.error('Agent or client not found.');
      mongoose.disconnect();
      process.exit(1);
    }

    console.log(`Agent: ${agent.name} (${agent._id})`);
    console.log(`Client: ${client.name} (${client._id})`);

    const mockReq = {
      user: {
        id: agent._id.toString(),
        role: 'agent',
        clientCode: agent.clientCode
      },
      params: {
        id: client._id.toString()
      }
    };

    const mockRes = {
      statusCode: 200,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (payload) {
        console.log('\n--- AGENT CLIENT DETAILS API RESPONSE ---');
        console.log('HTTP Status:', this.statusCode);
        console.log('Success:', payload.success);
        console.log('Data:', JSON.stringify(payload.data, null, 2));

        mongoose.disconnect();
        process.exit(0);
      }
    };

    await getAgentClientById(mockReq, mockRes, (err) => {
      console.error('Controller Error:', err);
      mongoose.disconnect();
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
