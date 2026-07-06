const mongoose = require('mongoose');
const User = require('./src/models/User.model');
const RoiPayout = require('./src/models/RoiPayout.model');

require('dotenv').config();

const createPayout = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);

    // Find the client with ID 6a4799a0f93a0ecff329b102
    const clientId = '6a4799a0f93a0ecff329b102';
    const client = await User.findById(clientId);

    if (!client) {
      console.error(`Error: Client user with ID ${clientId} not found. Please verify your client ID.`);
      process.exit(1);
    }

    // Create a pending ROI payout
    const payout = await RoiPayout.create({
      clientId: client._id,
      payoutMonth: 'July 2026',
      amount: 15000, // 15,000 INR
      status: 'PENDING',
    });

    console.log('\n========================================================================');
    console.log('SUCCESS: Pending ROI Payout Created!');
    console.log(`Client: ${client.name} (${client.email})`);
    console.log(`Payout Month: ${payout.payoutMonth}`);
    console.log(`Amount: INR ${payout.amount}`);
    console.log(`Payout ID: ${payout._id}`);
    console.log('========================================================================\n');

    console.log('Copy the following details to test in Postman:\n');
    console.log('Method: PATCH');
    console.log(`URL: http://localhost:5000/api/super-admin/clients/${client._id}/roi/${payout._id}/pay`);
    console.log('Headers:');
    console.log('  Authorization: Bearer <SUPER_ADMIN_TOKEN>');
    console.log('Body: {}');

    process.exit(0);
  } catch (error) {
    console.error('Error creating payout:', error);
    process.exit(1);
  }
};

createPayout();
