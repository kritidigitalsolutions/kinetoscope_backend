require('dotenv').config({ path: 'c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/.env' });
const connectDB = require('c:/Users/Rishika Chaudhary/Desktop/kinetoscope-backend/src/config/db');
const mongoose = require('mongoose');

connectDB()
  .then(async () => {
    const id = '6a161e2aca6673a6be3ef57e';
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Searching for ID: ${id} in ${collections.length} collections...`);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      const col = mongoose.connection.db.collection(colName);
      
      // Search by _id
      let match = null;
      try {
        match = await col.findOne({ _id: new mongoose.Types.ObjectId(id) });
      } catch (e) {
        // Not a valid ObjectId or other query error
      }
      
      if (!match) {
        // Try string search
        match = await col.findOne({ _id: id });
      }

      if (!match) {
        // Search in all fields
        match = await col.findOne({
          $or: [
            { userId: id },
            { userId: new mongoose.Types.ObjectId(id) },
            { clientId: id },
            { clientId: new mongoose.Types.ObjectId(id) },
          ]
        });
      }

      if (match) {
        console.log(`MATCH FOUND in collection [${colName}]:`, match);
      }
    }

    console.log('Search complete.');
    mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
