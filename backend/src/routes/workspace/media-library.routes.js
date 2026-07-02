const express = require('express');
const mediaLibraryController = require('../../controllers/workspace/media-library.controller');
const mediaUploadController = require('../../controllers/workspace/media-upload.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const upload = require('../../middlewares/upload.middleware');

const router = express.Router();

router.use(verifyAuth);

/**
 * GET /api/media/signature
 */
router.get('/signature', mediaUploadController.generateSignature);

/**
 * GET /api/media
 */
router.get('/', mediaLibraryController.getMediaFiles);

/**
 * POST /api/media/upload
 */
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error("[Multer Upload Error]", err);
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, mediaLibraryController.uploadMedia);

/**
 * POST /api/media/save-direct
 */
router.post('/save-direct', mediaLibraryController.saveDirectMedia);

/**
 * DELETE /api/media/:id
 */
router.delete('/:id', mediaLibraryController.deleteMedia);

/**
 * PATCH /api/media/:id/rename
 */
router.patch('/:id/rename', mediaLibraryController.renameMedia);

module.exports = router;
