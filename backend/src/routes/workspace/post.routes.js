const express = require('express');
const postController = require('../../controllers/workspace/post.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const checkBrandAccess = require('../../middlewares/brand-access.middleware');
const { PERMISSION_KEYS } = require('../../utils/constants');

const router = express.Router();

// Universal auth
router.use(verifyAuth);

/**
 * GET /api/posts
 * Fetch all posts with filters
 */
router.get('/', checkBrandAccess, postController.getPosts);

/**
 * GET /api/posts/platform-limits
 * Fetch all limits configuration from DB
 */
router.get('/platform-limits', postController.getPlatformLimits);

/**
 * GET /api/posts/best-times
 * Fetch best times to post analytics based on historical published posts engagement
 */
router.get('/best-times', checkBrandAccess, postController.getBestTimes);

/**
 * POST /api/posts
 * Create a new post
 */
router.post('/', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.createPost);

/**
 * POST /api/posts/bulk-approve
 * Bulk approve posts
 */
router.post('/bulk-approve', checkPermission(PERMISSION_KEYS.APPROVE_POSTS), postController.bulkApprove);

/**
 * DELETE /api/posts/bulk
 * Bulk delete posts
 */
router.delete('/bulk', checkPermission(PERMISSION_KEYS.DELETE_POSTS), postController.bulkDelete);

/**
 * POST /api/posts/bulk-restore
 * Bulk restore posts from trash
 */
router.post('/bulk-restore', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.bulkRestore);

/**
 * DELETE /api/posts/trash
 * Permanently delete all posts in trash
 */
router.delete('/trash', checkPermission(PERMISSION_KEYS.DELETE_POSTS), postController.emptyTrash);

const upload = require('../../middlewares/upload.middleware');

/**
 * POST /api/posts/upload
 * Upload video/image file (MUST be before /:id to avoid Express matching 'upload' as an id)
 */
router.post('/upload', checkPermission(PERMISSION_KEYS.CREATE_POSTS), (req, res, next) => {
  upload.single('video')(req, res, (err) => {
    if (err) {
      if (err.message === 'Request aborted' || req.aborted) {
        console.warn('[Multer Upload] Client aborted request during upload.');
        return;
      }
      console.error("[Multer Upload Error]", err);
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, postController.uploadVideo);

/**
 * POST /api/posts/trim
 */
router.post('/trim', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.trimVideo);

/**
 * GET /api/posts/trim/:taskId/status
 */
router.get('/trim/:taskId/status', postController.getTrimStatus);

/**
 * POST /api/posts/:id/retry-failed
 */
router.post('/:id/retry-failed', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.retryFailedPlatforms);

/**
 * POST /api/posts/transcribe
 */
router.post('/transcribe', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.transcribeVideo);

/**
 * GET /api/posts/music
 */
router.get('/music', postController.getMusicTracks);

/**
 * GET /api/posts/:id/analytics
 * Get historical metrics for a post
 */
router.get('/:id/analytics', checkBrandAccess, postController.getPostAnalytics);

/**
 * PUT /api/posts/:id
 * Update an existing post
 */
router.put('/:id', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.updatePost);

module.exports = router;
