const multer = require("multer");
const path = require("path");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// --- Cloudinary Direct Upload (existing, kept for backward compatibility) ---
const cloudinaryStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "kinetoscope",
        resource_type: "auto",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf", "docx"],
    },
});

const upload = multer({
    storage: cloudinaryStorage,
});

// --- Memory Storage (serverless safe, fast parallel upload pattern) ---
const memoryUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpg|jpeg|png|webp|pdf|docx/;
        const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimeType = allowedTypes.test(file.mimetype) ||
            file.mimetype === 'application/pdf' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype.startsWith('image/');
        if (extName || mimeType) {
            cb(null, true);
        } else {
            cb(new Error('Only jpg, jpeg, png, webp, pdf, and docx files are allowed.'));
        }
    },
});

module.exports = { upload, memoryUpload };
