const express = require('express');
const approvalWorkflowController = require('../../controllers/workspace/approval-workflow.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');

const router = express.Router({ mergeParams: true });

router.use(verifyAuth);

router.get('/reviewers', approvalWorkflowController.getPotentialReviewers);
router.get('/', approvalWorkflowController.getWorkflows);
router.post('/', approvalWorkflowController.createWorkflow);
router.post('/:id/review', approvalWorkflowController.reviewWorkflow);
router.put('/:id/reassign', approvalWorkflowController.reassignWorkflow);

module.exports = router;
