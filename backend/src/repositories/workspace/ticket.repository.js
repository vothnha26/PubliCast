const prisma = require('../../config/prisma');

class TicketRepository {
  async findTickets(brandId, queryParams = {}) {
    const { status } = queryParams;
    return await prisma.supportTicket.findMany({
      where: {
        brandId,
        status: status || undefined
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findTicketById(id) {
    return await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                role: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });
  }

  async createTicket(brandId, userId, data) {
    return await prisma.supportTicket.create({
      data: {
        brandId,
        userId,
        subject: data.subject,
        priority: data.priority || 'MEDIUM',
        status: 'OPEN'
      }
    });
  }

  async findActiveTicket(brandId) {
    return await prisma.supportTicket.findFirst({
      where: {
        brandId,
        status: 'OPEN'
      },
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        }
      }
    });
  }

  async updateTicketStatus(id, status) {
    return await prisma.supportTicket.update({
      where: { id },
      data: { status }
    });
  }

  async assignTicket(id, agentId) {
    return await prisma.supportTicket.update({
      where: { id },
      data: { assignedAgentId: agentId },
      include: {
        assignedAgent: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            role: true
          }
        }
      }
    });
  }
}

module.exports = new TicketRepository();
