const express = require('express');
const teamController = require('../../controllers/workspace/team.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router();

// Public routes (used during invitation acceptance)
router.get('/invitations/validate', teamController.validateInvitation);
router.post('/invitations/accept', teamController.acceptInvitation);

// Authenticated routes
router.use(verifyAuth);
router.get('/', teamController.getTeamMembers);
router.post('/invite', teamController.inviteMember);
router.put('/:id/role', teamController.updateMemberRole);
router.post('/:id/resend-invite', teamController.resendInvitation);
router.delete('/:id', teamController.removeMember);

module.exports = router;
