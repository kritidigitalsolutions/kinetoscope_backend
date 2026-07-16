require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const { getAgentDashboard } = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/controllers/agent/agent-dashboard.controller');

connectDB()
  .then(async () => {
    // Amit Kumar agent User ID
    const agentId = '6a548cb649563c5451dd73cb';

    const mockReq = {
      user: {
        id: agentId,
        name: 'Amit Kumar',
        role: 'agent'
      }
    };

    const mockRes = {
      statusCode: 200,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: function (payload) {
        console.log('\n--- AGENT DASHBOARD RESPONSE ---');
        console.log('Success:', payload.success);
        console.log('DataKeys:', Object.keys(payload.data));
        console.log('Welcome:', payload.data.welcome);
        console.log('Stats:', payload.data.stats);
        console.log('Milestones Count:', payload.data.milestones?.length);
        console.log('Top Clients Count:', payload.data.topClients?.length);
        console.log('Recent Activity Count:', payload.data.recentActivity?.length);
        
        mongoose.disconnect();
        process.exit(0);
      }
    };

    await getAgentDashboard(mockReq, mockRes, (err) => {
      console.error('Error:', err);
      mongoose.disconnect();
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
