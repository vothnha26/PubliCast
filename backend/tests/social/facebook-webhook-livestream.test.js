const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const inboxRepository = require('../../src/repositories/social/inbox.repository');
const socketManager = require('../../src/services/workspace/socket/socket.manager');
const redisClient = require('../../src/config/redis');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/repositories/social/inbox.repository');
jest.mock('../../src/services/workspace/socket/socket.manager');
jest.mock('../../src/services/social/inbox/strategies/auto-reply/auto-reply.service', () => ({
  executeAutoReply: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../src/config/redis', () => ({
  set: jest.fn()
}));
jest.mock('../../src/config/prisma', () => ({
  livestream: {
    findFirst: jest.fn()
  }
}));

describe('Facebook Webhook Livestream Integration Tests', () => {
  const verifyToken = 'publicast_facebook_verify_token_2026';
  const appSecret = 'test_app_secret';

  beforeEach(() => {
    process.env.FACEBOOK_VERIFY_TOKEN = verifyToken;
    process.env.FACEBOOK_APP_SECRET = appSecret;
    redisClient.set.mockResolvedValue('OK');
    jest.clearAllMocks();
  });

  const generateSignature = (payloadString) => {
    const hash = crypto
      .createHmac('sha256', appSecret)
      .update(payloadString)
      .digest('hex');
    return `sha256=${hash}`;
  };

  describe('Webhook Signature Verification', () => {
    it('should reject with 401 if x-hub-signature-256 header is missing', async () => {
      const payload = { object: 'page', entry: [] };
      const res = await request(app)
        .post('/api/social/facebook/webhook')
        .send(payload);

      expect(res.status).toBe(401);
      expect(socketManager.emitToLivestreamRoom).not.toHaveBeenCalled();
    });

    it('should reject with 403 if signature hash is incorrect (invalid/forged signature)', async () => {
      const payload = { object: 'page', entry: [] };
      const res = await request(app)
        .post('/api/social/facebook/webhook')
        .set('x-hub-signature-256', 'sha256=invalidhashvalue12345')
        .send(payload);

      expect(res.status).toBe(403);
      expect(socketManager.emitToLivestreamRoom).not.toHaveBeenCalled();
    });

    it('should respond with 200 OK and handle successfully if signature is valid', async () => {
      const payload = {
        object: 'page',
        entry: [
          {
            id: 'page_123',
            time: 1458291000,
            changes: [
              {
                field: 'feed',
                value: {
                  item: 'comment',
                  verb: 'add',
                  comment_id: 'comment_999',
                  parent_id: 'post_123',
                  post_id: 'post_123',
                  message: 'Hello Live Chat!',
                  sender_id: 'sender_456',
                  sender_name: 'John Doe',
                  created_time: 1458291000
                }
              }
            ]
          }
        ]
      };

      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString);

      const mockAccount = {
        id: 'account_123',
        brandId: 'brand_789',
        platform: 'FACEBOOK',
        platformAccountId: 'page_123'
      };

      const mockInbox = { id: 'inbox_123', brandId: 'brand_789' };

      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(mockAccount);
      inboxRepository.findOrCreateInbox.mockResolvedValue(mockInbox);
      inboxRepository.upsertInboxItem.mockResolvedValue({ id: 'inbox_item_123' });
      prisma.livestream.findFirst.mockResolvedValue(null); // No livestream found for now

      const res = await request(app)
        .post('/api/social/facebook/webhook')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(res.status).toBe(200);
      expect(res.text).toBe('EVENT_RECEIVED');
    });
  });

  describe('Livestream Comment Forwarding & Logic', () => {
    const createCommentPayload = (commentId, message) => ({
      object: 'page',
      entry: [
        {
          id: 'page_123',
          time: 1458291000,
          changes: [
            {
              field: 'feed',
              value: {
                item: 'comment',
                verb: 'add',
                comment_id: commentId,
                parent_id: 'live_post_123',
                post_id: 'live_post_123',
                message: message,
                sender_id: 'sender_456',
                sender_name: 'John Doe',
                created_time: 1458291000
              }
            }
          ]
        }
      ]
    });

    it('should forward comment to socket and bypass inbox if livestream exists and status is LIVE', async () => {
      const payload = createCommentPayload('comment_live_123', 'Testing live forward');
      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString);

      const mockAccount = {
        id: 'account_123',
        brandId: 'brand_789',
        platform: 'FACEBOOK',
        platformAccountId: 'page_123'
      };
      const mockInbox = { id: 'inbox_123', brandId: 'brand_789' };
      const mockLivestream = {
        id: 'livestream_uuid_111',
        brandId: 'brand_789',
        platformStreamId: 'live_post_123',
        status: 'LIVE'
      };

      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(mockAccount);
      inboxRepository.findOrCreateInbox.mockResolvedValue(mockInbox);
      prisma.livestream.findFirst.mockResolvedValue(mockLivestream);

      const res = await request(app)
        .post('/api/social/facebook/webhook')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(res.status).toBe(200);

      // Verify async processing of socket emission (wait a brief moment since processEvent runs async)
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(prisma.livestream.findFirst).toHaveBeenCalledWith({
        where: {
          brandId: 'brand_789',
          platformStreamId: 'live_post_123',
          status: 'LIVE'
        }
      });

      // Assert socket room emission
      expect(socketManager.emitToLivestreamRoom).toHaveBeenCalledWith(
        'livestream_uuid_111',
        'new_livestream_comment',
        expect.objectContaining({
          id: 'comment_live_123',
          authorName: 'John Doe',
          authorAvatarUrl: expect.stringContaining('sender_456'),
          content: 'Testing live forward',
          platform: 'facebook',
          timestamp: expect.any(Date)
        })
      );

      // CRITICAL: Live comments MUST NOT be saved to the Unified Inbox
      expect(inboxRepository.upsertInboxItem).not.toHaveBeenCalled();
    });

    it('should save to Unified Inbox and NOT emit to socket if livestream does not exist (normal comment)', async () => {
      const payload = createCommentPayload('comment_live_222', 'Should be saved to inbox');
      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString);

      const mockAccount = { id: 'account_123', brandId: 'brand_789', platform: 'FACEBOOK', platformAccountId: 'page_123' };
      const mockInbox = { id: 'inbox_123', brandId: 'brand_789' };

      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(mockAccount);
      inboxRepository.findOrCreateInbox.mockResolvedValue(mockInbox);
      inboxRepository.upsertInboxItem.mockResolvedValue({ id: 'db_item_222' });
      
      // Prisma returns null -> no live stream, thus it's a normal comment
      prisma.livestream.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/social/facebook/webhook')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(res.status).toBe(200);

      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert that normal comments are saved to the inbox
      expect(inboxRepository.upsertInboxItem).toHaveBeenCalled();
      
      // Assert that no socket emission happens
      expect(socketManager.emitToLivestreamRoom).not.toHaveBeenCalled();
    });

    it('should ignore duplicate comment events (Idempotency) when Redis NX returns null', async () => {
      const payload = createCommentPayload('comment_dup_789', 'Duplicate comment test');
      const payloadString = JSON.stringify(payload);
      const signature = generateSignature(payloadString);

      const mockAccount = { id: 'account_123', brandId: 'brand_789', platform: 'FACEBOOK', platformAccountId: 'page_123' };
      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(mockAccount);
      
      // Mock Redis to return null for duplication detection (already exists)
      redisClient.set.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/social/facebook/webhook')
        .set('x-hub-signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadString);

      expect(res.status).toBe(200);

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(inboxRepository.upsertInboxItem).not.toHaveBeenCalled();
      expect(socketManager.emitToLivestreamRoom).not.toHaveBeenCalled();
    });
  });
});
