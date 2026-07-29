const express = require('express');
const postControllerV2 = require('../../controllers/workspace/post.controller.v2');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const resolvePostUploadLimits = require('../../middlewares/resolve-post-upload-limits.middleware');
const { uploadForPost } = require('../../middlewares/upload.middleware');
const { PERMISSION_KEYS } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);

/**
 * POST /api/v2/posts
 * Same as v1 POST /api/posts, plus optional req.body.networkOverrides
 * (per-platform caption/media customization — see PostNetworkOverride).
 */
router.post('/', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postControllerV2.createPostV2);

/**
 * GET /api/v2/posts/platform-limits
 */
router.get('/platform-limits', postControllerV2.getPlatformLimitsV2);

/**
 * POST /api/v2/posts/upload
 * ?targetPlatforms=FACEBOOK,TIKTOK (optional) narrows the post-upload
 * size/format check to those platforms' real PlatformLimit rows — see
 * resolvePostUploadLimits and postService.processUploadedFile.
 */
router.post('/upload', checkPermission(PERMISSION_KEYS.CREATE_POSTS), resolvePostUploadLimits, (req, res, next) => {
  uploadForPost.single('video')(req, res, (err) => {
    if (err) {
      if (err.message === 'Request aborted' || req.aborted) {
        console.warn('[Multer Upload] Client aborted request during upload.');
        return;
      }
      console.error('[Multer Upload Error]', err);
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, postControllerV2.uploadVideoV2);

module.exports = router;
