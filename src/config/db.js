const mongoose = require('mongoose');

// Use global cache for the database connection promise to handle Vercel serverless environments
let cachedConnection = global.mongooseConnection;

if (!cachedConnection) {
  cachedConnection = global.mongooseConnection = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cachedConnection.conn) {
    console.log('MongoDB: Using existing cached database connection.');
    return cachedConnection.conn;
  }

  if (!cachedConnection.promise) {
    console.log('MongoDB: No cached connection found. Establishing new connection...');
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000, // Fail fast if connection cannot be established
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kfpl';
    
    cachedConnection.promise = mongoose.connect(mongoUri, opts).then((mongooseInstance) => {
      console.log(`MongoDB Connected: ${mongooseInstance.connection.host}`);
      return mongooseInstance;
    }).catch((error) => {
      console.error(`Database connection error: ${error.message}`);
      cachedConnection.promise = null; // Clear cached promise on failure
      if (!process.env.VERCEL) {
        process.exit(1);
      }
      throw error;
    });
  }

  try {
    cachedConnection.conn = await cachedConnection.promise;
  } catch (e) {
    cachedConnection.promise = null;
    throw e;
  }

  return cachedConnection.conn;
};

module.exports = connectDB;
