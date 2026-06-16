const { storageBucket } = require('../config/firebase');

/**
 * Upload a local file to Firebase Storage bucket
 * @param {string} localFilePath - Path to local file
 * @param {string} destinationPath - Path inside the bucket
 * @returns {Promise<string>} Public URL of the uploaded resource
 */
const uploadToFirebase = async (localFilePath, destinationPath) => {
  if (!storageBucket) {
    console.log(`[Firebase Mock] Mock uploading ${localFilePath} to ${destinationPath}`);
    return `https://storage.googleapis.com/mock-bucket/${destinationPath}`;
  }

  const response = await storageBucket.upload(localFilePath, {
    destination: destinationPath,
    public: true,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });

  // Return public URL link
  return response[0].publicUrl();
};

/**
 * Delete a file from Firebase Storage bucket
 * @param {string} fileUrl - Full URL or path of the target resource
 * @returns {Promise<boolean>} Deletion success result
 */
const deleteFromFirebase = async (fileUrl) => {
  if (!storageBucket) {
    console.log(`[Firebase Mock] Mock deleting file ${fileUrl}`);
    return true;
  }

  // Parse path out of public URL if required, then delete
  try {
    const filename = fileUrl.split('/').pop();
    const file = storageBucket.file(filename);
    await file.delete();
    return true;
  } catch (error) {
    console.error(`Firebase deletion failed: ${error.message}`);
    return false;
  }
};

module.exports = {
  uploadToFirebase,
  deleteFromFirebase,
};
