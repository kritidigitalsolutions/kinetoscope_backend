require('dotenv').config();
const app = require('../src/app');
const connectDB = require('../src/config/db');

// Connect to MongoDB when the serverless function initializes
connectDB();

// Export the Express app as the serverless function handler
module.exports = app;
