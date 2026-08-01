const express = require('express');
const postControllerV2 = require('../../controllers/workspace/post.controller.v2');
const postController = require('../../controllers/workspace/post.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const checkBrandAccess = require('../../middlewares/brand-access.middleware');
const resolvePostUploadLimits = require('../../middlewares/resolve-post-upload-limits.middleware');
const { uploadForPost } = require('../../middlewares/upload.middleware');
const { PERMISSION_KEYS } = require('../../utils/constants');

const router = express.Router();

router.use(verifyAuth);

/**
 * @openapi
 * tags:
 *   name: Workspace Posts V2
 *   description: Post Creation, Scheduling & Editing management (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/posts:
 *   get:
 *     summary: Fetch posts list for a brand with filters
 *     tags: [Workspace Posts V2]
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
 *       200:
 *         description: Posts list fetched
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *   post:
 *     summary: Create a new post (Supports per-platform networkOverrides)
 *     tags: [Workspace Posts V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId, caption]
 *             properties:
 *               brandId: { type: string }
 *               caption: { type: string }
 *               networkOverrides: { type: object }
 *     responses:
 *       201:
 *         description: Post created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/', checkBrandAccess, postController.getPosts);
router.post('/', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postControllerV2.createPostV2);

/**
 * @openapi
 * /v2/posts/platform-limits:
 *   get:
 *     summary: Get social platform limits configurations
 *     tags: [Workspace Posts V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Platform limits list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/platform-limits', postControllerV2.getPlatformLimitsV2);

/**
 * @openapi
 * /v2/posts/upload:
 *   post:
 *     summary: Upload media asset for post
 *     tags: [Workspace Posts V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               video:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Media uploaded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
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

/**
 * @openapi
 * /v2/posts/bulk-approve:
 *   post:
 *     summary: Bulk approve pending posts
 *     tags: [Workspace Posts V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postIds]
 *             properties:
 *               postIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Posts approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/bulk-approve', checkPermission(PERMISSION_KEYS.APPROVE_POSTS), postController.bulkApprove);

/**
 * @openapi
 * /v2/posts/bulk:
 *   delete:
 *     summary: Bulk delete posts
 *     tags: [Workspace Posts V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [postIds]
 *             properties:
 *               postIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200:
 *         description: Posts deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.delete('/bulk', checkPermission(PERMISSION_KEYS.DELETE_POSTS), postController.bulkDelete);
router.post('/bulk-restore', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.bulkRestore);
router.delete('/trash', checkPermission(PERMISSION_KEYS.DELETE_POSTS), postController.emptyTrash);

/**
 * @openapi
 * /v2/posts/trim:
 *   post:
 *     summary: Trim video file asset
 *     tags: [Workspace Posts V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Video trim task started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/trim', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.trimVideo);
router.get('/trim/:taskId/status', postController.getTrimStatus);
router.post('/transcribe', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.transcribeVideo);

/**
 * @openapi
 * /v2/posts/music:
 *   get:
 *     summary: Get available background music tracks
 *     tags: [Workspace Posts V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Music tracks list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/music', postController.getMusicTracks);

/**
 * @openapi
 * /v2/posts/{id}:
 *   put:
 *     summary: Update an existing post by ID
 *     tags: [Workspace Posts V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Post updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.put('/:id', checkPermission(PERMISSION_KEYS.CREATE_POSTS), postController.updatePost);

module.exports = router;
