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
 * @openapi
 * /posts:
 *   get:
 *     summary: Fetch posts list for a brand with filters (v1)
 *     tags: [Workspace Posts]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *         description: Brand ID owning the posts
 *       - in: query
 *         name: socialAccountId
 *         required: false
 *         schema: { type: string }
 *         description: Filter posts specifically for a social account ID
 *       - in: query
 *         name: platform
 *         required: false
 *         schema: { type: string }
 *         description: Filter posts by social platform (e.g. YOUTUBE, FACEBOOK)
 *       - in: query
 *         name: status
 *         required: false
 *         schema: { type: string }
 *         description: Filter posts by status (DRAFT, SCHEDULED, PUBLISHED, etc.)
 *     responses:
 *       200:
 *         description: Posts list fetched
 */
router.get('/', checkBrandAccess, postController.getPosts);

/**
 * GET /api/posts/platform-limits
 * Fetch all limits configuration from DB
 */
router.get('/platform-limits', postController.getPlatformLimits);

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
const { uploadForPost } = upload;
const resolvePostUploadLimits = require('../../middlewares/resolve-post-upload-limits.middleware');

/**
 * POST /api/posts/upload
 * Upload video/image file (MUST be before /:id to avoid Express matching 'upload' as an id)
 * ?targetPlatforms=FACEBOOK,TIKTOK (optional) narrows the post-upload size/
 * format check in postController.uploadVideo to those platforms' real
 * PlatformLimit rows — see resolvePostUploadLimits for details.
 */
router.post('/upload', checkPermission(PERMISSION_KEYS.CREATE_POSTS), resolvePostUploadLimits, (req, res, next) => {
  uploadForPost.single('video')(req, res, (err) => {
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
 * DELETE /api/posts/upload
 * Delete uploaded asset file (Rollback uncommitted upload)
 */
router.delete('/upload', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.deleteUploadedFile);

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
 * PUT /api/posts/:id
 * Update an existing post
 */
router.put('/:id', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.updatePost);

module.exports = router;
