require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const Project = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/Project.model');
const { createProject, updateProject } = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/controllers/super-admin/project.controller');

connectDB()
  .then(async () => {
    // Fetch a user ID for createdBy
    const User = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/User.model');
    const admin = await User.findOne({ role: 'super-admin' });
    const creatorId = admin ? admin._id.toString() : new mongoose.Types.ObjectId().toString();

    console.log('Testing createProject with totalDividendPool...');

    // 1. Mock request for create
    const mockCreateReq = {
      body: {
        name: 'Syndication Alpha Test',
        segment: 'Trading & Syndication',
        status: 'Active',
        portfolioValue: '₹5.00 CR',
        monthlyRoi: '2.5%',
        totalDividendPool: 2500000 // ₹25.00 L
      },
      user: {
        id: creatorId
      }
    };

    let createdProject = null;
    const mockCreateRes = {
      statusCode: 200,
      status: function (code) {
        this.statusCode = code;
        return this;
      },
      json: async function (payload) {
        console.log('Create Response:', payload.success, payload.message);
        console.log('Created totalDividendPool:', payload.data.totalDividendPool);
        createdProject = payload.data;

        // Run Update test inside response callback
        console.log('\nTesting updateProject with totalDividendPool...');
        const mockUpdateReq = {
          params: {
            id: createdProject._id.toString()
          },
          body: {
            totalDividendPool: 4000000 // Increase to ₹40.00 L
          },
          user: {
            id: creatorId
          }
        };

        const mockUpdateRes = {
          statusCode: 200,
          status: function (code) {
            this.statusCode = code;
            return this;
          },
          json: async function (updatePayload) {
            console.log('Update Response:', updatePayload.success, updatePayload.message);
            console.log('Updated totalDividendPool:', updatePayload.data.totalDividendPool);

            // Clean up test project from DB
            await Project.findByIdAndDelete(createdProject._id);
            console.log('Cleanup completed successfully.');
            
            mongoose.disconnect();
            process.exit(0);
          }
        };

        await updateProject(mockUpdateReq, mockUpdateRes, (err) => {
          console.error('Update Error:', err);
          mongoose.disconnect();
          process.exit(1);
        });
      }
    };

    await createProject(mockCreateReq, mockCreateRes, (err) => {
      console.error('Create Error:', err);
      mongoose.disconnect();
      process.exit(1);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
