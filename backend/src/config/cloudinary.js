const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const resolveUploadParams = (file) => {
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
    folder,
    resource_type,
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp', 'mp4', 'mov', 'mkv', 'avi', 'webm', 'pdf'],
    public_id: Date.now() + '-' + Math.round(Math.random() * 1E9),
  };
};

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => resolveUploadParams(file),
});

/**
 * multer-storage-cloudinary's default engine only forwards path/size/filename
 * to req.file, discarding the rest of Cloudinary's upload response — so
 * duration/format/width/height (needed for real, non-client-reported
 * per-platform validation, see /api/posts/upload) are unavailable through it.
 * This custom multer.StorageEngine keeps the full response.
 */
class CloudinaryStorageWithMetadata {
  _handleFile(req, file, callback) {
    const uploadOptions = resolveUploadParams(file);
    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
      if (err) return callback(err);
      callback(null, {
        path: result.secure_url,
        size: result.bytes,
        filename: result.public_id,
        duration: result.duration || null,
        format: result.format || null,
        width: result.width || null,
        height: result.height || null,
        resourceType: result.resource_type,
      });
    });
    file.stream.pipe(uploadStream);
  }

  _removeFile(req, file, callback) {
    cloudinary.uploader.destroy(file.filename, { invalidate: true, resource_type: file.resourceType || 'image' }, callback);
  }
}

const storageWithMetadata = new CloudinaryStorageWithMetadata();

module.exports = {
  cloudinary,
  storage,
  storageWithMetadata
};
