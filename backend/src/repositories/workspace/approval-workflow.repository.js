const prisma = require('../../config/prisma');

class ApprovalWorkflowRepository {
  async findManyByBrand(brandId) {
    const where = Array.isArray(brandId) ? { brandId: { in: brandId } } : { brandId };
    return prisma.approvalWorkflow.findMany({
      where,
      include: {
        post: true,
        brand: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        },
        requester: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        reviewers: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });
  }

  async findPendingByReviewer(userId) {
    // We will fetch workflows where status is PENDING
    // and the reviewer is listed inside selectedReviewers JSON array
    // (We will parse/filter it in service, or fetch all pending for the brand if the user has role check)
    return prisma.approvalWorkflow.findMany({
      where: {
        status: 'PENDING'
      },
      include: {
        post: true,
        requester: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        reviewers: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        }
      },
      orderBy: { requestedAt: 'desc' }
    });
  }

  async findById(id) {
    return prisma.approvalWorkflow.findUnique({
      where: { id },
      include: {
        post: true,
        requester: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        reviewers: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });
  }

  async findByPostId(postId) {
    return prisma.approvalWorkflow.findFirst({
      where: { postId },
      orderBy: { requestedAt: 'desc' },
      include: {
        post: true,
        requester: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        reviewers: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });
  }

  async create(data) {
    return prisma.approvalWorkflow.create({
      data,
      include: {
        post: true,
        requester: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        reviewers: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });
  }

  async update(id, data, client = prisma) {
    return client.approvalWorkflow.update({
      where: { id },
      data,
      include: {
        post: true,
        requester: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        reviewers: {
          include: {
            reviewer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });
  }
}

module.exports = new ApprovalWorkflowRepository();
