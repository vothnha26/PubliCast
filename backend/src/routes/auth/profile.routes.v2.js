const express = require('express');
const profileControllerV2 = require('../../controllers/auth/profile.controller.v2');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const {
  authorizeAdmin,
  authorizeAny,
} = require('../../middlewares/authorization.middleware');
const {
  editProfileValidation,
} = require('../../middlewares/validation.middleware');
const { resetPasswordRateLimiter } = require('../../middlewares/password-reset-rate-limit.middleware');

const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },

  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/**
 * @openapi
 * tags:
 *   name: Profile V2
 *   description: Standardized User Profile Management endpoints (v2 Envelope API)
 */

/**
 * @openapi
 * /v2/profile/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Profile V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Profile data returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/me', verifyAuth, authorizeAny, profileControllerV2.getUserProfile);

/**
 * @openapi
 * /v2/profile/admin:
 *   get:
 *     summary: Get admin profile (Requires ADMIN role)
 *     tags: [Profile V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Admin profile data returned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/admin', verifyAuth, authorizeAdmin, profileControllerV2.getAdminProfile);

/**
 * @openapi
 * /v2/profile/edit:
 *   put:
 *     summary: Edit profile details
 *     tags: [Profile V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: John Doe }
 *               bio: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.put('/edit', verifyAuth, editProfileValidation, profileControllerV2.editProfile);

/**
 * @openapi
 * /v2/profile/avatar:
 *   post:
 *     summary: Upload avatar image
 *     tags: [Profile V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/avatar', verifyAuth, upload.single('avatar'), profileControllerV2.uploadAvatar);

/**
 * @openapi
 * /v2/profile/accounts/{provider}:
 *   delete:
 *     summary: Unlink social auth provider account
 *     tags: [Profile V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Account unlinked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.delete('/accounts/:provider', verifyAuth, profileControllerV2.unlinkAccount);

/**
 * @openapi
 * /v2/profile/change-password:
 *   put:
 *     summary: Change current password
 *     tags: [Profile V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.put('/change-password', verifyAuth, resetPasswordRateLimiter, profileControllerV2.changePassword);

/**
 * @openapi
 * /v2/profile/default-brand:
 *   put:
 *     summary: Set active default brand
 *     tags: [Profile V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId]
 *             properties:
 *               brandId: { type: string }
 *     responses:
 *       200:
 *         description: Default brand updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.put('/default-brand', verifyAuth, profileControllerV2.setDefaultBrand);

module.exports = router;
