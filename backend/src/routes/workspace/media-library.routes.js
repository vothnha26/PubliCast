const express = require('express');
const mediaLibraryController = require('../../controllers/workspace/media-library.controller');
const mediaUploadController = require('../../controllers/workspace/media-upload.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { PERMISSION_KEYS } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);

/**
 * GET /api/media/signature
 * Just signs generic Cloudinary upload params — not brand-scoped, no guard needed.
 */
router.get('/signature', mediaUploadController.generateSignature);

/**
 * GET /api/media
 */
router.get('/', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaLibraryController.getMediaFiles);

/**
 * POST /api/media/upload
 * checkPermission MUST come after the multer wrapper — brandId lives in the
 * multipart body, which multer hasn't parsed until its own next() runs.
 */
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error("[Multer Upload Error]", err);
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaLibraryController.uploadMedia);

/**
 * POST /api/media/save-direct
 */
router.post('/save-direct', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaLibraryController.saveDirectMedia);

/**
 * DELETE /api/media/:id
 */
router.delete('/:id', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaLibraryController.deleteMedia);

/**
 * PATCH /api/media/:id/rename
 */
router.patch('/:id/rename', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaLibraryController.renameMedia);

module.exports = router;
