const { PLATFORMS } = require('../../src/utils/constants');

describe('FacebookInboxDisplayAdapter', () => {
  let FacebookInboxDisplayAdapter, adapter, socialPlatformFactory;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../src/services/social/social-platform.factory', () => ({ getService: jest.fn() }));
    socialPlatformFactory = require('../../src/services/social/social-platform.factory');
    FacebookInboxDisplayAdapter = require('../../src/services/social/facebook/inbox/facebook-inbox-display.adapter');
    adapter = new FacebookInboxDisplayAdapter();
  });

  afterEach(() => jest.dontMock('../../src/services/social/social-platform.factory'));

  it('exposes the Facebook platform and supports auto-reply', () => {
    expect(adapter.platform).toBe(PLATFORMS.FACEBOOK);
    expect(adapter.supportsAutoReply()).toBe(true);
  });

  describe('buildPostUrl', () => {
    it('builds a facebook.com URL from a postId', () => {
      expect(adapter.buildPostUrl('12345')).toBe('https://www.facebook.com/12345');
    });

    it('returns null for a falsy postId', () => {
      expect(adapter.buildPostUrl(null)).toBeNull();
    });
  });

  describe('buildThumbnail', () => {
    it('prefers the tracked video thumbnail', () => {
      expect(adapter.buildThumbnail({}, {}, { thumbnailUrl: 'https://t.example/x.jpg' })).toBe('https://t.example/x.jpg');
    });

    it('ignores a dicebear placeholder from videoContext', () => {
      const dbPost = { mediaUrls: ['https://media.example/fallback.jpg'] };
      const result = adapter.buildThumbnail({ videoContext: { thumbnailUrl: 'https://dicebear.com/x.svg' } }, dbPost, null);
      expect(result).toBe('https://media.example/fallback.jpg');
    });

    it('returns null when there is no thumbnail source', () => {
      expect(adapter.buildThumbnail({}, {}, null)).toBeNull();
    });
  });

  describe('fetchPlatformPosts', () => {
    it('normalizes reactions/comments/shares from nested summary objects', async () => {
      const service = {
        getPublishedVideos: jest.fn().mockResolvedValue({
          data: [{
            id: 'post-1',
            message: 'Hello world',
            reactions: { summary: { total_count: 12 } },
            comments: { summary: { total_count: 3 } },
            shares: { count: 2 },
            video_views: 100
          }]
        })
      };
      socialPlatformFactory.getService.mockReturnValue(service);

      const posts = await adapter.fetchPlatformPosts('brand-1', ['acc-1']);

      expect(posts[0]).toMatchObject({ id: 'post-1', likes: 12, comments: 3, shares: 2, views: 100, title: 'Hello world' });
    });

    it('falls back to flat numeric fields when summaries are absent', async () => {
      const service = {
        getPublishedVideos: jest.fn().mockResolvedValue({ data: [{ id: 'post-2', reactions: 5, comments: 1, shares: 0 }] })
      };
      socialPlatformFactory.getService.mockReturnValue(service);

      const posts = await adapter.fetchPlatformPosts('brand-1', ['acc-1']);

      expect(posts[0]).toMatchObject({ likes: 5, comments: 1, shares: 0 });
    });

    it('skips accounts whose fetch rejected', async () => {
      const service = {
        getPublishedVideos: jest.fn()
          .mockResolvedValueOnce({ data: [{ id: 'p1' }] })
          .mockRejectedValueOnce(new Error('down'))
      };
      socialPlatformFactory.getService.mockReturnValue(service);
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const posts = await adapter.fetchPlatformPosts('brand-1', ['acc-1', 'acc-2']);

      expect(posts).toHaveLength(1);
    });
  });
});

describe('FacebookInboxSyncAdapter', () => {
  let FacebookInboxSyncAdapter, adapter;
  let facebookGateway, socialAccountRepository, inboxRepository, commentUtil;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../src/services/social/facebook/facebook.gateway', () => ({
      getPageFeed: jest.fn(),
      getPostComments: jest.fn(),
      replyToComment: jest.fn(),
      createComment: jest.fn(),
      updateComment: jest.fn(),
      deleteComment: jest.fn()
    }));
    jest.doMock('../../src/repositories/social/social-account.repository', () => ({
      findByBrandAndPlatform: jest.fn()
    }));
    jest.doMock('../../src/repositories/social/inbox.repository', () => ({
      findOrCreateInbox: jest.fn(),
      findInboxItemByPlatformId: jest.fn(),
      createInboxItem: jest.fn()
    }));
    jest.doMock('../../src/services/social/facebook/facebook-comment.util', () => ({
      filterRealAccount: jest.fn(),
      processComment: jest.fn(),
      processReplies: jest.fn()
    }));

    facebookGateway = require('../../src/services/social/facebook/facebook.gateway');
    socialAccountRepository = require('../../src/repositories/social/social-account.repository');
    inboxRepository = require('../../src/repositories/social/inbox.repository');
    commentUtil = require('../../src/services/social/facebook/facebook-comment.util');
    FacebookInboxSyncAdapter = require('../../src/services/social/facebook/inbox/facebook-inbox-sync.adapter');
    adapter = new FacebookInboxSyncAdapter();
  });

  afterEach(() => {
    jest.dontMock('../../src/services/social/facebook/facebook.gateway');
    jest.dontMock('../../src/repositories/social/social-account.repository');
    jest.dontMock('../../src/repositories/social/inbox.repository');
    jest.dontMock('../../src/services/social/facebook/facebook-comment.util');
  });

  describe('_getAccountAndAuth', () => {
    it('throws when no account is connected for the brand', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([]);
      commentUtil.filterRealAccount.mockReturnValue(null);
      await expect(adapter._getAccountAndAuth('brand-1')).rejects.toThrow('Facebook account not connected');
    });

    it('prefers the account matching a given socialAccountId over filterRealAccount', async () => {
      const accounts = [
        { id: 'acc-1', platformAccountId: 'page-1', accessToken: 'tok-1' },
        { id: 'acc-2', platformAccountId: 'page-2', accessToken: 'tok-2' }
      ];
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue(accounts);

      const result = await adapter._getAccountAndAuth('brand-1', 'acc-2');

      expect(result.pageId).toBe('page-2');
      expect(result.pageAccessToken).toBe('tok-2');
      expect(commentUtil.filterRealAccount).not.toHaveBeenCalled();
    });

    it('falls back to filterRealAccount when no socialAccountId is given', async () => {
      const accounts = [{ id: 'acc-1', platformAccountId: 'page-1', accessToken: 'tok-1' }];
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue(accounts);
      commentUtil.filterRealAccount.mockReturnValue(accounts[0]);

      const result = await adapter._getAccountAndAuth('brand-1');

      expect(result.pageId).toBe('page-1');
    });
  });

  describe('sync', () => {
    it('walks feed posts and their comments, flattening replies', async () => {
      commentUtil.filterRealAccount.mockReturnValue({ id: 'acc-1', platformAccountId: 'page-1', accessToken: 'tok-1' });
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'acc-1', platformAccountId: 'page-1', accessToken: 'tok-1' }]);
      facebookGateway.getPageFeed.mockResolvedValue({ data: [{ id: 'post-1' }] });
      facebookGateway.getPostComments.mockResolvedValue([
        { id: 'c1', comments: { data: [{ id: 'r1' }] } }
      ]);
      commentUtil.processComment.mockResolvedValue({ id: 'item-1' });

      const result = await adapter.sync('brand-1', { id: 'inbox-1' });

      expect(commentUtil.processComment).toHaveBeenCalledWith({ id: 'c1', comments: { data: [{ id: 'r1' }] } }, 'post-1', expect.any(Object), { id: 'inbox-1' });
      expect(commentUtil.processReplies).toHaveBeenCalledWith([{ id: 'r1' }], 'item-1', 'post-1', expect.any(Object), { id: 'inbox-1' });
      expect(result).toEqual([{ id: 'item-1' }]);
    });

    it('returns an empty array when the feed has no posts', async () => {
      commentUtil.filterRealAccount.mockReturnValue({ id: 'acc-1', platformAccountId: 'page-1', accessToken: 'tok-1' });
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'acc-1' }]);
      facebookGateway.getPageFeed.mockResolvedValue({ data: [] });

      const result = await adapter.sync('brand-1', {});
      expect(result).toEqual([]);
    });
  });

  describe('syncPostComments', () => {
    it('returns an empty array immediately for a falsy postId', async () => {
      const result = await adapter.syncPostComments('brand-1', null, {});
      expect(result).toEqual([]);
      expect(socialAccountRepository.findByBrandAndPlatform).not.toHaveBeenCalled();
    });

    it('swallows errors and returns whatever was collected so far', async () => {
      socialAccountRepository.findByBrandAndPlatform.mockRejectedValue(new Error('db down'));
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await adapter.syncPostComments('brand-1', 'post-1', {});

      expect(result).toEqual([]);
    });

    it('processes comments and their nested replies for the given post', async () => {
      commentUtil.filterRealAccount.mockReturnValue({ id: 'acc-1', platformAccountId: 'page-1', accessToken: 'tok-1' });
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'acc-1' }]);
      facebookGateway.getPostComments.mockResolvedValue([{ id: 'c1', comments: { data: [{ id: 'r1' }] } }]);
      commentUtil.processComment.mockResolvedValue({ id: 'item-1' });

      const result = await adapter.syncPostComments('brand-1', 'post-1', {});

      expect(result).toEqual([{ id: 'item-1' }]);
      expect(commentUtil.processReplies).toHaveBeenCalled();
    });
  });

  describe('reply', () => {
    it('creates an inbox item linked to the parent when it exists in the DB', async () => {
      commentUtil.filterRealAccount.mockReturnValue({ id: 'acc-1', platformAccountId: 'page-1', accessToken: 'tok-1', displayName: 'My Page' });
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'acc-1' }]);
      facebookGateway.replyToComment.mockResolvedValue({ id: 'reply-1' });
      inboxRepository.findOrCreateInbox.mockResolvedValue({ id: 'inbox-1' });
      inboxRepository.findInboxItemByPlatformId.mockResolvedValue({ id: 'parent-item-1', relatedPostId: 'post-1' });
      inboxRepository.createInboxItem.mockResolvedValue({ id: 'new-item' });

      const result = await adapter.reply('brand-1', 'comment-1', 'hi there');

      expect(facebookGateway.replyToComment).toHaveBeenCalledWith('comment-1', 'hi there', 'tok-1', null);
      expect(inboxRepository.createInboxItem).toHaveBeenCalledWith(expect.objectContaining({
        platformItemId: 'reply-1',
        parentItemId: 'parent-item-1',
        relatedPostId: 'post-1'
      }));
      expect(result).toEqual({ id: 'new-item' });
    });
  });

  describe('createComment', () => {
    it('creates a top-level inbox item for the post', async () => {
      commentUtil.filterRealAccount.mockReturnValue({ id: 'acc-1', platformAccountId: 'page-1', accessToken: 'tok-1' });
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'acc-1' }]);
      facebookGateway.createComment.mockResolvedValue({ id: 'new-comment-1' });
      inboxRepository.findOrCreateInbox.mockResolvedValue({ id: 'inbox-1' });
      inboxRepository.createInboxItem.mockResolvedValue({ id: 'new-item' });

      const result = await adapter.createComment('brand-1', 'post-1', 'first comment');

      expect(facebookGateway.createComment).toHaveBeenCalledWith('post-1', 'first comment', 'tok-1', null);
      expect(inboxRepository.createInboxItem).toHaveBeenCalledWith(expect.objectContaining({
        platformItemId: 'new-comment-1',
        relatedPostId: 'post-1'
      }));
      expect(result).toEqual({ id: 'new-item' });
    });
  });

  describe('updateReply / deleteReply', () => {
    it('delegates updateReply to the gateway', async () => {
      commentUtil.filterRealAccount.mockReturnValue({ id: 'acc-1', accessToken: 'tok-1' });
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'acc-1' }]);
      facebookGateway.updateComment.mockResolvedValue({ success: true });

      const result = await adapter.updateReply('brand-1', 'comment-1', 'edited text');

      expect(facebookGateway.updateComment).toHaveBeenCalledWith('comment-1', 'edited text', 'tok-1');
      expect(result).toEqual({ success: true });
    });

    it('delegates deleteReply to the gateway', async () => {
      commentUtil.filterRealAccount.mockReturnValue({ id: 'acc-1', accessToken: 'tok-1' });
      socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([{ id: 'acc-1' }]);
      facebookGateway.deleteComment.mockResolvedValue({ success: true });

      const result = await adapter.deleteReply('brand-1', 'comment-1');

      expect(facebookGateway.deleteComment).toHaveBeenCalledWith('comment-1', 'tok-1');
      expect(result).toEqual({ success: true });
    });
  });
});
