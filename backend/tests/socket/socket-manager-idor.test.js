/**
 * Regression tests for issues #72 and #73: socket.manager.js join/send
 * handlers must verify the caller belongs to the ticket/brand/livestream
 * before joining a room or persisting a message, instead of only checking
 * the resource exists.
 *
 * These are unit tests against the handlers directly (not a real
 * socket.io/HTTP server) so they avoid the app.js require chain that pulls
 * in otplib (a pre-existing Jest/Babel parse issue in this repo, unrelated
 * to this fix).
 */
jest.mock('../../src/config/prisma', () => ({
  supportTicket: { findUnique: jest.fn() },
  livestream: { findUnique: jest.fn() },
  ticketMessage: { create: jest.fn() }
}));
jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));
jest.mock('../../src/services/workspace/socket/message-strategies/message-processor.factory', () => ({
  getProcessor: jest.fn(() => ({ process: jest.fn(async (payload) => ({ messageType: 'TEXT', content: payload.content, attachmentUrl: null })) }))
}));
jest.mock('../../src/services/core/notification.service', () => ({
  create: jest.fn().mockResolvedValue(undefined)
}));
// socket.manager.js requires socket.io's Server class at module load time;
// stub it so requiring the manager doesn't try to construct a real server.
jest.mock('socket.io', () => ({ Server: jest.fn() }));

const socketManager = require('../../src/services/workspace/socket/socket.manager');
const prisma = require('../../src/config/prisma');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const { SOCKET_EVENTS } = require('../../src/utils/socket-constants');

function fakeSocket(user) {
  return {
    user,
    id: 'socket-1',
    joinedRooms: [],
    emittedEvents: [],
    join(room) { this.joinedRooms.push(room); },
    emit(event, data) { this.emittedEvents.push({ event, data }); }
  };
}

describe('socket.manager _handleSendMessage (#72)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('the ticket owner can send a message', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({ id: 't-1', userId: 'owner-1', assignedAgentId: null, brandId: 'brand-1' });
    prisma.ticketMessage.create.mockResolvedValue({
      id: 'm-1', ticketId: 't-1', content: 'hi', attachmentUrl: null, messageType: 'TEXT',
      createdAt: new Date(), sender: { id: 'owner-1', name: 'Owner', role: 'OWNER' }
    });
    const socket = fakeSocket({ id: 'owner-1', name: 'Owner', role: 'OWNER' });

    await socketManager._handleSendMessage(socket, { ticketId: 't-1', content: 'hi' });

    expect(prisma.ticketMessage.create).toHaveBeenCalled();
    expect(socket.emittedEvents.find(e => e.event === SOCKET_EVENTS.ERROR)).toBeUndefined();
  });

  test('STAFF can send a message on any ticket', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({ id: 't-1', userId: 'owner-1', assignedAgentId: null, brandId: 'brand-1' });
    prisma.ticketMessage.create.mockResolvedValue({
      id: 'm-1', ticketId: 't-1', content: 'hi', attachmentUrl: null, messageType: 'TEXT',
      createdAt: new Date(), sender: { id: 'staff-1', name: 'Staff', role: 'STAFF' }
    });
    const socket = fakeSocket({ id: 'staff-1', name: 'Staff', role: 'STAFF' });

    await socketManager._handleSendMessage(socket, { ticketId: 't-1', content: 'hi' });

    expect(prisma.ticketMessage.create).toHaveBeenCalled();
  });

  test('an unrelated authenticated user cannot send a message on someone else\'s ticket (core #72 bug)', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({ id: 't-victim', userId: 'victim-1', assignedAgentId: 'agent-1', brandId: 'brand-1' });
    const socket = fakeSocket({ id: 'attacker-1', name: 'Attacker', role: 'OWNER' });

    await socketManager._handleSendMessage(socket, { ticketId: 't-victim', content: 'pwned' });

    expect(prisma.ticketMessage.create).not.toHaveBeenCalled();
    expect(socket.emittedEvents.some(e => e.event === SOCKET_EVENTS.ERROR)).toBe(true);
  });
});

describe('socket.manager _handleJoinRoom (#73)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('joins a brand room when the caller has access', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(true);
    const socket = fakeSocket({ id: 'user-1', name: 'User', role: 'OWNER' });

    await socketManager._handleJoinRoom(socket, { brandId: 'brand-1' });

    expect(socket.joinedRooms.length).toBe(1);
    expect(socket.emittedEvents.some(e => e.event === SOCKET_EVENTS.ERROR)).toBe(false);
  });

  test('rejects joining a brand room without access (core #73 bug)', async () => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);
    const socket = fakeSocket({ id: 'attacker-1', name: 'Attacker', role: 'OWNER' });

    await socketManager._handleJoinRoom(socket, { brandId: 'brand-victim' });

    expect(socket.joinedRooms.length).toBe(0);
    expect(socket.emittedEvents.some(e => e.event === SOCKET_EVENTS.ERROR)).toBe(true);
  });

  test('rejects joining a ticket room the caller is not party to', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({ id: 't-victim', userId: 'victim-1', assignedAgentId: 'agent-1' });
    const socket = fakeSocket({ id: 'attacker-1', name: 'Attacker', role: 'OWNER' });

    await socketManager._handleJoinRoom(socket, { ticketId: 't-victim' });

    expect(socket.joinedRooms.length).toBe(0);
    expect(socket.emittedEvents.some(e => e.event === SOCKET_EVENTS.ERROR)).toBe(true);
  });

  test('allows the ticket owner to join their own ticket room', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({ id: 't-1', userId: 'owner-1', assignedAgentId: null });
    const socket = fakeSocket({ id: 'owner-1', name: 'Owner', role: 'OWNER' });

    await socketManager._handleJoinRoom(socket, { ticketId: 't-1' });

    expect(socket.joinedRooms.length).toBe(1);
  });
});

describe('socket.manager _handleJoinLivestream (#73)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('joins the livestream room when the caller belongs to its brand', async () => {
    prisma.livestream.findUnique.mockResolvedValue({ id: 'ls-1', brandId: 'brand-1', targetPlatforms: 'facebook' });
    authorizationFacade.checkBrandAccess.mockResolvedValue(true);
    const socket = fakeSocket({ id: 'user-1', name: 'User', role: 'OWNER' });

    await socketManager._handleJoinLivestream(socket, { livestreamId: 'ls-1' });

    expect(socket.joinedRooms.length).toBe(1);
  });

  test('rejects joining another brand\'s livestream room (core #73 bug)', async () => {
    prisma.livestream.findUnique.mockResolvedValue({ id: 'ls-victim', brandId: 'brand-victim', targetPlatforms: 'youtube' });
    authorizationFacade.checkBrandAccess.mockResolvedValue(false);
    const socket = fakeSocket({ id: 'attacker-1', name: 'Attacker', role: 'OWNER' });

    await socketManager._handleJoinLivestream(socket, { livestreamId: 'ls-victim' });

    expect(socket.joinedRooms.length).toBe(0);
    expect(socket.emittedEvents.some(e => e.event === SOCKET_EVENTS.ERROR)).toBe(true);
  });
});
