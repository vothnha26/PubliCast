const ticketService = require('../../services/workspace/ticket.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

/**
 * v1's `status: 'success'` field is dropped — confirmed unused by the
 * frontend (frontend/src/services/ticket.service.js only reads the
 * apiV2-unwrapped `data`).
 */
class TicketControllerV2 {
  getTickets = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const tickets = await ticketService.getTickets(brandId, req.query, req.user);
    v2Success(res, tickets);
  });

  getTicketDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const ticket = await ticketService.getTicketDetails(id, req.user.id);
    v2Success(res, ticket);
  });

  createTicket = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    const ticket = await ticketService.createTicket(brandId, req.user.id, req.body);
    v2Success(res, ticket, 'Success', 201);
  });

  updateTicketStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const ticket = await ticketService.updateTicketStatus(id, status, req.user.id);
    v2Success(res, ticket);
  });

  getActiveTicket = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const ticket = await ticketService.getActiveTicket(brandId);
    v2Success(res, ticket);
  });

  assignTicket = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const agentId = req.user.id;
    const ticket = await ticketService.assignTicket(id, agentId);
    v2Success(res, ticket);
  });
}

module.exports = new TicketControllerV2();
