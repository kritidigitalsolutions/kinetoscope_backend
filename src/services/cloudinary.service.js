const fs = require('fs');
const cloudinary = require('../config/cloudinary');

/**
 * Delete a file from Cloudinary storage by its URL
 * @param {string} fileUrl - Secure URL of the file stored on Cloudinary
 * @returns {Promise<boolean>} Whether deletion succeeded
 */
const deleteFromCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) return true;

    // Extract public ID from Cloudinary URL
    // Format: http://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg
    const splitUrl = fileUrl.split('/upload/');
    if (splitUrl.length < 2) return false;

    const publicIdWithExt = splitUrl[1].replace(/^v\d+\//, ''); // Remove version if present
    const lastDotIndex = publicIdWithExt.lastIndexOf('.');
    const publicId = lastDotIndex !== -1 ? publicIdWithExt.substring(0, lastDotIndex) : publicIdWithExt;

    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`[Cloudinary] Deleted file ${publicId}:`, result);
    return result.result === 'ok';
  } catch (error) {
    console.error(`[Cloudinary] Deletion failed for ${fileUrl}:`, error.message);
    return false;
  }
};

/**
 * Upload a single local file to Cloudinary and return the secure URL.
 * @param {string} localFilePath - Absolute path to the local temp file
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<string>} Cloudinary secure URL
 */
const uploadToCloudinary = async (localFilePath, folder = 'kinetoscope') => {
  const result = await cloudinary.uploader.upload(localFilePath, {
    folder,
    resource_type: 'auto',
  });
  return result.secure_url;
};

/**
 * Cleanup helper: remove a local temp file if it exists.
 * @param {string} filePath - Path to the temp file
 */
const cleanupTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`[Cleanup] Failed to delete temp file ${filePath}:`, err.message);
    }
  }
};

/**
 * Upload multiple document files to Cloudinary in parallel (background).
 * Updates the given Mongoose model document with the uploaded URLs.
 *
 * @param {Object} params
 * @param {Object} params.files - req.files object from multer (local disk storage)
 * @param {string[]} params.fileFields - Array of field names to process (e.g. ['panDocument', 'aadhaarDocument'])
 * @param {import('mongoose').Model} params.Model - Mongoose Model (e.g. ClientProfile or AgentProfile)
 * @param {Object} params.filter - Query filter to find the document (e.g. { userId: '...' })
 * @param {string} params.entityLabel - Label for logging (e.g. 'Client' or 'Agent')
 */
const processDocumentUploadsInBackground = ({ files, fileFields, Model, filter, entityLabel }) => {
  if (!files) return;

  const uploadPromises = fileFields
    .filter(field => files[field] && files[field].length > 0)
    .map(async (field) => {
      const localPath = files[field][0].path;
      try {
        const url = await uploadToCloudinary(localPath);
        cleanupTempFile(localPath);
        return { field, url };
      } catch (err) {
        console.error(`[${entityLabel} Upload] Failed to upload ${field}:`, err.message);
        cleanupTempFile(localPath);
        return { field, url: null, error: err.message };
      }
    });

  Promise.all(uploadPromises)
    .then(async (results) => {
      const updateFields = {};
      let hasFailure = false;

      results.forEach(({ field, url, error }) => {
        if (url) {
          updateFields[field] = url;
        } else {
          hasFailure = true;
          console.error(`[${entityLabel} Upload] ${field} upload failed: ${error}`);
        }
      });

      // Set document status based on results
      updateFields.documentStatus = hasFailure ? 'upload_failed' : 'uploaded';

      await Model.findOneAndUpdate(filter, { $set: updateFields });
      console.log(`[${entityLabel} Upload] Background upload complete. Status: ${updateFields.documentStatus}`);
    })
    .catch(async (err) => {
      console.error(`[${entityLabel} Upload] Background upload batch failed:`, err.message);
      try {
        await Model.findOneAndUpdate(filter, { $set: { documentStatus: 'upload_failed' } });
      } catch (dbErr) {
        console.error(`[${entityLabel} Upload] Failed to update status after error:`, dbErr.message);
      }
    });
};

module.exports = {
  deleteFromCloudinary,
  uploadToCloudinary,
  cleanupTempFile,
  processDocumentUploadsInBackground,
};
