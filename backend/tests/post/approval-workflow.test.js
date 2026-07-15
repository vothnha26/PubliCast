const request = require('supertest');

// Mock otplib to prevent ESModule parsing errors on @scure/base in Jest
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn(),
    verify: jest.fn()
  }
}));

let mockUser = { id: 'operator-id', email: 'operator@publicast.com' };

// Mock Auth Middleware
jest.mock('../../src/middlewares/auth.middleware', () => ({
  verifyAuth: (req, res, next) => {
    req.user = mockUser;
    next();
  }
}));

// Mock Authorization Facade
jest.mock('../../src/services/auth/authorization.facade', () => {
  const hasPerm = jest.fn().mockImplementation((userId, brandId, permission) => {
    if (permission === 'APPROVE_POSTS') {
      const allowedReviewerIds = [
        'reviewer-id',
        'reviewer-1-id',
        'reviewer-2-id',
        'some-other-reviewer-id'
      ];
      return Promise.resolve(allowedReviewerIds.includes(userId));
    }
    return Promise.resolve(true);
  });
  return {
    checkBrandAccess: jest.fn().mockResolvedValue(true),
    hasPermission: hasPerm,
    checkPermission: hasPerm
  };
});

// Mock Prisma
jest.mock('../../src/config/prisma', () => {
  const mockPost = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn().mockResolvedValue(0)
  };
  const mockApprovalWorkflow = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  };
  const mockBrand = {
    findUnique: jest.fn(),
    findFirst: jest.fn().mockResolvedValue({
      id: 'brand-123',
      ownerId: 'owner-id',
      subscription: {
        status: 'ACTIVE',
        plan: {
          name: 'PRO',
          planLimit: {
            maxPostsPerMonth: 100
          }
        }
      }
    }),
    findMany: jest.fn().mockResolvedValue([
      {
        id: 'brand-123',
        ownerId: 'owner-id',
        subscription: {
          status: 'ACTIVE',
          plan: {
            name: 'PRO',
            priceAmount: 100,
            planLimit: {
              maxPostsPerMonth: 100
            }
          }
        }
      }
    ])
  };
  const mockTeam = {
    findMany: jest.fn()
  };
  const mockWorkflowReviewer = {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn()
  };

  const mockPrisma = {
    post: mockPost,
    approvalWorkflow: mockApprovalWorkflow,
    brand: mockBrand,
    team: mockTeam,
    workflowReviewer: mockWorkflowReviewer,
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn().mockImplementation((callback) => callback(mockPrisma))
  };

  return mockPrisma;
});

// Mock BullMQ Queue calls
jest.mock('../../src/queues/publish.queue', () => ({
  publishQueue: { client: { on: jest.fn() } },
  upsertPublishJob: jest.fn().mockResolvedValue(true),
  removePublishJob: jest.fn().mockResolvedValue(true)
}));

// Mock Outbox Event Repository — approval-workflow.service.js ghi outbox trong transaction
// thay vì gọi upsertPublishJob/eventEmitter.emit trực tiếp.
jest.mock('../../src/repositories/core/outbox-event.repository', () => ({
  create: jest.fn().mockResolvedValue({})
}));

// Mock Queue Dashboard
jest.mock('../../src/queues/dashboard', () => ({
  getRouter: () => (req, res, next) => next()
}));

const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const authorizationFacade = require('../../src/services/auth/authorization.facade');

describe('Post Content Approval Workflow APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'operator-id', email: 'operator@publicast.com' };
  });

  describe('POST /api/posts - Interception by lack of APPROVE_POSTS permission', () => {
    it('should intercept directly scheduling a post and create PENDING_APPROVAL status with workflow request', async () => {
      // Mock post creation data
      const postPayload = {
        title: 'New Campaign Post',
        caption: 'Save the date!',
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        brandId: 'brand-123',
        reviewerIds: ['reviewer-id'],
        requesterNote: 'Hãy duyệt bài viết này cho mình nhé!'
      };

      // Mock post repository responses
      const mockPostObj = {
        id: 'post-1',
        title: 'New Campaign Post',
        caption: 'Save the date!',
        status: 'PENDING_APPROVAL',
        brandId: 'brand-123',
        createdByUserId: 'operator-id',
        scheduledAt: new Date(postPayload.scheduledAt),
        createdAt: new Date(),
        creator: { id: 'operator-id', name: 'Operator User' }
      };
      prisma.post.create.mockResolvedValue(mockPostObj);
      prisma.post.findUnique.mockResolvedValue(mockPostObj);

      prisma.approvalWorkflow.create.mockResolvedValue({
        id: 'wf-1',
        postId: 'post-1',
        brandId: 'brand-123',
        requesterId: 'operator-id',
        status: 'PENDING'
      });

      const res = await request(app)
        .post('/api/posts')
        .send(postPayload);

      if (res.status !== 201) {
        console.error('ERROR BODY:', res.body);
      }
      expect(res.status).toBe(201);

      expect(res.body.data.status).toBe('pending_approval');
      expect(prisma.post.create).toHaveBeenCalled();
      expect(prisma.approvalWorkflow.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          postId: 'post-1',
          status: 'PENDING',
          reviewers: { create: [{ reviewerId: 'reviewer-id', status: 'PENDING' }] }
        })
      }));
      // createWorkflowRequest bọc việc tạo workflow + update Post status trong
      // 1 transaction, tránh trạng thái nửa vời nếu 1 trong 2 bước lỗi giữa chừng.
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should allow directly creating a post with PENDING_APPROVAL status and create a workflow request', async () => {
      const postPayload = {
        title: 'Explicit Review Post',
        caption: 'Review me please!',
        status: 'PENDING_APPROVAL',
        brandId: 'brand-123',
        reviewerIds: ['reviewer-id'],
        requesterNote: 'Hãy duyệt bài viết này cho mình nhé!'
      };

      const mockPostObj = {
        id: 'post-2',
        title: 'Explicit Review Post',
        caption: 'Review me please!',
        status: 'PENDING_APPROVAL',
        brandId: 'brand-123',
        createdByUserId: 'operator-id',
        createdAt: new Date(),
        creator: { id: 'operator-id', name: 'Operator User' }
      };
      prisma.post.create.mockResolvedValue(mockPostObj);
      prisma.post.findUnique.mockResolvedValue(mockPostObj);

      prisma.approvalWorkflow.create.mockResolvedValue({
        id: 'wf-2',
        postId: 'post-2',
        brandId: 'brand-123',
        requesterId: 'operator-id',
        status: 'PENDING'
      });

      const res = await request(app)
        .post('/api/posts')
        .send(postPayload)
        .expect(201);

      expect(res.body.data.status).toBe('pending_approval');
      expect(prisma.post.create).toHaveBeenCalled();
      expect(prisma.approvalWorkflow.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          postId: 'post-2',
          status: 'PENDING',
          reviewers: { create: [{ reviewerId: 'reviewer-id', status: 'PENDING' }] }
        })
      }));
    });
  });

  describe('POST /api/brands/:brandId/workflows/:id/review', () => {
    it('should allow user with APPROVE_POSTS permission to approve request', async () => {
      mockUser = { id: 'reviewer-id', email: 'reviewer@publicast.com' };

      const mockWorkflow = {
        id: 'wf-1',
        postId: 'post-1',
        brandId: 'brand-123',
        requesterId: 'operator-id',
        status: 'PENDING',
        approvalPolicy: 'AT_LEAST_ONE',
        post: {
          id: 'post-1',
          status: 'PENDING_APPROVAL',
          scheduledAt: new Date(Date.now() + 86400000)
        }
      };

      prisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.approvalWorkflow.update.mockResolvedValue({
        ...mockWorkflow,
        status: 'APPROVED'
      });
      prisma.workflowReviewer.findFirst.mockResolvedValue(null);
      prisma.workflowReviewer.findMany.mockResolvedValue([
        { reviewerId: 'reviewer-id', status: 'APPROVED' }
      ]);
      prisma.post.update.mockResolvedValue({
        id: 'post-1',
        status: 'SCHEDULED'
      });

      const res = await request(app)
        .post('/api/brands/brand-123/workflows/wf-1/review')
        .send({ action: 'APPROVED', comment: 'Looks great, scheduling!' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('APPROVED');
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'SCHEDULED' }
      });
    });

    it('should reject review action if user lacks APPROVE_POSTS permission and is not listed as reviewer', async () => {
      mockUser = { id: 'unauthorized-id', email: 'unauth@publicast.com' };

      const mockWorkflow = {
        id: 'wf-1',
        postId: 'post-1',
        brandId: 'brand-123',
        requesterId: 'operator-id',
        status: 'PENDING'
      };

      prisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow);

      const res = await request(app)
        .post('/api/brands/brand-123/workflows/wf-1/review')
        .send({ action: 'APPROVED', comment: 'Stealing approval power!' })
        .expect(403);

      expect(res.body.message).toContain('không có quyền phê duyệt');
    });

    it('should reject review action if user is listed as reviewer but no longer has APPROVE_POSTS permission', async () => {
      mockUser = { id: 'revoked-reviewer-id', email: 'revoked@publicast.com' };

      const mockWorkflow = {
        id: 'wf-1',
        postId: 'post-1',
        brandId: 'brand-123',
        requesterId: 'operator-id',
        status: 'PENDING',
        post: {
          id: 'post-1',
          status: 'PENDING_APPROVAL'
        }
      };

      prisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow);

      const res = await request(app)
        .post('/api/brands/brand-123/workflows/wf-1/review')
        .send({ action: 'APPROVED', comment: 'Trying to approve after being revoked' })
        .expect(403);

      expect(res.body.message).toContain('không có quyền phê duyệt');
      expect(authorizationFacade.hasPermission).toHaveBeenCalledWith(
        'revoked-reviewer-id',
        'brand-123',
        'APPROVE_POSTS'
      );
      expect(prisma.approvalWorkflow.update).not.toHaveBeenCalled();
    });

    it('should allow user with APPROVE_POSTS permission to approve even when not listed as a selected reviewer', async () => {
      mockUser = { id: 'reviewer-id', email: 'reviewer@publicast.com' };

      const mockWorkflow = {
        id: 'wf-1',
        postId: 'post-1',
        brandId: 'brand-123',
        requesterId: 'operator-id',
        status: 'PENDING',
        approvalPolicy: 'AT_LEAST_ONE',
        post: {
          id: 'post-1',
          status: 'PENDING_APPROVAL',
          scheduledAt: new Date(Date.now() + 86400000)
        }
      };

      prisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.approvalWorkflow.update.mockResolvedValue({
        ...mockWorkflow,
        status: 'APPROVED'
      });
      prisma.workflowReviewer.findFirst.mockResolvedValue(null);
      prisma.workflowReviewer.findMany.mockResolvedValue([
        { reviewerId: 'reviewer-id', status: 'APPROVED' }
      ]);
      prisma.post.update.mockResolvedValue({
        id: 'post-1',
        status: 'SCHEDULED'
      });

      const res = await request(app)
        .post('/api/brands/brand-123/workflows/wf-1/review')
        .send({ action: 'APPROVED', comment: 'Admin override approval' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('APPROVED');
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'SCHEDULED' }
      });
    });

    it('should move post back to DRAFT when review action is REVISION_NEEDED', async () => {
      mockUser = { id: 'reviewer-id', email: 'reviewer@publicast.com' };

      const mockWorkflow = {
        id: 'wf-1',
        postId: 'post-1',
        brandId: 'brand-123',
        requesterId: 'operator-id',
        status: 'PENDING',
        post: {
          id: 'post-1',
          status: 'PENDING_APPROVAL'
        }
      };

      prisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.approvalWorkflow.update.mockResolvedValue({
        ...mockWorkflow,
        status: 'REVISION_NEEDED'
      });
      prisma.post.update.mockResolvedValue({
        id: 'post-1',
        status: 'DRAFT'
      });

      const res = await request(app)
        .post('/api/brands/brand-123/workflows/wf-1/review')
        .send({ action: 'REVISION_NEEDED', comment: 'Please fix the typo in the first line.' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'DRAFT' }
      });
    });

    it('should keep workflow and post in PENDING status when policy is ALL and not all reviewers have approved yet', async () => {
      mockUser = { id: 'reviewer-1-id', email: 'reviewer1@publicast.com' };

      const mockWorkflow = {
        id: 'wf-1',
        postId: 'post-1',
        brandId: 'brand-123',
        requesterId: 'operator-id',
        status: 'PENDING',
        approvalPolicy: 'ALL',
        post: {
          id: 'post-1',
          status: 'PENDING_APPROVAL',
          scheduledAt: new Date(Date.now() + 86400000)
        }
      };

      prisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.approvalWorkflow.update.mockResolvedValue({
        ...mockWorkflow,
        status: 'PENDING'
      });
      prisma.workflowReviewer.findFirst.mockResolvedValue(null);
      // reviewer-1 approved, but reviewer-2 is still pending
      prisma.workflowReviewer.findMany.mockResolvedValue([
        { reviewerId: 'reviewer-1-id', status: 'APPROVED' },
        { reviewerId: 'reviewer-2-id', status: 'PENDING' }
      ]);
      prisma.post.update.mockResolvedValue({
        id: 'post-1',
        status: 'PENDING_APPROVAL'
      });

      const res = await request(app)
        .post('/api/brands/brand-123/workflows/wf-1/review')
        .send({ action: 'APPROVED', comment: 'Looks good to me' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('PENDING');
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'PENDING_APPROVAL' }
      });
    });

    it('should transition workflow to APPROVED and post to SCHEDULED when policy is ALL and all reviewers have approved', async () => {
      mockUser = { id: 'reviewer-2-id', email: 'reviewer2@publicast.com' };

      const mockWorkflow = {
        id: 'wf-1',
        postId: 'post-1',
        brandId: 'brand-123',
        requesterId: 'operator-id',
        status: 'PENDING',
        approvalPolicy: 'ALL',
        post: {
          id: 'post-1',
          status: 'PENDING_APPROVAL',
          scheduledAt: new Date(Date.now() + 86400000)
        }
      };

      prisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.approvalWorkflow.update.mockResolvedValue({
        ...mockWorkflow,
        status: 'APPROVED'
      });
      prisma.workflowReviewer.findFirst.mockResolvedValue(null);
      // Both reviewers approved
      prisma.workflowReviewer.findMany.mockResolvedValue([
        { reviewerId: 'reviewer-1-id', status: 'APPROVED' },
        { reviewerId: 'reviewer-2-id', status: 'APPROVED' }
      ]);
      prisma.post.update.mockResolvedValue({
        id: 'post-1',
        status: 'SCHEDULED'
      });

      const res = await request(app)
        .post('/api/brands/brand-123/workflows/wf-1/review')
        .send({ action: 'APPROVED', comment: 'Approved by second reviewer' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('APPROVED');
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'SCHEDULED' }
      });
    });
  });

  describe('PUT /api/brands/:brandId/workflows/:id/reassign', () => {
    it('should reject with 400 when reviewerIds is empty', async () => {
      mockUser = { id: 'operator-id', email: 'operator@publicast.com' };

      const res = await request(app)
        .put('/api/brands/brand-123/workflows/wf-1/reassign')
        .send({ reviewerIds: [] })
        .expect(400);

      expect(res.body.message).toContain('Cần chọn ít nhất một người duyệt');
      expect(prisma.approvalWorkflow.findUnique).not.toHaveBeenCalled();
    });

    it('should reject with 400 when policy is not a valid WORKFLOW_POLICY value', async () => {
      mockUser = { id: 'operator-id', email: 'operator@publicast.com' };

      const res = await request(app)
        .put('/api/brands/brand-123/workflows/wf-1/reassign')
        .send({ reviewerIds: ['reviewer-id'], policy: 'INVALID_POLICY' })
        .expect(400);

      expect(res.body.message).toContain('Chính sách phê duyệt không hợp lệ');
      expect(prisma.approvalWorkflow.findUnique).not.toHaveBeenCalled();
    });

    it('should dedupe duplicate reviewerIds before persisting', async () => {
      mockUser = { id: 'operator-id', email: 'operator@publicast.com' };

      const mockWorkflow = {
        id: 'wf-1',
        postId: 'post-1',
        brandId: 'brand-123',
        requesterId: 'operator-id',
        status: 'PENDING'
      };

      prisma.approvalWorkflow.findUnique.mockResolvedValue(mockWorkflow);
      prisma.approvalWorkflow.update.mockResolvedValue(mockWorkflow);

      const res = await request(app)
        .put('/api/brands/brand-123/workflows/wf-1/reassign')
        .send({ reviewerIds: ['reviewer-id', 'reviewer-id', 'reviewer-2-id'] })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(prisma.workflowReviewer.deleteMany).toHaveBeenCalledWith({ where: { workflowId: 'wf-1' } });
      expect(prisma.approvalWorkflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'wf-1' },
          data: expect.objectContaining({
            reviewers: {
              create: [
                { reviewerId: 'reviewer-id', status: 'PENDING' },
                { reviewerId: 'reviewer-2-id', status: 'PENDING' }
              ]
            }
          })
        })
      );
    });
  });

  describe('GET /api/brands/:brandId/workflows/reviewers', () => {
    it('should return the list of potential reviewers for the brand', async () => {
      mockUser = { id: 'operator-id', email: 'operator@publicast.com' };

      const mockBrand = {
        id: 'brand-123',
        ownerId: 'owner-id',
        owner: {
          id: 'owner-id',
          name: 'Brand Owner',
          email: 'owner@publicast.com',
          avatarUrl: null
        }
      };

      const mockMembers = [
        {
          id: 'mem-1',
          userId: 'admin-id',
          role: 'ADMIN',
          status: 'ACTIVE',
          user: {
            id: 'admin-id',
            name: 'Admin User',
            email: 'admin@publicast.com',
            avatarUrl: null
          },
          customRole: null
        },
        {
          id: 'mem-2',
          userId: 'analyst-id',
          role: 'ANALYST',
          status: 'ACTIVE',
          user: {
            id: 'analyst-id',
            name: 'Analyst User',
            email: 'analyst@publicast.com',
            avatarUrl: null
          },
          customRole: null
        }
      ];

      prisma.brand.findUnique.mockResolvedValue(mockBrand);
      prisma.team.findMany.mockResolvedValue(mockMembers);

      const res = await request(app)
        .get('/api/brands/brand-123/workflows/reviewers')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(2); // Owner + Admin
      expect(res.body.data[0].role).toBe('OWNER');
      expect(res.body.data[1].role).toBe('ADMIN');
    });
  });
});
