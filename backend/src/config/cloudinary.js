const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // Determine folder and resource_type based on file mimetype
    let folder = 'publicast/others';
    let resource_type = 'auto';

    const isVideoMime = file.mimetype.startsWith('video/') || 
                       file.mimetype === 'application/x-matroska' || 
                       file.mimetype === 'application/octet-stream' && file.originalname.toLowerCase().endsWith('.mkv');

    if (file.mimetype.startsWith('image/')) {
      folder = 'publicast/images';
      resource_type = 'image';
    } else if (isVideoMime) {
      folder = 'publicast/videos';
      resource_type = 'video';
    } else if (file.mimetype === 'application/pdf') {
      folder = 'publicast/docs';
      resource_type = 'raw';
    }

    return {
      folder: folder,
      resource_type: resource_type,
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'mp4', 'mov', 'mkv', 'avi', 'webm', 'pdf'],
      public_id: Date.now() + '-' + Math.round(Math.random() * 1E9),
    };
  },
});

module.exports = {
  cloudinary,
  storage
};
