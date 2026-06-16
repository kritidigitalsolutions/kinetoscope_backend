const admin = require('firebase-admin');

let firebaseApp = null;
let storageBucket = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Handle newline characters in private key
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (projectId && clientEmail && privateKey && !projectId.includes('placeholder')) {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    storageBucket = admin.storage().bucket();
    console.log('Firebase Admin SDK initialized successfully.');
  } else {
    console.warn('Firebase Admin SDK: Using placeholders or missing credentials. Firebase service will run in mock/dry-run mode.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error.message);
}

module.exports = {
  admin,
  firebaseApp,
  storageBucket,
};
