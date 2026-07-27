const facebookWebhookService = require('../../src/services/social/facebook/facebook-webhook.service');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const inboxRepository = require('../../src/repositories/social/inbox.repository');
const socketManager = require('../../src/services/workspace/socket/socket.manager');

jest.mock('../../src/repositories/social/social-account.repository');
jest.mock('../../src/repositories/social/inbox.repository');
jest.mock('../../src/services/workspace/socket/socket.manager');
jest.mock('../../src/services/social/inbox/strategies/auto-reply/auto-reply.service', () => ({
  executeAutoReply: jest.fn().mockResolvedValue(true)
}));
jest.mock('../../src/config/redis', () => ({
  set: jest.fn()
}));

const redisClient = require('../../src/config/redis');

// Mock global fetch
global.fetch = jest.fn();

describe('Facebook Webhook Processing tests', () => {
  const verifyToken = 'publicast_facebook_verify_token_2026';

  beforeEach(() => {
    process.env.FACEBOOK_VERIFY_TOKEN = verifyToken;
    redisClient.set.mockResolvedValue('OK');
    jest.clearAllMocks();
  });

  describe('FacebookWebhookService - processEvent (Facebook Feed Comment)', () => {
    it('should upsert comment and emit socket event for Facebook Feed add action', async () => {
      const mockPayload = {
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
                  comment_id: 'comment_123',
                  parent_id: 'post_123',
                  post_id: 'post_123',
                  message: 'This is a test comment from webhook',
                  sender_id: 'sender_456',
                  sender_name: 'John Doe',
                  created_time: 1458291000
                }
              }
            ]
          }
        ]
      };

      const mockAccount = {
        id: 'account_123',
        brandId: 'brand_789',
        platform: 'FACEBOOK',
        platformAccountId: 'page_123',
        accessToken: 'access_token_abc'
      };

      const mockInbox = {
        id: 'inbox_123',
        brandId: 'brand_789'
      };

      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(mockAccount);
      inboxRepository.findOrCreateInbox.mockResolvedValue(mockInbox);
      inboxRepository.upsertInboxItem.mockResolvedValue({ id: 'inbox_item_123', content: 'This is a test comment from webhook' });
      inboxRepository.reconcilePendingChildren.mockResolvedValue({ count: 0 });

      await facebookWebhookService.processEvent(mockPayload);

      expect(socialAccountRepository.findByPlatformAccountIdAndPlatform).toHaveBeenCalledWith('page_123', 'FACEBOOK');
      expect(inboxRepository.findOrCreateInbox).toHaveBeenCalledWith('brand_789');
      expect(inboxRepository.upsertInboxItem).toHaveBeenCalledWith(
        { platformItemId: 'comment_123' },
        expect.any(Object),
        expect.objectContaining({
          platformItemId: 'comment_123',
          content: 'This is a test comment from webhook',
          authorId: 'sender_456'
        })
      );
      expect(socketManager.emitToRoom).toHaveBeenCalledWith(
        'brand_room_brand_789',
        'new_inbox_item',
        expect.objectContaining({ id: 'inbox_item_123' })
      );
    });

    it('should delete comment and emit socket event for Facebook Feed remove action', async () => {
      const mockPayload = {
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
                  verb: 'remove',
                  comment_id: 'comment_123'
                }
              }
            ]
          }
        ]
      };

      const mockAccount = {
        id: 'account_123',
        brandId: 'brand_789',
        platform: 'FACEBOOK',
        platformAccountId: 'page_123'
      };

      const mockExistingItem = {
        id: 'db_item_123',
        platformItemId: 'comment_123'
      };

      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(mockAccount);
      inboxRepository.findInboxItemByPlatformId.mockResolvedValue(mockExistingItem);
      inboxRepository.deleteInboxItem.mockResolvedValue(true);

      await facebookWebhookService.processEvent(mockPayload);

      expect(inboxRepository.findInboxItemByPlatformId).toHaveBeenCalledWith('comment_123');
      expect(inboxRepository.deleteInboxItem).toHaveBeenCalledWith('db_item_123');
      expect(socketManager.emitToRoom).toHaveBeenCalledWith(
        'brand_room_brand_789',
        'inbox_item_deleted',
        { id: 'db_item_123', platformItemId: 'comment_123' }
      );
    });
  });

  describe('FacebookWebhookService - processEvent (Facebook Messaging)', () => {
    it('should fetch Meta conversation ID, upsert parent/child and notify client', async () => {
      const mockPayload = {
        object: 'page',
        entry: [
          {
            id: 'page_123',
            time: 1458692752478,
            messaging: [
              {
                sender: { id: 'sender_456' },
                recipient: { id: 'page_123' },
                timestamp: 1458692752478,
                message: {
                  mid: 'mid_999',
                  text: 'Hello from Messenger!'
                }
              }
            ]
          }
        ]
      };

      const mockAccount = {
        id: 'account_123',
        brandId: 'brand_789',
        platform: 'FACEBOOK',
        platformAccountId: 'page_123',
        accessToken: 'page_token_abc'
      };

      const mockInbox = {
        id: 'inbox_123',
        brandId: 'brand_789'
      };

      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(mockAccount);
      inboxRepository.findOrCreateInbox.mockResolvedValue(mockInbox);
      
      // Mock Meta conversation ID fetch response
      global.fetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          data: [{ id: 't_meta_conversation_123' }]
        })
      });

      const mockParentItem = { id: 'parent_uuid_123', platformItemId: 't_meta_conversation_123' };
      const mockSavedMsg = { id: 'msg_uuid_123', content: 'Hello from Messenger!' };
      inboxRepository.upsertInboxItem
        .mockResolvedValueOnce(mockParentItem) // parent
        .mockResolvedValueOnce(mockSavedMsg); // child

      await facebookWebhookService.processEvent(mockPayload);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://graph.facebook.com/v25.0/page_123/conversations?user_id=sender_456')
      );
      expect(inboxRepository.upsertInboxItem).toHaveBeenNthCalledWith(
        1,
        { platformItemId: 't_meta_conversation_123' },
        expect.any(Object),
        expect.any(Object)
      );
      expect(inboxRepository.upsertInboxItem).toHaveBeenNthCalledWith(
        2,
        { platformItemId: 'mid_999' },
        expect.any(Object),
        expect.objectContaining({
          parentItemId: 'parent_uuid_123',
          platformItemId: 'mid_999'
        })
      );
      expect(socketManager.emitToRoom).toHaveBeenCalledWith(
        'brand_room_brand_789',
        'new_inbox_item',
        expect.objectContaining({
          id: 'parent_uuid_123',
          latestMessage: mockSavedMsg
        })
      );
    });

    it('should ignore duplicate message event when Redis NX returns null', async () => {
      const mockPayload = {
        object: 'page',
        entry: [
          {
            id: 'page_123',
            time: 1458692752478,
            messaging: [
              {
                sender: { id: 'sender_456' },
                recipient: { id: 'page_123' },
                timestamp: 1458692752478,
                message: {
                  mid: 'mid_duplicate_999',
                  text: 'Hello from Messenger again!'
                }
              }
            ]
          }
        ]
      };

      const mockAccount = {
        id: 'account_123',
        brandId: 'brand_789',
        platform: 'FACEBOOK',
        platformAccountId: 'page_123'
      };

      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(mockAccount);
      
      // Giả lập Redis NX trả về null -> sự kiện bị trùng lặp
      redisClient.set.mockResolvedValue(null);

      await facebookWebhookService.processEvent(mockPayload);

      // Webhook sẽ dừng ngay lập tức, không lưu vào DB, không gửi socket
      expect(inboxRepository.upsertInboxItem).not.toHaveBeenCalled();
      expect(socketManager.emitToRoom).not.toHaveBeenCalled();
    });
  });

  describe('FacebookWebhookService - Idempotency for Feed Comments', () => {
    it('should ignore duplicate feed comment event when Redis NX returns null', async () => {
      const mockPayload = {
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
                  comment_id: 'comment_duplicate_123',
                  parent_id: 'post_123',
                  post_id: 'post_123',
                  message: 'This is a duplicate test comment'
                }
              }
            ]
          }
        ]
      };

      const mockAccount = {
        id: 'account_123',
        brandId: 'brand_789',
        platform: 'FACEBOOK',
        platformAccountId: 'page_123'
      };

      socialAccountRepository.findByPlatformAccountIdAndPlatform.mockResolvedValue(mockAccount);
      
      // Giả lập Redis NX trả về null -> sự kiện bị trùng lặp
      redisClient.set.mockResolvedValue(null);

      await facebookWebhookService.processEvent(mockPayload);

      // Webhook sẽ dừng ngay lập tức, không lưu vào DB, không gửi socket
      expect(inboxRepository.upsertInboxItem).not.toHaveBeenCalled();
      expect(socketManager.emitToRoom).not.toHaveBeenCalled();
    });
  });
});
