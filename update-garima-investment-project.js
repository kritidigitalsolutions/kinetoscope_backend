require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');
const Project = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/Project.model');
const Investment = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/Investment.model');
const User = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/models/User.model');

connectDB()
  .then(async () => {
    // 1. Find Syndication Deal project
    const project = await Project.findOne({ name: /Syndication/i });
    console.log('Syndication Project found:', project ? { _id: project._id, name: project.name } : 'None');

    // 2. Find Garima user
    const garima = await User.findOne({ name: /Garima/i });
    console.log('Garima User found:', garima ? { _id: garima._id, name: garima.name } : 'None');

    if (project && garima) {
      // 3. Update Garima's investments
      const res = await Investment.updateMany(
        { clientId: garima._id },
        { $set: { projectId: project._id } }
      );
      console.log('Investments update result:', res);

      // Verify
      const updatedInvestments = await Investment.find({ clientId: garima._id });
      console.log('Updated Investments:', updatedInvestments.map(inv => ({ _id: inv._id, projectId: inv.projectId })));
    }

    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
