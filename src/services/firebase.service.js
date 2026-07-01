const fs = require('fs');
const path = require('path');

/**
 * Save a local file to the static uploads directory (bypassing Firebase Storage)
 * @param {string} localFilePath - Current temporary path of the file
 * @param {string} destinationPath - Path inside the bucket (ignored)
 * @returns {Promise<string>} Static local URL of the uploaded resource
 */
const uploadToFirebase = async (localFilePath, destinationPath) => {
  try {
    const ext = path.extname(localFilePath);
    const baseName = path.basename(localFilePath, ext);
    const uniqueName = `${baseName}_permanent${ext}`;
    
    const uploadDir = path.join(__dirname, '../../uploads');
    const destPath = path.join(uploadDir, uniqueName);
    
    // Ensure the uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Copy the local file to its permanent location
    fs.copyFileSync(localFilePath, destPath);
    
    console.log(`[Storage] Saved file locally: ${uniqueName}`);
    return `/uploads/${uniqueName}`;
  } catch (error) {
    console.error(`[Storage] Local copy failed: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a file from the static uploads directory (bypassing Firebase Storage)
 * @param {string} fileUrl - Full URL or path of the target resource
 * @returns {Promise<boolean>} Deletion success result
 */
const deleteFromFirebase = async (fileUrl) => {
  try {
    if (!fileUrl) return true;
    
    // Extract filename from URL
    const filename = path.basename(fileUrl);
    const uploadDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Storage] Deleted local file: ${filename}`);
    }
    return true;
  } catch (error) {
    console.error(`[Storage] Local file deletion failed: ${error.message}`);
    return false;
  }
};

module.exports = {
  uploadToFirebase,
  deleteFromFirebase,
};
