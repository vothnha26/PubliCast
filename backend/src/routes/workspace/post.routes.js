const express = require('express');
const postController = require('../../controllers/workspace/post.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');

const router = express.Router();

// Universal auth
router.use(verifyAuth);

/**
 * GET /api/posts
 * Fetch all posts with filters
 */
router.get('/', postController.getPosts);

/**
 * GET /api/posts/platform-limits
 * Fetch all limits configuration from DB
 */
router.get('/platform-limits', postController.getPlatformLimits);

/**
 * POST /api/posts
 * Create a new post
 */
router.post('/', checkPermission('CREATE_POSTS'), postController.createPost);

/**
 * POST /api/posts/bulk-approve
 * Bulk approve posts
 */
router.post('/bulk-approve', checkPermission('APPROVE_POSTS'), postController.bulkApprove);

/**
 * DELETE /api/posts/bulk
 * Bulk delete posts
 */
router.delete('/bulk', checkPermission('DELETE_POSTS'), postController.bulkDelete);

/**
 * POST /api/posts/bulk-restore
 * Bulk restore posts from trash
 */
router.post('/bulk-restore', checkPermission('CREATE_POSTS'), postController.bulkRestore);

/**
 * DELETE /api/posts/trash
 * Permanently delete all posts in trash
 */
router.delete('/trash', checkPermission('DELETE_POSTS'), postController.emptyTrash);

const upload = require('../../middlewares/upload.middleware');

/**
 * POST /api/posts/upload
 * Upload video/image file (MUST be before /:id to avoid Express matching 'upload' as an id)
 */
router.post('/upload', checkPermission('CREATE_POSTS'), (req, res, next) => {
  upload.single('video')(req, res, (err) => {
    if (err) {
      console.error("[Multer Upload Error]", err);
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, postController.uploadVideo);

/**
 * GET /api/posts/:id/analytics
 * Get historical metrics for a post
 */
router.get('/:id/analytics', postController.getPostAnalytics);

/**
 * PUT /api/posts/:id
 * Update an existing post
 */
router.put('/:id', checkPermission('CREATE_POSTS'), postController.updatePost);

module.exports = router;
