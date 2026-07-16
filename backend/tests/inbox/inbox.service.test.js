const inboxService = require('../../src/services/social/inbox.service');
const inboxRepository = require('../../src/repositories/social/inbox.repository');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const { INBOX_STATUS, INBOX_TYPES } = require('../../src/utils/constants');

jest.mock('../../src/repositories/social/inbox.repository', () => ({
  findManyAndCount: jest.fn(),
  findById: jest.fn(),
  findOrCreateInbox: jest.fn(),
  updateInboxLastSync: jest.fn(),
  createInboxItem: jest.fn(),
  updateInboxItem: jest.fn(),
  updateStatus: jest.fn()
}));

jest.mock('../../src/repositories/social/social-account.repository', () => ({
  findById: jest.fn(),
  findByBrandAndPlatformFirst: jest.fn(),
  findByBrandAndPlatform: jest.fn()
}));

jest.mock('../../src/services/auth/authorization.facade', () => ({
  checkBrandAccess: jest.fn()
}));

// Mock các strategy đồng bộ inbox để tránh gọi DB/repo thật
jest.mock('../../src/services/social/inbox/strategies/youtube-comment.strategy', () => {
  return jest.fn().mockImplementation(() => ({
    supports: jest.fn().mockImplementation((platform) => platform === 'YOUTUBE'),
    sync: jest.fn().mockResolvedValue([{ id: 'youtube-synced-1' }]),
    supportsReply: jest.fn().mockReturnValue(false)
  }));
});

jest.mock('../../src/services/social/inbox/strategies/facebook-comment.strategy', () => {
  return jest.fn().mockImplementation(() => ({
    supports: jest.fn().mockImplementation((platform) => platform === 'FACEBOOK'),
    sync: jest.fn().mockResolvedValue([{ id: 'facebook-synced-1' }]),
    supportsReply: jest.fn().mockReturnValue(true),
    reply: jest.fn().mockResolvedValue({ id: 'platform-reply-id' })
  }));
});

jest.mock('../../src/services/social/inbox/strategies/facebook-dm.strategy', () => {
  return jest.fn().mockImplementation(() => ({
    supports: jest.fn().mockImplementation((platform) => platform === 'FACEBOOK'),
    sync: jest.fn().mockResolvedValue([]),
    supportsReply: jest.fn().mockReturnValue(false)
  }));
});

jest.mock('../../src/services/social/inbox/strategies/instagram-dm.strategy', () => {
  return jest.fn().mockImplementation(() => ({
    supports: jest.fn().mockImplementation((platform) => platform === 'INSTAGRAM'),
    sync: jest.fn().mockResolvedValue([]),
    supportsReply: jest.fn().mockReturnValue(false)
  }));
});

describe('InboxService Unit Tests', () => {
  // Re-instantiate strategies since mock modules are applied
  beforeAll(() => {
    const YoutubeStrategy = require('../../src/services/social/inbox/strategies/youtube-comment.strategy');
    const FacebookCommentStrategy = require('../../src/services/social/inbox/strategies/facebook-comment.strategy');
    const FacebookDMStrategy = require('../../src/services/social/inbox/strategies/facebook-dm.strategy');
    const InstagramDMStrategy = require('../../src/services/social/inbox/strategies/instagram-dm.strategy');

    inboxService.strategies = [
      new YoutubeStrategy(),
      new FacebookCommentStrategy(),
      new FacebookDMStrategy(),
      new InstagramDMStrategy()
    ];
  });

  beforeEach(() => {
    authorizationFacade.checkBrandAccess.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockInboxItem = {
    id: 'item-111',
    inboxId: 'inbox-999',
    platform: 'FACEBOOK',
    type: 'COMMENT',
    platformItemId: 'fb_comment_123',
    parentItemId: null,
    authorId: 'author-user',
    authorName: 'Nguyen Van A',
    authorAvatarUrl: 'https://avatar.png',
    content: 'Sản phẩm này giá bao nhiêu?',
    platformCreatedAt: new Date(),
    syncedAt: new Date(),
    status: 'UNREAD',
    tags: 'sales',
    internalNotes: 'Cần tư vấn thêm',
    inbox: { brandId: 'brand-abc' },
    replies: []
  };

  describe('INBOX_001 - getInboxItems (Filters & Pagination)', () => {
    it('should query inboxRepository with pagination details', async () => {
      inboxRepository.findManyAndCount.mockResolvedValue({
        items: [mockInboxItem],
        total: 1
      });

      const result = await inboxService.getInboxItems({ page: 1, limit: 10 }, 'brand-abc');

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(inboxRepository.findManyAndCount).toHaveBeenCalledWith(
        expect.any(Object),
        { skip: 0, take: 10 }
      );
    });
  });

  describe('INBOX_002 - getConversationThread', () => {
    it('should retrieve main item and formatted thread replies', async () => {
      inboxRepository.findById.mockResolvedValue({
        ...mockInboxItem,
        replies: [
          {
            id: 'reply-222',
            content: 'Chào bạn, giá là 500k ạ',
            authorName: 'PubliCast Agent',
            platformCreatedAt: new Date(),
            repliedByUserId: 'agent-1'
          }
        ]
      });

      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue({
        platformAccountId: 'my-fb-page-id'
      });

      const result = await inboxService.getConversationThread('item-111', 'user-1');

      expect(result.thread).toHaveLength(2); // Main item + 1 reply
      expect(result.thread[0].author).toBe('Nguyen Van A');
      expect(result.thread[1].author).toBe('PubliCast Agent');
      expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('user-1', 'brand-abc');
    });

    it('should throw status 404 error when item does not exist', async () => {
      inboxRepository.findById.mockResolvedValue(null);

      await expect(
        inboxService.getConversationThread('non-exist', 'user-1')
      ).rejects.toEqual({ status: 404, message: 'Item not found' });
    });

    it('should throw status 403 when user has no access to the item brand', async () => {
      inboxRepository.findById.mockResolvedValue(mockInboxItem);
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        inboxService.getConversationThread('item-111', 'stranger-user')
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('INBOX_003 - syncPlatformComments', () => {
    it('should trigger strategies according to platform type and execute sync', async () => {
      const mockInbox = { id: 'inbox-999', brandId: 'brand-abc' };
      inboxRepository.findOrCreateInbox.mockResolvedValue(mockInbox);

      const syncResult = await inboxService.syncPlatformComments('brand-abc', 'YOUTUBE');

      expect(inboxRepository.findOrCreateInbox).toHaveBeenCalledWith('brand-abc');
      expect(inboxRepository.updateInboxLastSync).toHaveBeenCalledWith('inbox-999');
      expect(syncResult).toHaveLength(1);
      expect(syncResult[0].id).toBe('youtube-synced-1');
    });
  });

  describe('INBOX_004 - replyToItem', () => {
    it('should invoke correct reply strategy and update local database', async () => {
      inboxRepository.findById.mockResolvedValue(mockInboxItem);

      const reply = await inboxService.replyToItem('brand-abc', 'item-111', 'Xin chào bạn', 'user-1');

      expect(inboxRepository.updateInboxItem).toHaveBeenCalledWith('item-111', expect.objectContaining({
        content: 'Xin chào bạn',
        status: INBOX_STATUS.READ
      }));
      expect(reply).toEqual({ id: 'platform-reply-id' });
    });

    it('should reject replying when caller has no access to brandId', async () => {
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        inboxService.replyToItem('brand-abc', 'item-111', 'Xin chào bạn', 'stranger-user')
      ).rejects.toMatchObject({ status: 403 });
      expect(inboxRepository.findById).not.toHaveBeenCalled();
    });

    it('should reject replying when item belongs to a different brand than claimed', async () => {
      inboxRepository.findById.mockResolvedValue(mockInboxItem); // inbox.brandId = 'brand-abc'

      await expect(
        inboxService.replyToItem('brand-other', 'item-111', 'Xin chào bạn', 'user-1')
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('INBOX_005 - updateItemStatus & Metadata', () => {
    it('should update item status to READ', async () => {
      inboxRepository.findById.mockResolvedValue(mockInboxItem);
      inboxRepository.updateStatus.mockResolvedValue({ id: 'item-111', status: 'READ' });

      const updated = await inboxService.updateItemStatus('item-111', 'READ', 'user-1');

      expect(inboxRepository.updateStatus).toHaveBeenCalledWith('item-111', 'READ');
      expect(updated.status).toBe('READ');
    });

    it('should reject status update when user has no access to the item brand', async () => {
      inboxRepository.findById.mockResolvedValue(mockInboxItem);
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        inboxService.updateItemStatus('item-111', 'READ', 'stranger-user')
      ).rejects.toMatchObject({ status: 403 });
      expect(inboxRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should update tags and internal notes', async () => {
      inboxRepository.findById.mockResolvedValue(mockInboxItem);
      inboxRepository.updateInboxItem.mockResolvedValue({
        ...mockInboxItem,
        tags: 'new-tag',
        internalNotes: 'Note updated'
      });

      const updated = await inboxService.updateItemMetadata('item-111', {
        tags: 'new-tag',
        internalNotes: 'Note updated'
      }, 'user-1');

      expect(inboxRepository.updateInboxItem).toHaveBeenCalledWith('item-111', {
        tags: 'new-tag',
        internalNotes: 'Note updated'
      });
      expect(updated.tags).toBe('new-tag');
      expect(updated.internalNotes).toBe('Note updated');
    });
  });

  describe('INBOX_006 - updateReply & deleteReply', () => {
    it('should update reply successfully through correct strategy', async () => {
      const mockReplyItem = {
        id: 'reply-123',
        platform: 'FACEBOOK',
        platformItemId: 'fb_comment_456',
        inbox: { brandId: 'brand-abc' }
      };
      
      inboxRepository.findById.mockResolvedValue(mockReplyItem);
      const activeStrategy = inboxService.strategies.find(s => s.supportsReply(mockReplyItem));
      activeStrategy.updateReply = jest.fn().mockResolvedValue({ success: true });
      inboxRepository.updateInboxItem.mockResolvedValue({ ...mockReplyItem, content: 'Updated Content' });

      const result = await inboxService.updateReply('brand-abc', 'reply-123', 'Updated Content', 'user-1');

      expect(inboxRepository.findById).toHaveBeenCalledWith('reply-123');
      expect(activeStrategy.updateReply).toHaveBeenCalledWith('brand-abc', 'fb_comment_456', 'Updated Content');
      expect(inboxRepository.updateInboxItem).toHaveBeenCalledWith('reply-123', { content: 'Updated Content' });
      expect(result.content).toBe('Updated Content');
    });

    it('should reject updating reply when caller has no access to brandId', async () => {
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        inboxService.updateReply('brand-abc', 'reply-123', 'Updated Content', 'stranger-user')
      ).rejects.toMatchObject({ status: 403 });
      expect(inboxRepository.findById).not.toHaveBeenCalled();
    });

    it('should delete reply successfully through correct strategy', async () => {
      const mockReplyItem = {
        id: 'reply-123',
        platform: 'FACEBOOK',
        platformItemId: 'fb_comment_456',
        inbox: { brandId: 'brand-abc' }
      };

      inboxRepository.findById.mockResolvedValue(mockReplyItem);
      const activeStrategy = inboxService.strategies.find(s => s.supportsReply(mockReplyItem));
      activeStrategy.deleteReply = jest.fn().mockResolvedValue({ success: true });
      inboxRepository.deleteInboxItem = jest.fn().mockResolvedValue(true);

      const result = await inboxService.deleteReply('brand-abc', 'reply-123', 'user-1');

      expect(inboxRepository.findById).toHaveBeenCalledWith('reply-123');
      expect(activeStrategy.deleteReply).toHaveBeenCalledWith('brand-abc', 'fb_comment_456');
      expect(inboxRepository.deleteInboxItem).toHaveBeenCalledWith('reply-123');
      expect(result).toBe(true);
    });

    it('should reject deleting reply when caller has no access to brandId', async () => {
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        inboxService.deleteReply('brand-abc', 'reply-123', 'stranger-user')
      ).rejects.toMatchObject({ status: 403 });
      expect(inboxRepository.findById).not.toHaveBeenCalled();
    });
  });
});
