const approvalWorkflowService = require('../../services/workspace/approval-workflow.service');

class ApprovalWorkflowController {
  async getPotentialReviewers(req, res, next) {
    try {
      const { brandId } = req.params;
      const userId = req.user.id;
      const reviewers = await approvalWorkflowService.getPotentialReviewers(brandId, userId);
      res.status(200).json({
        status: 'success',
        data: reviewers
      });
    } catch (error) {
      next(error);
    }
  }

  async getWorkflows(req, res, next) {
    try {
      const { brandId } = req.params;
      const userId = req.user.id;
      const workflows = await approvalWorkflowService.getWorkflowsByBrand(brandId, userId);
      res.status(200).json({
        status: 'success',
        data: workflows
      });
    } catch (error) {
      next(error);
    }
  }

  async createWorkflow(req, res, next) {
    try {
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

      res.status(201).json({
        status: 'success',
        message: 'Gửi yêu cầu phê duyệt bài đăng thành công.',
        data: workflow
      });
    } catch (error) {
      next(error);
    }
  }

  async reviewWorkflow(req, res, next) {
    try {
      const { id } = req.params;
      const { action, comment } = req.body;
      const reviewerId = req.user.id;

      const workflow = await approvalWorkflowService.reviewWorkflowRequest(
        id,
        reviewerId,
        action,
        comment
      );

      res.status(200).json({
        status: 'success',
        message: `Đã phản hồi yêu cầu phê duyệt thành công: ${action}`,
        data: workflow
      });
    } catch (error) {
      next(error);
    }
  }

  async reassignWorkflow(req, res, next) {
    try {
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

      res.status(200).json({
        status: 'success',
        message: 'Đã cập nhật người duyệt thành công.',
        data: workflow
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ApprovalWorkflowController();
