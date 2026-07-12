const http = require('http');
const ioClient = require('socket.io-client');
const app = require('../../src/app');
const prisma = require('../../src/config/prisma');
const socketManager = require('../../src/services/workspace/socket/socket.manager');
const { SOCKET_EVENTS } = require('../../src/utils/socket-constants');
const jwtUtils = require('../../src/utils/jwt.utils');
const { PLATFORMS } = require('../../src/utils/constants');

describe('WebSocket Livestream Chat Integration Tests', () => {
  let server;
  let socketUrl;
  let userToken;
  let testUser;
  let testBrand;
  let testLivestream;
  let testSocialAccount;

  beforeAll(async () => {
    // 1. Create a server instance for socket testing
    server = http.createServer(app);
    
    // Listen on dynamic port
    await new Promise((resolve) => {
      server.listen(0, () => {
        const address = server.address();
        socketUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Init socket manager
    socketManager.init(server, { origin: '*' });

    // 2. Setup DB Mock Data
    testUser = await prisma.user.create({
      data: {
        email: `livestream-chat-user-${Date.now()}@example.com`,
        passwordHash: 'dummy-hash',
        name: 'Livestream Test User',
        role: 'OWNER',
        isActive: true
      }
    });

    userToken = jwtUtils.generateAccessToken({ id: testUser.id });

    testBrand = await prisma.brand.create({
      data: {
        name: 'Livestream Test Brand',
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

    // Create a YouTube social account with mock credentials
    testSocialAccount = await prisma.socialAccount.create({
      data: {
        brandId: testBrand.id,
        platform: PLATFORMS.YOUTUBE,
        platformAccountId: 'mock-yt-account-id',
        displayName: 'Mock YT channel',
        username: 'mock-username',
        scopes: 'mock-scope',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        profilePictureUrl: 'https://avatar.url/mock',
        connectedAt: new Date()
      }
    });

    // Create a Livestream record
    testLivestream = await prisma.livestream.create({
      data: {
        brandId: testBrand.id,
        createdByUserId: testUser.id,
        title: 'Integration Test Livestream',
        status: 'LIVE',
        scheduledAt: new Date(),
        durationMinutes: 60,
        streamKey: 'mock-key',
        rtmpUrl: 'rtmp://mock',
        targetPlatforms: 'YOUTUBE',
        streamQuality: '1080p',
        metadata: '{}',
        platformStreamId: 'mock-live-chat-id-123'
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testLivestream) {
      await prisma.livestream.delete({ where: { id: testLivestream.id } });
    }
    if (testSocialAccount) {
      await prisma.socialAccount.delete({ where: { id: testSocialAccount.id } });
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

  it('should handle full livestream socket lifecycle: join, poll mock comments, and leave', (done) => {
    const client = ioClient(socketUrl, {
      auth: { token: userToken },
      transports: ['websocket']
    });

    let commentReceived = false;

    client.on('connect', () => {
      expect(client.connected).toBe(true);
      // Join livestream room
      client.emit(SOCKET_EVENTS.JOIN_LIVESTREAM, { livestreamId: testLivestream.id });
    });

    client.on(SOCKET_EVENTS.JOINED_LIVESTREAM, (payload) => {
      expect(payload.livestreamId).toBe(testLivestream.id);
      // Room joined, now we wait for the polling manager to send a mock comment
    });

    client.on(SOCKET_EVENTS.NEW_LIVESTREAM_COMMENT, (comment) => {
      expect(comment).toHaveProperty('id');
      expect(comment).toHaveProperty('content');
      expect(comment.platform).toBe('youtube');
      commentReceived = true;
      
      // Leave room and disconnect
      client.emit(SOCKET_EVENTS.LEAVE_LIVESTREAM, { livestreamId: testLivestream.id });
    });

    client.on(SOCKET_EVENTS.LEFT_ROOM, (payload) => {
      expect(payload.livestreamId).toBe(testLivestream.id);
      clearTimeout(timeoutId);
      client.disconnect();
      done();
    });

    client.on('connect_error', (err) => {
      clearTimeout(timeoutId);
      client.disconnect();
      done(err);
    });

    // Timeout fallback to prevent hanging
    const timeoutId = setTimeout(() => {
      if (commentReceived) return;
      client.disconnect();
      done(new Error('Timeout waiting for mock livestream comments'));
    }, 12000);
  });
});
