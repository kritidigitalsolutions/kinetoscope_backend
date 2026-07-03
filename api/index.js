require('dotenv').config();
const app = require('../src/app');
const connectDB = require('../src/config/db');

// Ensure database connection is active before executing handlers in serverless environment
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed in serverless middleware:', error.message);
    res.status(500).json({
      success: false,
      message: 'Database connection failed. Please try again.'
    });
  }
});

// Export the Express app as the serverless function handler
module.exports = app;
