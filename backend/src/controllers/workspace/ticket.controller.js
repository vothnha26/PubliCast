const ticketService = require('../../services/workspace/ticket.service');

class TicketController {
  async getTickets(req, res, next) {
    try {
      const { brandId } = req.query;
      const tickets = await ticketService.getTickets(brandId, req.query, req.user);
      res.status(200).json({ status: 'success', data: tickets });
    } catch (err) {
      next(err);
    }
  }

  async getTicketDetails(req, res, next) {
    try {
      const { id } = req.params;
      const ticket = await ticketService.getTicketDetails(id, req.user.id);
      res.status(200).json({ status: 'success', data: ticket });
    } catch (err) {
      next(err);
    }
  }

  async createTicket(req, res, next) {
    try {
      const { brandId } = req.body;
      const ticket = await ticketService.createTicket(brandId, req.user.id, req.body);
      res.status(201).json({ status: 'success', data: ticket });
    } catch (err) {
      next(err);
    }
  }

  async updateTicketStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const ticket = await ticketService.updateTicketStatus(id, status, req.user.id);
      res.status(200).json({ status: 'success', data: ticket });
    } catch (err) {
      next(err);
    }
  }
  async getActiveTicket(req, res, next) {
    try {
      const { brandId } = req.query;
      const ticket = await ticketService.getActiveTicket(brandId);
      res.status(200).json({ status: 'success', data: ticket });
    } catch (err) {
      next(err);
    }
  }

  async assignTicket(req, res, next) {
    try {
      const { id } = req.params;
      const agentId = req.user.id;
      const ticket = await ticketService.assignTicket(id, agentId);
      res.status(200).json({ status: 'success', data: ticket });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TicketController();
