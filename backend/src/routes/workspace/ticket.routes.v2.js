const express = require('express');
const router = express.Router();
const ticketController = require('../../controllers/workspace/ticket.controller');
const { verifyAuth } = require('../../middlewares/auth.middleware');
const { requireBrandMember } = require('../../middlewares/permission.middleware');

/**
 * @openapi
 * tags:
 *   name: Tickets V2
 *   description: Support tickets (v2 Envelope API)
 */

router.use(verifyAuth);

router.get('/', requireBrandMember, ticketController.getTickets);
router.post('/', ticketController.createTicket);
router.get('/active', requireBrandMember, ticketController.getActiveTicket);
router.get('/:id', ticketController.getTicketDetails);
router.put('/:id/status', ticketController.updateTicketStatus);
router.put('/:id/assign', ticketController.assignTicket);

module.exports = router;
