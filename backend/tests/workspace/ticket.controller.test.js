jest.mock('../../src/services/workspace/ticket.service', () => ({
  getTickets: jest.fn(),
  getTicketDetails: jest.fn(),
  createTicket: jest.fn(),
  updateTicketStatus: jest.fn(),
  getActiveTicket: jest.fn(),
  assignTicket: jest.fn()
}));

const ticketService = require('../../src/services/workspace/ticket.service');
const ticketController = require('../../src/controllers/workspace/ticket.controller');
const ticketControllerV2 = require('../../src/controllers/workspace/ticket.controller.v2');

function mockReqRes({ params = {}, query = {}, body = {}, user = { id: 'user-1' } } = {}) {
  const req = { params, query, body, user };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { req, res };
}

// v1 methods here are plain (req, res, next) async functions with manual
// try/catch (not asyncHandler); v2 wraps in asyncHandler. Both can be
// awaited via this indirection.
function callHandler(handler, req, res, next) {
  return new Promise((resolve, reject) => {
    Promise.resolve(handler(req, res, next || ((err) => (err ? reject(err) : resolve())))).then(resolve, reject);
  });
}

describe('TicketController v1/v2 parity', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getTickets: v1 returns {status, data}; v2 drops status, keeps data', async () => {
    ticketService.getTickets.mockResolvedValue([{ id: 't1' }]);

    const v1 = mockReqRes({ query: { brandId: 'b1' } });
    await callHandler(ticketController.getTickets, v1.req, v1.res);
    expect(v1.res.json).toHaveBeenCalledWith({ status: 'success', data: [{ id: 't1' }] });

    const v2 = mockReqRes({ query: { brandId: 'b1' } });
    await callHandler(ticketControllerV2.getTickets, v2.req, v2.res);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: [{ id: 't1' }] });
  });

  it('createTicket: both return 201 with the created ticket', async () => {
    ticketService.createTicket.mockResolvedValue({ id: 't1' });

    const v2 = mockReqRes({ body: { brandId: 'b1', subject: 'Help' } });
    await callHandler(ticketControllerV2.createTicket, v2.req, v2.res);
    expect(v2.res.status).toHaveBeenCalledWith(201);
    expect(v2.res.json).toHaveBeenCalledWith({ message: 'Success', data: { id: 't1' } });
  });

  it('updateTicketStatus / getActiveTicket / assignTicket: all forward args identically', async () => {
    ticketService.updateTicketStatus.mockResolvedValue({ id: 't1', status: 'CLOSED' });
    const v2a = mockReqRes({ params: { id: 't1' }, body: { status: 'CLOSED' } });
    await callHandler(ticketControllerV2.updateTicketStatus, v2a.req, v2a.res);
    expect(ticketService.updateTicketStatus).toHaveBeenCalledWith('t1', 'CLOSED', 'user-1');

    ticketService.getActiveTicket.mockResolvedValue(null);
    const v2b = mockReqRes({ query: { brandId: 'b1' } });
    await callHandler(ticketControllerV2.getActiveTicket, v2b.req, v2b.res);
    expect(v2b.res.json).toHaveBeenCalledWith({ message: 'Success', data: null });

    ticketService.assignTicket.mockResolvedValue({ id: 't1', assignedTo: 'agent-1' });
    const v2c = mockReqRes({ params: { id: 't1' }, user: { id: 'agent-1' } });
    await callHandler(ticketControllerV2.assignTicket, v2c.req, v2c.res);
    expect(ticketService.assignTicket).toHaveBeenCalledWith('t1', 'agent-1');
  });
});
