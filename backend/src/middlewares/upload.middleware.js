const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { storage } = require('../config/cloudinary');

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'video/mp4', 
    'video/quicktime', 
    'video/x-matroska',
    'video/matroska',
    'video/webm',
    'video/x-msvideo', // AVI
    'video/mpeg',
    'application/x-matroska',
    'application/pdf',
    'application/octet-stream' // Last resort for some binary files, use with caution or extension check
  ];
  
  const isAllowedMime = allowedTypes.includes(file.mimetype);
  
  // Extra check for octet-stream: only allow if extension is in our whitelist
  let isAllowedExtra = false;
  if (file.mimetype === 'application/octet-stream') {
    const allowedExts = ['.mkv', '.mp4', '.mov', '.avi', '.webm', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
    isAllowedExtra = allowedExts.some(ext => file.originalname.toLowerCase().endsWith(ext));
  }

  if (isAllowedMime || isAllowedExtra) {
    cb(null, true);
  } else {
    console.error(`[Upload Error] Rejected mimetype: "${file.mimetype}" for file: "${file.originalname}"`);
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, MP4, MOV, MKV, AVI, WEBM and PDF are allowed.'), false);
  }
};

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let brandId = req.body?.brandId || req.query?.brandId || 'unassigned';
    // Sanitize brandId to prevent Path Traversal
    brandId = brandId.replace(/[^a-zA-Z0-9-_]/g, '');
    if (!brandId) brandId = 'unassigned';
    
    const uploadDir = path.join(process.cwd(), 'uploads', 'media', brandId);
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 60);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`);
  }
});

const selectedStorage = process.env.UPLOAD_STORAGE === 'local' ? localStorage : storage;

const upload = multer({
  storage: selectedStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

module.exports = upload;
