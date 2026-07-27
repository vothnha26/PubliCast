const ticketRepository = require('../../repositories/workspace/ticket.repository');
const authorizationFacade = require('../auth/authorization.facade');

class TicketService {
  /**
   * Load a ticket by id and enforce the caller belongs to its brand.
   * Centralizes the check for the id-only routes (getTicketDetails,
   * updateTicketStatus, assignTicket) which have no brandId in the request
   * to check at the route level (see issue #47).
   */
  async _getAuthorizedTicket(ticketId, userId) {
    const ticket = await ticketRepository.findTicketById(ticketId);
    if (!ticket) {
      const error = new Error('Ticket not found');
      error.status = 404;
      throw error;
    }

    const hasAccess = await authorizationFacade.checkBrandAccess(userId, ticket.brandId);
    if (!hasAccess) {
      const error = new Error('Bạn không có quyền truy cập ticket này.');
      error.status = 403;
      throw error;
    }

    return ticket;
  }
  async getTickets(brandId, queryParams, user) {
    const isStaffOrAdmin = user && (user.role === 'STAFF' || user.role === 'ADMIN');
    if (!brandId && !isStaffOrAdmin) {
      const error = new Error('Brand ID is required');
      error.status = 400;
      throw error;
    }
    return await ticketRepository.findTickets(brandId || undefined, queryParams);
  }

  async getTicketDetails(ticketId, userId) {
    return this._getAuthorizedTicket(ticketId, userId);
  }

  async createTicket(brandId, userId, data) {
    if (!data.subject) {
      const error = new Error('Subject is required');
      error.status = 400;
      throw error;
    }
    return await ticketRepository.createTicket(brandId, userId, data);
  }

  async updateTicketStatus(ticketId, status, userId) {
    await this._getAuthorizedTicket(ticketId, userId);
    const updated = await ticketRepository.updateTicketStatus(ticketId, status);
    
    // Broadcast status update via SocketManager to real-time notification
    try {
      const socketManager = require('../workspace/socket/socket.manager');
      const { SOCKET_EVENTS, ROOM_PREFIXES } = require('../../utils/socket-constants');
      socketManager.emitToRoom(`${ROOM_PREFIXES.TICKET}${ticketId}`, SOCKET_EVENTS.TICKET_STATUS_UPDATED, {
        ticketId,
        status
      });
    } catch (wsErr) {
      console.error('⚠️ [TicketService] Real-time status update broadcast failed:', wsErr.message);
    }

    return updated;
  }

  async assignTicket(ticketId, agentId) {
    await this._getAuthorizedTicket(ticketId, agentId);
    const updated = await ticketRepository.assignTicket(ticketId, agentId);

    // Broadcast ticket assigned event via Socket
    try {
      const socketManager = require('../workspace/socket/socket.manager');
      const { SOCKET_EVENTS, ROOM_PREFIXES } = require('../../utils/socket-constants');
      socketManager.emitToRoom(`${ROOM_PREFIXES.TICKET}${ticketId}`, SOCKET_EVENTS.TICKET_ASSIGNED, {
        ticketId,
        assignedAgent: updated.assignedAgent
      });
    } catch (wsErr) {
      console.error('⚠️ [TicketService] Real-time assignment broadcast failed:', wsErr.message);
    }

    return updated;
  }

  async getActiveTicket(brandId) {
    if (!brandId) {
      const error = new Error('Brand ID is required');
      error.status = 400;
      throw error;
    }
    return await ticketRepository.findActiveTicket(brandId);
  }
}

module.exports = new TicketService();
