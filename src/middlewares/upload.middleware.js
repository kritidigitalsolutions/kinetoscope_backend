const multer = require("multer");
const path = require("path");
const fs = require("fs");
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

// --- Local Disk Storage (fast — for background upload pattern) ---
const tempDir = path.join(__dirname, "../../uploads/temp");

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const localStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, tempDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});

const localUpload = multer({
    storage: localStorage,
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

module.exports = { upload, localUpload };
