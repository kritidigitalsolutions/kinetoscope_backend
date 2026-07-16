require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const { claimReward } = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/controllers/super-admin/performance-reward.controller');
const PerformanceReward = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/PerformanceReward.model');
const RewardClaim = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/RewardClaim.model');

const executeClaim = (agentId, body) => {
  return new Promise((resolve) => {
    const mockReq = {
      user: { id: agentId },
      params: {},
      body
    };

    const mockRes = {
      statusCode: 200,
      status: function (code) { this.statusCode = code; return this; },
      json: function (payload) {
        console.log('\n--- SUCCESS RESPONSE ---');
        console.log('Success:', payload.success);
        console.log('Message:', payload.message);
        console.log('Claim Data:', payload.data ? {
          _id: payload.data._id,
          agentId: payload.data.agentId,
          rewardId: payload.data.rewardId,
          deliveryAddress: payload.data.deliveryAddress,
          contactNumber: payload.data.contactNumber,
          status: payload.data.status
        } : 'None');
        resolve();
      }
    };

    const next = (err) => {
      console.log('\n--- ERROR RESPONSE ---');
      console.log('Error status:', err.statusCode);
      console.log('Error message:', err.message);
      resolve();
    };

    claimReward(mockReq, mockRes, next);
  });
};

connectDB()
  .then(async () => {
    const agentId = '6a548cb649563c5451dd73cb'; // Amit Kumar
    
    // Find an active performance reward
    let reward = await PerformanceReward.findOne({ isActive: true });
    if (!reward) {
      // Create a temporary mock active reward if none exists
      reward = await PerformanceReward.create({
        targetMetricType: 'Clients Count',
        targetThresholdValue: '10 Clients',
        targetMilestoneDescription: 'Mock Reward Description for Claiming',
        rewardDescription: 'Mock Trip to Bali',
        isActive: true,
        createdBy: agentId
      });
    }

    console.log(`Using active reward for test: ${reward.rewardDescription} (${reward._id})`);

    // Clean up any existing claim for this test to ensure success first
    await RewardClaim.deleteMany({ agentId, rewardId: reward._id });

    // Test 1: Successful claim submission (Strictly Body-Based)
    console.log('\nTesting successful reward claim submission (body-based)...');
    await executeClaim(agentId, {
      rewardId: reward._id.toString(),
      deliveryAddress: '48/120 Agra, UP, Pin-282002',
      contactNumber: '+91 94114 04446',
      additionalNote: 'Preferred size: L'
    });

    // Test 2: Duplicate claim submission (should fail)
    console.log('\nTesting duplicate reward claim prevention...');
    await executeClaim(agentId, {
      rewardId: reward._id.toString(),
      deliveryAddress: '48/120 Agra, UP, Pin-282002',
      contactNumber: '+91 94114 04446',
      additionalNote: 'Preferred size: L'
    });

    // Clean up
    if (reward.targetMilestoneDescription === 'Mock Reward Description for Claiming') {
      await PerformanceReward.findByIdAndDelete(reward._id);
    }
    await RewardClaim.deleteMany({ agentId, rewardId: reward._id });

    setTimeout(() => {
      mongoose.disconnect();
      process.exit(0);
    }, 1000);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
