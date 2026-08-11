const approvalWorkflowService = require('../../services/workspace/approval-workflow.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

/**
 * v1's `status: 'success'` field is dropped — confirmed unused by the
 * frontend (frontend/src/services/workflow.service.js only reads the
 * apiV2-unwrapped `data`).
 */
class ApprovalWorkflowControllerV2 {
  getPotentialReviewers = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const userId = req.user.id;
    const reviewers = await approvalWorkflowService.getPotentialReviewers(brandId, userId);
    v2Success(res, reviewers);
  });

  getWorkflows = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const userId = req.user.id;
    const workflows = await approvalWorkflowService.getWorkflowsByBrand(brandId, userId);
    v2Success(res, workflows);
  });

  createWorkflow = asyncHandler(async (req, res) => {
    const { brandId } = req.params;
    const { postId, reviewerIds, policy, requesterNote } = req.body;
    const requesterId = req.user.id;

    const workflow = await approvalWorkflowService.createWorkflowRequest(
      postId,
      requesterId,
      brandId,
      reviewerIds,
      policy,
      requesterNote
    );

    v2Success(res, workflow, 'Gửi yêu cầu phê duyệt bài đăng thành công.', 201);
  });

  reviewWorkflow = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { action, comment } = req.body;
    const reviewerId = req.user.id;

    const workflow = await approvalWorkflowService.reviewWorkflowRequest(
      id,
      reviewerId,
      action,
      comment
    );

    v2Success(res, workflow, `Đã phản hồi yêu cầu phê duyệt thành công: ${action}`);
  });

  reassignWorkflow = asyncHandler(async (req, res) => {
    const { brandId, id } = req.params;
    const { reviewerIds, policy } = req.body;
    const requesterId = req.user.id;

    const workflow = await approvalWorkflowService.reassignWorkflow(
      id,
      brandId,
      requesterId,
      reviewerIds,
      policy
    );

    v2Success(res, workflow, 'Đã cập nhật người duyệt thành công.');
  });
}

module.exports = new ApprovalWorkflowControllerV2();
