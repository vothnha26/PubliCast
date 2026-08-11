jest.mock('../../src/services/workspace/approval-workflow.service', () => ({
  getPotentialReviewers: jest.fn(),
  getWorkflowsByBrand: jest.fn(),
  createWorkflowRequest: jest.fn(),
  reviewWorkflowRequest: jest.fn(),
  reassignWorkflow: jest.fn()
}));

const approvalWorkflowService = require('../../src/services/workspace/approval-workflow.service');
const approvalWorkflowController = require('../../src/controllers/workspace/approval-workflow.controller');
const approvalWorkflowControllerV2 = require('../../src/controllers/workspace/approval-workflow.controller.v2');

function mockReqRes({ params = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { params, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

function callHandler(handler, req, res, next) {
  return new Promise((resolve, reject) => {
    Promise.resolve(handler(req, res, next || ((err) => (err ? reject(err) : resolve())))).then(resolve, reject);
  });
}

describe('ApprovalWorkflowController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getWorkflows: v1 returns {status, data}; v2 drops status, keeps data', async () => {
    approvalWorkflowService.getWorkflowsByBrand.mockResolvedValue([{ id: 'w1' }]);

    const v1 = mockReqRes({ params: { brandId: 'b1' } });
    await callHandler(approvalWorkflowController.getWorkflows, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ status: 'success', data: [{ id: 'w1' }] });

    const v2 = mockReqRes({ params: { brandId: 'b1' } });
    await callHandler(approvalWorkflowControllerV2.getWorkflows, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: [{ id: 'w1' }] });
  });

  it('createWorkflow: both return 201 with the created workflow', async () => {
    approvalWorkflowService.createWorkflowRequest.mockResolvedValue({ id: 'w1' });

    const v2 = mockReqRes({ params: { brandId: 'b1' }, body: { postId: 'p1', reviewerIds: ['u2'] } });
    await callHandler(approvalWorkflowControllerV2.createWorkflow, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(201);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Gửi yêu cầu phê duyệt bài đăng thành công.', data: { id: 'w1' } });
  });

  it('reviewWorkflow: message embeds the action, on both versions', async () => {
    approvalWorkflowService.reviewWorkflowRequest.mockResolvedValue({ id: 'w1', status: 'APPROVED' });

    const v1 = mockReqRes({ params: { id: 'w1' }, body: { action: 'approve' } });
    await callHandler(approvalWorkflowController.reviewWorkflow, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ status: 'success', message: 'Đã phản hồi yêu cầu phê duyệt thành công: approve', data: { id: 'w1', status: 'APPROVED' } });

    const v2 = mockReqRes({ params: { id: 'w1' }, body: { action: 'approve' } });
    await callHandler(approvalWorkflowControllerV2.reviewWorkflow, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Đã phản hồi yêu cầu phê duyệt thành công: approve', data: { id: 'w1', status: 'APPROVED' } });
  });

  it('reassignWorkflow: both forward the same args to the service', async () => {
    approvalWorkflowService.reassignWorkflow.mockResolvedValue({ id: 'w1' });

    const v2 = mockReqRes({ params: { brandId: 'b1', id: 'w1' }, body: { reviewerIds: ['u3'], policy: 'ANY' } });
    await callHandler(approvalWorkflowControllerV2.reassignWorkflow, v2.req, v2.res);
    expect(approvalWorkflowService.reassignWorkflow).toHaveBeenCalledWith('w1', 'b1', 'user-1', ['u3'], 'ANY');
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Đã cập nhật người duyệt thành công.', data: { id: 'w1' } });
  });
});
