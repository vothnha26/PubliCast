const ticketRepository = require('../../repositories/workspace/ticket.repository');

class TicketService {
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
    const ticket = await ticketRepository.findTicketById(ticketId);
    if (!ticket) {
      const error = new Error('Ticket not found');
      error.status = 404;
      throw error;
    }
    return ticket;
  }

  async createTicket(brandId, userId, data) {
    if (!data.subject) {
      const error = new Error('Subject is required');
      error.status = 400;
      throw error;
    }
    return await ticketRepository.createTicket(brandId, userId, data);
  }

  async updateTicketStatus(ticketId, status) {
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
