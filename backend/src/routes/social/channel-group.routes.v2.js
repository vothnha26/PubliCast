const express = require('express');
const channelGroupController = require('../../controllers/social/channel-group.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireBrandMember } = require('../../middlewares/permission.middleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Channel Groups V2
 *   description: User-organizable grouping of social channels within a brand
 */

router.use(verifyAuth);

/**
 * @openapi
 * /v2/social/channel-groups:
 *   get:
 *     summary: List channel groups for a brand
 *     tags: [Channel Groups V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of channel groups with their member channels
 */
router.get('/', requireBrandMember, channelGroupController.list);

/**
 * @openapi
 * /v2/social/channel-groups:
 *   post:
 *     summary: Create a channel group
 *     tags: [Channel Groups V2]
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId, name]
 *             properties:
 *               brandId: { type: string }
 *               name: { type: string }
 *               color: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Channel group created
 *       409:
 *         description: A group with this name already exists for the brand
 */
router.post('/', requireBrandMember, channelGroupController.create);

/**
 * @openapi
 * /v2/social/channel-groups/{id}:
 *   put:
 *     summary: Rename/recolor a channel group, or replace its member channels
 *     tags: [Channel Groups V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [brandId]
 *             properties:
 *               brandId: { type: string }
 *               name: { type: string }
 *               color: { type: string, nullable: true }
 *               socialAccountIds:
 *                 type: array
 *                 items: { type: string }
 *                 description: If provided, replaces the group's full member list.
 *     responses:
 *       200:
 *         description: Updated channel group
 *       404:
 *         description: Channel group not found for this brand
 */
router.put('/:id', requireBrandMember, channelGroupController.update);

/**
 * @openapi
 * /v2/social/channel-groups/{id}:
 *   delete:
 *     summary: Delete a channel group
 *     tags: [Channel Groups V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Channel group deleted
 *       404:
 *         description: Channel group not found for this brand
 */
router.delete('/:id', requireBrandMember, channelGroupController.delete);

module.exports = router;
