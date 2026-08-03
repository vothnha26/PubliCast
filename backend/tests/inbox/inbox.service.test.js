const inboxService = require('../../src/services/social/inbox.service');
const inboxRepository = require('../../src/repositories/social/inbox.repository');
const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
const authorizationFacade = require('../../src/services/auth/authorization.facade');
const autoReplyService = require('../../src/services/social/inbox/strategies/auto-reply/auto-reply.service');
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

jest.mock('../../src/services/social/inbox/strategies/auto-reply/auto-reply.service', () => ({
  getSettings: jest.fn(),
  saveSettings: jest.fn()
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

  describe('INBOX_000 - _resolvePlatformPostId (regression: JSON platformPostId map used as a literal ID)', () => {
    it('should extract the real platform post ID from a JSON platformPostId map', () => {
      // A Facebook-only Post's platformPostId is stored as JSON
      // (see UpdatePostStatusStep), e.g. {"FACEBOOK":"1780531234_9998887777"}
      // — using the raw column value directly as a post's "id" treated this
      // JSON text itself as the ID, which never matched the real Facebook
      // post ID that synced comments are keyed by (relatedPostId).
      const post = {
        platformPostId: JSON.stringify({ FACEBOOK: '1780531234_9998887777' }),
        targetPlatforms: 'FACEBOOK'
      };
      expect(inboxService._resolvePlatformPostId(post)).toBe('1780531234_9998887777');
    });

    it('should pick the ID matching targetPlatforms when the map has multiple platforms', () => {
      const post = {
        platformPostId: JSON.stringify({ FACEBOOK: 'fb-post-1', INSTAGRAM: 'ig-post-1' }),
        targetPlatforms: 'INSTAGRAM'
      };
      expect(inboxService._resolvePlatformPostId(post)).toBe('ig-post-1');
    });

    it('should treat a legacy plain-string platformPostId (YouTube) as the ID directly', () => {
      const post = { platformPostId: 'dQw4w9WgXcQ', targetPlatforms: 'YOUTUBE' };
      expect(inboxService._resolvePlatformPostId(post)).toBe('dQw4w9WgXcQ');
    });

    it('should return null when platformPostId is not set', () => {
      expect(inboxService._resolvePlatformPostId({ platformPostId: null, targetPlatforms: 'FACEBOOK' })).toBeNull();
    });
  });

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

  });

  describe('INBOX_002b - getCommentsByPost', () => {
    it('should return the thread for every top-level comment on the post, not just the first', async () => {
      const commentA = {
        ...mockInboxItem,
        id: 'item-A',
        content: 'Bình luận đầu tiên',
        authorName: 'User A',
        relatedPostId: 'post-1',
        replies: []
      };
      const commentB = {
        ...mockInboxItem,
        id: 'item-B',
        content: 'Bình luận thứ hai',
        authorName: 'User B',
        relatedPostId: 'post-1',
        replies: []
      };
      const commentC = {
        ...mockInboxItem,
        id: 'item-C',
        content: 'Bình luận thứ ba',
        authorName: 'User C',
        relatedPostId: 'post-1',
        replies: []
      };

      inboxRepository.findManyAndCount.mockResolvedValue({
        items: [commentA, commentB, commentC],
        total: 3
      });

      // getConversationThread(item.id) re-fetches each item individually
      // via findById — mock all three so the flattened thread includes each.
      inboxRepository.findById.mockImplementation((id) => {
        return Promise.resolve([commentA, commentB, commentC].find(c => c.id === id));
      });
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue({
        platformAccountId: 'my-fb-page-id'
      });

      const result = await inboxService.getCommentsByPost('brand-abc', 'post-1');

      expect(result.data).toHaveLength(3);
      expect(result.thread).toHaveLength(3);
      expect(result.thread.map(t => t.author)).toEqual(['User A', 'User B', 'User C']);
    });

    it('should include each top-level comment together with its own replies', async () => {
      const commentA = {
        ...mockInboxItem,
        id: 'item-A',
        content: 'Bình luận đầu tiên',
        authorName: 'User A',
        relatedPostId: 'post-1',
        replies: [
          {
            id: 'reply-A1',
            content: 'Cảm ơn bạn đã quan tâm',
            authorName: 'PubliCast Agent',
            platformCreatedAt: new Date(),
            repliedByUserId: 'agent-1'
          }
        ]
      };
      const commentB = {
        ...mockInboxItem,
        id: 'item-B',
        content: 'Bình luận thứ hai',
        authorName: 'User B',
        relatedPostId: 'post-1',
        replies: []
      };

      inboxRepository.findManyAndCount.mockResolvedValue({
        items: [commentA, commentB],
        total: 2
      });
      inboxRepository.findById.mockImplementation((id) => {
        return Promise.resolve([commentA, commentB].find(c => c.id === id));
      });
      socialAccountRepository.findByBrandAndPlatformFirst.mockResolvedValue({
        platformAccountId: 'my-fb-page-id'
      });

      const result = await inboxService.getCommentsByPost('brand-abc', 'post-1');

      // commentA's own message + its 1 reply, then commentB's own message
      expect(result.thread).toHaveLength(3);
      expect(result.thread.map(t => t.author)).toEqual(['User A', 'PubliCast Agent', 'User B']);
    });

    it('should return empty data/thread when the post has no comments', async () => {
      inboxRepository.findManyAndCount.mockResolvedValue({ items: [], total: 0 });

      const result = await inboxService.getCommentsByPost('brand-abc', 'post-empty');

      expect(result.data).toEqual([]);
      expect(result.thread).toEqual([]);
      expect(result.videoContext).toBeNull();
    });
  });

  describe('INBOX_002c - getConversationThread edge cases', () => {
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
      inboxRepository.findById.mockResolvedValue(mockInboxItem);
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        inboxService.replyToItem('brand-abc', 'item-111', 'Xin chào bạn', 'stranger-user')
      ).rejects.toMatchObject({ status: 403 });
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
      // 4th arg is reply.socialAccountId, undefined on this mock item — see
      // multi-account-per-platform support in inbox.service.js#updateReply.
      expect(activeStrategy.updateReply).toHaveBeenCalledWith('brand-abc', 'fb_comment_456', 'Updated Content', undefined);
      expect(inboxRepository.updateInboxItem).toHaveBeenCalledWith('reply-123', { content: 'Updated Content' });
      expect(result.content).toBe('Updated Content');
    });

    it('should reject updating reply when caller has no access to brandId', async () => {
      inboxRepository.findById.mockResolvedValue({
        id: 'reply-123',
        platform: 'FACEBOOK',
        platformItemId: 'fb_comment_456',
        inbox: { brandId: 'brand-abc' }
      });
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        inboxService.updateReply('brand-abc', 'reply-123', 'Updated Content', 'stranger-user')
      ).rejects.toMatchObject({ status: 403 });
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
      expect(activeStrategy.deleteReply).toHaveBeenCalledWith('brand-abc', 'fb_comment_456', undefined);
      expect(inboxRepository.deleteInboxItem).toHaveBeenCalledWith('reply-123');
      expect(result).toBe(true);
    });

    it('should reject deleting reply when caller has no access to brandId', async () => {
      inboxRepository.findById.mockResolvedValue({
        id: 'reply-123',
        platform: 'FACEBOOK',
        platformItemId: 'fb_comment_456',
        inbox: { brandId: 'brand-abc' }
      });
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        inboxService.deleteReply('brand-abc', 'reply-123', 'stranger-user')
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('INBOX_007 - getAutoReplySettings & saveAutoReplySettings', () => {
    const mockSocialAccount = { id: 'sa-1', brandId: 'brand-abc' };

    it('should return settings when caller has access to the account brand', async () => {
      socialAccountRepository.findById.mockResolvedValue(mockSocialAccount);
      autoReplyService.getSettings.mockResolvedValue({ isActive: true, mode: 'KEYWORD' });

      const result = await inboxService.getAutoReplySettings('sa-1', 'user-1');

      expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('user-1', 'brand-abc');
      expect(result).toEqual({ isActive: true, mode: 'KEYWORD' });
    });

    it('should reject reading settings when caller has no access to the account brand', async () => {
      socialAccountRepository.findById.mockResolvedValue(mockSocialAccount);
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        inboxService.getAutoReplySettings('sa-1', 'stranger-user')
      ).rejects.toMatchObject({ status: 403 });
      expect(autoReplyService.getSettings).not.toHaveBeenCalled();
    });

    it('should throw 404 when the social account does not exist', async () => {
      socialAccountRepository.findById.mockResolvedValue(null);

      await expect(
        inboxService.getAutoReplySettings('missing-sa', 'user-1')
      ).rejects.toMatchObject({ status: 404 });
    });

    it('should save settings when caller has access to the account brand', async () => {
      socialAccountRepository.findById.mockResolvedValue(mockSocialAccount);
      autoReplyService.saveSettings.mockResolvedValue({ isActive: true, mode: 'AI' });

      const result = await inboxService.saveAutoReplySettings('sa-1', { isActive: true, mode: 'AI' }, 'user-1');

      expect(authorizationFacade.checkBrandAccess).toHaveBeenCalledWith('user-1', 'brand-abc');
      expect(autoReplyService.saveSettings).toHaveBeenCalledWith('sa-1', { isActive: true, mode: 'AI' });
      expect(result).toEqual({ isActive: true, mode: 'AI' });
    });

    it('should reject saving settings when caller has no access to the account brand', async () => {
      socialAccountRepository.findById.mockResolvedValue(mockSocialAccount);
      authorizationFacade.checkBrandAccess.mockResolvedValue(false);

      await expect(
        inboxService.saveAutoReplySettings('sa-1', { isActive: true }, 'stranger-user')
      ).rejects.toMatchObject({ status: 403 });
      expect(autoReplyService.saveSettings).not.toHaveBeenCalled();
    });
  });
});
