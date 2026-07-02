const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "kinetoscope",
        resource_type: "auto",
        allowed_formats: ["jpg", "jpeg", "png", "webp", "pdf", "docx"],
    },
});

const upload = multer({
    storage,
});

module.exports = upload;
