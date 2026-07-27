const request = require('supertest');
const http = require('http');
const ioClient = require('socket.io-client');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const socketManager = require('../../src/services/workspace/socket/socket.manager');
const { SOCKET_EVENTS } = require('../../src/utils/socket-constants');
const jwtUtils = require('../../src/utils/jwt.utils');

describe('WebSocket Chat Support Integration Tests', () => {
  let server;
  let socketUrl;
  let userToken;
  let testUser;
  let testBrand;
  let testTicket;

  beforeAll(async () => {
    // 1. Create a server instance for socket testing
    server = http.createServer(app);
    
    // Listen on dynamic port
    await new Promise((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        socketUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });

    // Init socket manager
    socketManager.init(server, { origin: '*' });

    // 2. Setup DB Mock Data
    testUser = await prisma.user.create({
      data: {
        email: `ws-chat-user-${Date.now()}@example.com`,
        passwordHash: 'dummy-hash',
        name: 'WebSocket Test User',
        role: 'OWNER',
        isActive: true
      }
    });

    userToken = jwtUtils.generateAccessToken({ id: testUser.id });

    testBrand = await prisma.brand.create({
      data: {
        name: 'WS Test Brand',
        timezone: 'Asia/Ho_Chi_Minh',
        defaultLanguage: 'vi',
        owner: { connect: { id: testUser.id } },
        subscription: {
          create: {
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            plan: {
              connectOrCreate: {
                where: { name_billingCycle: { name: 'FREE', billingCycle: 'MONTHLY' } },
                create: {
                  name: 'FREE',
                  billingCycle: 'MONTHLY',
                  priceAmount: 0.00,
                  currency: 'VND',
                  planLimit: {
                    create: {
                      maxBrands: 1,
                      maxSocialProfiles: 1,
                      maxPostsPerMonth: 10,
                      maxLivePlatforms: 1,
                      maxStreamQuality: 'SD',
                      maxTeamSeats: 0,
                      allowCustomRoles: false,
                      allowApprovalWorkflow: false
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    testTicket = await prisma.supportTicket.create({
      data: {
        brandId: testBrand.id,
        userId: testUser.id,
        subject: 'WS Test Subject',
        priority: 'MEDIUM',
        status: 'OPEN'
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testTicket) {
      await prisma.ticketMessage.deleteMany({ where: { ticketId: testTicket.id } });
      await prisma.supportTicket.delete({ where: { id: testTicket.id } });
    }
    if (testBrand) {
      const brand = await prisma.brand.findUnique({
        where: { id: testBrand.id },
        select: { subscriptionId: true }
      });
      await prisma.brand.delete({ where: { id: testBrand.id } });
      if (brand && brand.subscriptionId) {
        await prisma.subscription.delete({ where: { id: brand.subscriptionId } });
      }
    }
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } });
    }

    // Close Socket connections and server
    socketManager.io.close();
    await new Promise((resolve) => server.close(resolve));
    await prisma.$disconnect();
  });

  it('should authenticate and connect client via websocket successfully', (done) => {
    const client = ioClient(socketUrl, {
      auth: { token: userToken },
      transports: ['websocket']
    });

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      client.disconnect();
      done();
    });

    client.on('connect_error', (err) => {
      client.disconnect();
      done(err);
    });
  });

  it('should fail authentication if token is missing or invalid', (done) => {
    const client = ioClient(socketUrl, {
      auth: { token: 'invalid-token' },
      transports: ['websocket']
    });

    client.on('connect_error', (err) => {
      expect(err.message).toContain('Authentication error');
      client.disconnect();
      done();
    });
  });

  it('should join support ticket room, send a message and receive it back via broadcast', (done) => {
    const client = ioClient(socketUrl, {
      auth: { token: userToken },
      transports: ['websocket']
    });

    client.on('connect', () => {
      // 1. Join ticket room
      client.emit(SOCKET_EVENTS.JOIN_ROOM, { ticketId: testTicket.id });
    });

    client.on(SOCKET_EVENTS.JOINED_ROOM, (payload) => {
      expect(payload.ticketId).toBe(testTicket.id);

      // 2. Send message inside the room
      client.emit(SOCKET_EVENTS.SEND_MESSAGE, {
        ticketId: testTicket.id,
        messageType: 'TEXT',
        content: 'Hello, this is WebSocket integration test!'
      });
    });

    // 3. Hear message broadcasted back
    client.on(SOCKET_EVENTS.NEW_MESSAGE, (msg) => {
      expect(msg.ticketId).toBe(testTicket.id);
      expect(msg.text).toBe('Hello, this is WebSocket integration test!');
      expect(msg.sender).toBe('user');
      client.disconnect();
      done();
    });
  });
});
