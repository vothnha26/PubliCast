// Mock dependencies
jest.mock('../../src/repositories/workspace/ticket.repository', () => ({
  findTickets: jest.fn(),
  findTicketById: jest.fn(),
  createTicket: jest.fn(),
  updateTicketStatus: jest.fn(),
  assignTicket: jest.fn(),
  findActiveTicket: jest.fn()
}));

jest.mock('../../src/services/workspace/socket/socket.manager', () => ({
  emitToRoom: jest.fn()
}));

const ticketService = require('../../src/services/workspace/ticket.service');
const ticketRepository = require('../../src/repositories/workspace/ticket.repository');
const socketManager = require('../../src/services/workspace/socket/socket.manager');
const { SOCKET_EVENTS, ROOM_PREFIXES } = require('../../src/utils/socket-constants');

describe('TicketService Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTickets()', () => {
    it('should retrieve tickets successfully if brandId is provided', async () => {
      const brandId = 'brand-123';
      const mockResult = [{ id: 'ticket-1', subject: 'Bug report' }];
      ticketRepository.findTickets.mockResolvedValue(mockResult);

      const result = await ticketService.getTickets(brandId, {}, { role: 'OWNER' });

      expect(result).toEqual(mockResult);
      expect(ticketRepository.findTickets).toHaveBeenCalledWith(brandId, {});
    });

    it('should retrieve tickets successfully if brandId is missing but user is ADMIN', async () => {
      const mockResult = [{ id: 'ticket-1', subject: 'General inquiry' }];
      ticketRepository.findTickets.mockResolvedValue(mockResult);

      const result = await ticketService.getTickets(null, {}, { role: 'ADMIN' });

      expect(result).toEqual(mockResult);
      expect(ticketRepository.findTickets).toHaveBeenCalledWith(undefined, {});
    });

    it('should throw 400 error if brandId is missing and user is not STAFF or ADMIN', async () => {
      await expect(ticketService.getTickets(null, {}, { role: 'OWNER' }))
        .rejects.toThrow('Brand ID is required');

      expect(ticketRepository.findTickets).not.toHaveBeenCalled();
    });
  });

  describe('getTicketDetails()', () => {
    it('should return ticket if it exists', async () => {
      const ticketId = 'ticket-1';
      const mockTicket = { id: ticketId, subject: 'Issue' };
      ticketRepository.findTicketById.mockResolvedValue(mockTicket);

      const result = await ticketService.getTicketDetails(ticketId, 'user-1');

      expect(result).toEqual(mockTicket);
      expect(ticketRepository.findTicketById).toHaveBeenCalledWith(ticketId);
    });

    it('should throw 404 error if ticket is not found', async () => {
      ticketRepository.findTicketById.mockResolvedValue(null);

      await expect(ticketService.getTicketDetails('invalid-id', 'user-1'))
        .rejects.toThrow('Ticket not found');
    });
  });

  describe('createTicket()', () => {
    it('should create ticket if subject is provided', async () => {
      const brandId = 'brand-1';
      const userId = 'user-1';
      const data = { subject: 'Broken page', description: 'Cannot click' };
      const mockResult = { id: 'ticket-1', ...data };

      ticketRepository.createTicket.mockResolvedValue(mockResult);

      const result = await ticketService.createTicket(brandId, userId, data);

      expect(result).toEqual(mockResult);
      expect(ticketRepository.createTicket).toHaveBeenCalledWith(brandId, userId, data);
    });

    it('should throw 400 if subject is missing', async () => {
      await expect(ticketService.createTicket('brand-1', 'user-1', { description: 'Missing subject' }))
        .rejects.toThrow('Subject is required');

      expect(ticketRepository.createTicket).not.toHaveBeenCalled();
    });
  });

  describe('updateTicketStatus()', () => {
    it('should update status and emit real-time event to socket room', async () => {
      const ticketId = 'ticket-1';
      const status = 'RESOLVED';
      const mockResult = { id: ticketId, status };

      ticketRepository.updateTicketStatus.mockResolvedValue(mockResult);

      const result = await ticketService.updateTicketStatus(ticketId, status);

      expect(result).toEqual(mockResult);
      expect(ticketRepository.updateTicketStatus).toHaveBeenCalledWith(ticketId, status);
      
      // Verify real-time broadcast
      expect(socketManager.emitToRoom).toHaveBeenCalledWith(
        `${ROOM_PREFIXES.TICKET}${ticketId}`,
        SOCKET_EVENTS.TICKET_STATUS_UPDATED,
        { ticketId, status }
      );
    });

    it('should handle socket broadcast errors gracefully without throwing', async () => {
      const ticketId = 'ticket-1';
      const status = 'OPEN';
      ticketRepository.updateTicketStatus.mockResolvedValue({ id: ticketId, status });
      
      // Simulate socket crash
      socketManager.emitToRoom.mockImplementationOnce(() => {
        throw new Error('Socket disconnected');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Should succeed even if socket broadcast fails
      const result = await ticketService.updateTicketStatus(ticketId, status);
      expect(result).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('assignTicket()', () => {
    it('should assign ticket and emit real-time event', async () => {
      const ticketId = 'ticket-1';
      const agentId = 'agent-99';
      const mockResult = { id: ticketId, assignedAgentId: agentId, assignedAgent: { name: 'Support Bob' } };

      ticketRepository.assignTicket.mockResolvedValue(mockResult);

      const result = await ticketService.assignTicket(ticketId, agentId);

      expect(result).toEqual(mockResult);
      expect(ticketRepository.assignTicket).toHaveBeenCalledWith(ticketId, agentId);
      
      // Verify real-time broadcast
      expect(socketManager.emitToRoom).toHaveBeenCalledWith(
        `${ROOM_PREFIXES.TICKET}${ticketId}`,
        SOCKET_EVENTS.TICKET_ASSIGNED,
        { ticketId, assignedAgent: mockResult.assignedAgent }
      );
    });
  });

  describe('getActiveTicket()', () => {
    it('should return active ticket if brandId is valid', async () => {
      const brandId = 'brand-1';
      const mockResult = { id: 'ticket-2', status: 'OPEN' };
      ticketRepository.findActiveTicket.mockResolvedValue(mockResult);

      const result = await ticketService.getActiveTicket(brandId);

      expect(result).toEqual(mockResult);
      expect(ticketRepository.findActiveTicket).toHaveBeenCalledWith(brandId);
    });

    it('should throw 400 if brandId is missing', async () => {
      await expect(ticketService.getActiveTicket(null))
        .rejects.toThrow('Brand ID is required');

      expect(ticketRepository.findActiveTicket).not.toHaveBeenCalled();
    });
  });
});
