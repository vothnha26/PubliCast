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
 * @openapi
 * tags:
 *   name: Workspace Media V2
 *   description: Media Library & Asset Management endpoints (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/media/signature:
 *   get:
 *     summary: Generate Cloudinary upload signature
 *     tags: [Workspace Media V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Upload signature generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/signature', mediaUploadController.generateSignature);

/**
 * @openapi
 * /v2/media:
 *   get:
 *     summary: Get media files for a brand
 *     tags: [Workspace Media V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Media files list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaLibraryController.getMediaFiles);

/**
 * @openapi
 * /v2/media/upload:
 *   post:
 *     summary: Upload media asset to library
 *     tags: [Workspace Media V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
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
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.message === 'Request aborted' || req.aborted) {
        console.warn('[Multer Upload] Client aborted request during upload.');
        return;
      }
      return res.status(400).json({ message: err.message || 'File upload failed' });
    }
    next();
  });
}, checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaLibraryController.uploadMedia);

/**
 * Middleware dynamically selecting permission check for /save-direct:
 * If saveToLibrary === false, requires CREATE_POSTS permission.
 * Otherwise (default/true), requires MANAGE_MEDIA permission.
 */
const checkSaveDirectPermission = (req, res, next) => {
  const saveToLibrary = req.body?.saveToLibrary;
  const permissionKey = (saveToLibrary === false || saveToLibrary === 'false')
    ? PERMISSION_KEYS.CREATE_POSTS
    : PERMISSION_KEYS.MANAGE_MEDIA;
  return checkPermission(permissionKey)(req, res, next);
};

router.post('/save-direct', checkSaveDirectPermission, mediaLibraryController.saveDirectMedia);

/**
 * @openapi
 * /v2/media/{id}:
 *   delete:
 *     summary: Delete media file by ID
 *     tags: [Workspace Media V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Media deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.delete('/:id', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaLibraryController.deleteMedia);
router.patch('/:id/rename', checkPermission(PERMISSION_KEYS.MANAGE_MEDIA), mediaLibraryController.renameMedia);

module.exports = router;
