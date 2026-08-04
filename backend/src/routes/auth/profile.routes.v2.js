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
router.get('/', verifyAuth, authorizeAny, profileControllerV2.getUserProfile);
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

/**
 * @openapi
 * /v2/profile/notification-settings:
 *   get:
 *     summary: Get current user's per-category notification preferences
 *     tags: [Profile V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Notification preference toggles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/notification-settings', verifyAuth, authorizeAny, profileControllerV2.getNotificationSettings);

/**
 * @openapi
 * /v2/profile/notification-settings:
 *   put:
 *     summary: Update notification preference toggles
 *     description: >
 *       Accepts a partial object — only boolean fields matching a known
 *       preference key are applied, everything else is ignored.
 *       `notificationsEnabled` is the master "unsubscribe from all" switch;
 *       when false it overrides every other category without needing to
 *       clear them individually.
 *     tags: [Profile V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notificationsEnabled: { type: boolean }
 *               notifyPostFailure: { type: boolean }
 *               notifyPublishSuccess: { type: boolean }
 *               notifyChannelDisconnect: { type: boolean }
 *               notifyCollaboration: { type: boolean }
 *               notifyBilling: { type: boolean }
 *               notifyEmptyQueue: { type: boolean }
 *               notifyDailyRecap: { type: boolean }
 *               notifyWeeklyReport: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated notification preferences
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.put('/notification-settings', verifyAuth, profileControllerV2.updateNotificationSettings);

module.exports = router;
