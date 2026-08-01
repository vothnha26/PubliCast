const express = require('express');
const brandController = require('../../controllers/workspace/brand.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Brands
 *   description: Workspace/brand management
 */

/**
 * @openapi
 * /brands:
 *   get:
 *     summary: List brands owned by or shared with the current user
 *     tags: [Brands]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of brands the user can access
 */
router.get('/', verifyAuth, brandController.getBrands);

/**
 * @openapi
 * /brands:
 *   post:
 *     summary: Create a new brand (subject to plan's maxBrands limit)
 *     tags: [Brands]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               timezone: { type: string }
 *               defaultLanguage: { type: string }
 *     responses:
 *       201:
 *         description: Brand created
 *       403:
 *         description: Brand limit reached for current plan
 */
router.post('/', verifyAuth, brandController.createBrand);

/**
 * @openapi
 * /brands/{id}:
 *   put:
 *     summary: Update brand settings (owner only)
 *     description: >
 *       If `name` is provided and differs from the signup-time default
 *       ("New Workspace"), and the brand hasn't completed onboarding yet,
 *       `onboardingCompleted` is automatically set to true server-side —
 *       this cannot be set directly by the client.
 *     tags: [Brands]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               timezone: { type: string }
 *               defaultLanguage: { type: string }
 *               logoUrl: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Updated brand, including onboardingCompleted flag
 *       403:
 *         description: Only the brand owner can update settings
 *       404:
 *         description: Brand not found
 */
router.put('/:id', verifyAuth, brandController.updateBrand);

/**
 * @openapi
 * /brands/{id}:
 *   delete:
 *     summary: Delete a brand (owner only, must keep at least one)
 *     tags: [Brands]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Brand deleted
 *       400:
 *         description: Cannot delete the only remaining brand
 *       403:
 *         description: Only the brand owner can delete this brand
 */
router.delete('/:id', verifyAuth, brandController.deleteBrand);

module.exports = router;
