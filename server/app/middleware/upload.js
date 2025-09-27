import multer from 'multer';
import { config } from '../../config/environment.js';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
    if (config.upload.allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF and text files are allowed.'), false);
    }
};

// Create multer instance
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: config.upload.maxFileSize,
    },
});

export default upload;
