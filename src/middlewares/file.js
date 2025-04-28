const multer = require('multer');
const path = require('path');

const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const maxFileSize = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase().substring(1);
        const time = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        let prefix;
        switch (file.fieldname) {
            case 'frontPhoto':
                prefix = 'front';
                break;
            case 'leftPhoto':
                prefix = 'left';
                break;
            case 'rightPhoto':
                prefix = 'right';
                break;
            default:
                prefix = 'photo';
        }
        
        const filename = `${prefix}_${time}_${randomStr}.${extension}`;
        
        if (!req.uploadedFiles) req.uploadedFiles = {};
        req.uploadedFiles[file.fieldname] = filename;
        
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase().substring(1);
    const isValidExt = validExtensions.includes(extension);
    const isValidMime = file.mimetype.startsWith('image/');
    
    if (isValidExt && isValidMime) {
        cb(null, true);
    } else {
        cb(new Error(`Solo se permiten imágenes con extensiones: ${validExtensions.join(', ')}`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: maxFileSize
    }
});

// Middleware para múltiples archivos
const uploadUserPhotos = upload.fields([
    { name: 'frontPhoto', maxCount: 1 },
    { name: 'leftPhoto', maxCount: 1 },
    { name: 'rightPhoto', maxCount: 1 }
]);

const uploadSingleFile = upload.single("UserPhoto");

module.exports = {
    upload,
    uploadUserPhotos,
    uploadSingleFile
};