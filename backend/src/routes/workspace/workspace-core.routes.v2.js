const express = require('express');
const brandController = require('../../controllers/workspace/brand.controller.v2');
const teamController = require('../../controllers/workspace/team.controller.v2');
const roleController = require('../../controllers/workspace/role.controller.v2');
const permissionController = require('../../controllers/workspace/permission.controller.v2');
const approvalWorkflowController = require('../../controllers/workspace/approval-workflow.controller.v2');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireBrandMember } = require('../../middlewares/permission.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const { authorizeAdmin } = require('../../middlewares/authorization.middleware');
const { PERMISSION_KEYS } = require('../../utils/constants');

const router = express.Router();

// Public routes (used during invitation acceptance) — must be registered
// before router.use(verifyAuth) below, same as team.routes.js v1.
router.get('/team/invitations/validate', teamController.validateInvitation);
router.post('/team/invitations/accept', teamController.acceptInvitation);

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
router.get('/team', requireBrandMember, teamController.getTeamMembers);
router.post('/team/invite', teamController.inviteMember);
router.put('/team/:id/role', teamController.updateMemberRole);
router.post('/team/:id/resend-invite', teamController.resendInvitation);
router.delete('/team/:id', teamController.removeMember);

// ── Permissions V2 ──
router.get('/permissions', permissionController.getPermissions);
router.post('/permissions', authorizeAdmin, permissionController.createPermission);
router.delete('/permissions/:key', authorizeAdmin, permissionController.deletePermission);

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
router.get('/brands/:brandId/roles', roleController.getRoles);
router.post('/brands/:brandId/roles', checkPermission(PERMISSION_KEYS.MANAGE_ROLES), roleController.createRole);
router.put('/brands/:brandId/roles/:id', checkPermission(PERMISSION_KEYS.MANAGE_ROLES), roleController.updateRole);
router.delete('/brands/:brandId/roles/:id', checkPermission(PERMISSION_KEYS.MANAGE_ROLES), roleController.deleteRole);

// ── Approval Workflows V2 ──
/**
 * @openapi
 * /v2/workspace/brands/{brandId}/workflows/reviewers:
 *   get:
 *     summary: Get potential reviewers for a brand's approval workflows
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Potential reviewers list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/brands/:brandId/workflows/reviewers', approvalWorkflowController.getPotentialReviewers);

/**
 * @openapi
 * /v2/workspace/brands/{brandId}/workflows:
 *   get:
 *     summary: Get approval workflows for brand
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Approval workflows list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 *   post:
 *     summary: Create an approval workflow for brand
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Approval workflow created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.get('/brands/:brandId/workflows', approvalWorkflowController.getWorkflows);
router.post('/brands/:brandId/workflows', approvalWorkflowController.createWorkflow);

/**
 * @openapi
 * /v2/workspace/brands/{brandId}/workflows/{id}/review:
 *   post:
 *     summary: Submit a review decision for a workflow
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Workflow review submitted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.post('/brands/:brandId/workflows/:id/review', approvalWorkflowController.reviewWorkflow);

/**
 * @openapi
 * /v2/workspace/brands/{brandId}/workflows/{id}/reassign:
 *   put:
 *     summary: Reassign reviewers for a workflow
 *     tags: [Workspace Core V2]
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: brandId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Workflow reassigned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/V2EnvelopeResponse'
 */
router.put('/brands/:brandId/workflows/:id/reassign', approvalWorkflowController.reassignWorkflow);

module.exports = router;
