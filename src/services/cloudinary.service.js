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

module.exports = {
  deleteFromCloudinary,
};
