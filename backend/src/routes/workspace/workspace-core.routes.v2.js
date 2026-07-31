const express = require('express');
const brandController = require('../../controllers/workspace/brand.controller');
const teamController = require('../../controllers/workspace/team.controller');
const roleController = require('../../controllers/workspace/role.controller');
const aiController = require('../../controllers/workspace/ai.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();
router.use(verifyAuth);

/**
 * @openapi
 * tags:
 *   name: Workspace Core V2
 *   description: Brands, Team Members, Roles & AI Services management (v2 Envelope API)
 */

// ── Brands V2 ──
/**
 * @openapi
 * /v2/workspace/brands:
 *   get:
 *     summary: List brands for current user
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Brands list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *   post:
 *     summary: Create a new brand workspace
 *     tags: [Workspace Core V2]
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
 *     responses:
 *       201:
 *         description: Brand created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/brands', brandController.getBrands);
router.post('/brands', brandController.createBrand);

/**
 * @openapi
 * /v2/workspace/brands/{id}:
 *   put:
 *     summary: Update brand details
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Brand updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *   delete:
 *     summary: Delete brand workspace
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Brand deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.put('/brands/:id', brandController.updateBrand);
router.delete('/brands/:id', brandController.deleteBrand);

// ── Teams V2 ──
/**
 * @openapi
 * /v2/workspace/teams:
 *   get:
 *     summary: Get team members for brand
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Team members list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/teams', teamController.getTeamMembers);

// ── Roles V2 ──
/**
 * @openapi
 * /v2/workspace/roles:
 *   get:
 *     summary: Get custom workspace roles for brand
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Roles list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/roles', roleController.getRoles);

// ── AI Assistant V2 ──
/**
 * @openapi
 * /v2/workspace/ai/generate:
 *   post:
 *     summary: Generate post content caption using AI
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt: { type: string }
 *     responses:
 *       200:
 *         description: AI caption generated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/ai/generate', aiController.generateContent);

module.exports = router;
