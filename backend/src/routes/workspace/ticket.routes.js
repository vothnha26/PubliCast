const express = require('express');
const router = express.Router();
const ticketController = require('../../controllers/workspace/ticket.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireBrandMember } = require('../../middlewares/permission.middleware');

// Protect all support ticket routes
router.use(verifyAuth);

// brandId comes from the query string here, so a route-level membership
// check is sufficient (see issue #47).
router.get('/', requireBrandMember, ticketController.getTickets);
router.post('/', ticketController.createTicket);
router.get('/active', requireBrandMember, ticketController.getActiveTicket);
// These take only a ticket :id (no brandId in the request), so ownership is
// verified inside ticket.service.js against the ticket's own brandId instead
// of a route-level middleware.
router.get('/:id', ticketController.getTicketDetails);
router.put('/:id/status', ticketController.updateTicketStatus);
router.put('/:id/assign', ticketController.assignTicket);

module.exports = router;
