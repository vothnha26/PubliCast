const { PLATFORMS } = require('../../src/utils/constants');

describe('BlueskyInboxDisplayAdapter', () => {
  let BlueskyInboxDisplayAdapter, adapter, socialPlatformFactory;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../src/services/social/social-platform.factory', () => ({
      getService: jest.fn()
    }));
    socialPlatformFactory = require('../../src/services/social/social-platform.factory');
    BlueskyInboxDisplayAdapter = require('../../src/services/social/bluesky/inbox/bluesky-inbox-display.adapter');
    adapter = new BlueskyInboxDisplayAdapter();
  });

  afterEach(() => {
    jest.dontMock('../../src/services/social/social-platform.factory');
  });

  it('exposes the Bluesky platform and supports auto-reply', () => {
    expect(adapter.platform).toBe(PLATFORMS.BLUESKY);
    expect(adapter.supportsAutoReply()).toBe(true);
  });

  describe('buildPostUrl', () => {
    it('returns the bsky.app root for a falsy postId', () => {
      expect(adapter.buildPostUrl(null)).toBe('https://bsky.app');
    });

    it('passes through an already-absolute URL', () => {
      expect(adapter.buildPostUrl('https://bsky.app/profile/foo/post/bar')).toBe('https://bsky.app/profile/foo/post/bar');
    });

    it('converts an AT URI into a bsky.app profile/post URL', () => {
      const uri = 'at://did:plc:abc123/app.bsky.feed.post/xyz789';
      expect(adapter.buildPostUrl(uri)).toBe('https://bsky.app/profile/did:plc:abc123/post/xyz789');
    });

    it('falls back to the bsky.app root for an unrecognized AT URI shape', () => {
      expect(adapter.buildPostUrl('at://not-a-valid-uri')).toBe('https://bsky.app');
    });
  });

  describe('buildThumbnail', () => {
    it('prefers the tracked video thumbnail', () => {
      const result = adapter.buildThumbnail({}, {}, { thumbnailUrl: 'https://tracked.example/thumb.jpg' });
      expect(result).toBe('https://tracked.example/thumb.jpg');
    });

    it('uses the videoContext thumbnail when not from dicebear', () => {
      const result = adapter.buildThumbnail({ videoContext: { thumbnailUrl: 'https://real.example/thumb.jpg' } }, {}, null);
      expect(result).toBe('https://real.example/thumb.jpg');
    });

    it('ignores a dicebear placeholder thumbnail from videoContext', () => {
      const dbPost = { mediaUrls: ['https://media.example/fallback.jpg'] };
      const result = adapter.buildThumbnail({ videoContext: { thumbnailUrl: 'https://dicebear.com/x.svg' } }, dbPost, null);
      expect(result).toBe('https://media.example/fallback.jpg');
    });

    it('falls back to the first DB post media URL', () => {
      const dbPost = { mediaUrls: ['https://media.example/first.jpg', 'https://media.example/second.jpg'] };
      expect(adapter.buildThumbnail({}, dbPost, null)).toBe('https://media.example/first.jpg');
    });

    it('returns null when there is no thumbnail source', () => {
      expect(adapter.buildThumbnail({}, {}, null)).toBeNull();
    });
  });

  describe('fetchPlatformPosts', () => {
    it('normalizes posts fetched for each connected account concurrently', async () => {
      const service = {
        getPublishedVideos: jest.fn()
          .mockResolvedValueOnce({ data: [{ id: 'p1', text: 'hello world', likeCount: 3, replyCount: 1, createdAt: '2026-01-01' }] })
          .mockResolvedValueOnce({ data: [{ uri: 'at://p2', message: 'second post', likes: 5 }] })
      };
      socialPlatformFactory.getService.mockReturnValue(service);

      const posts = await adapter.fetchPlatformPosts('brand-1', ['acc-1', 'acc-2']);

      expect(service.getPublishedVideos).toHaveBeenCalledTimes(2);
      expect(posts).toHaveLength(2);
      expect(posts[0]).toMatchObject({ id: 'p1', title: 'hello world', likes: 3, comments: 1, socialAccountId: 'acc-1' });
      expect(posts[1]).toMatchObject({ id: 'at://p2', title: 'second post', likes: 5, socialAccountId: 'acc-2' });
    });

    it('skips accounts whose fetch rejected instead of throwing', async () => {
      const service = {
        getPublishedVideos: jest.fn()
          .mockResolvedValueOnce({ data: [{ id: 'p1' }] })
          .mockRejectedValueOnce(new Error('rate limited'))
      };
      socialPlatformFactory.getService.mockReturnValue(service);
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const posts = await adapter.fetchPlatformPosts('brand-1', ['acc-1', 'acc-2']);

      expect(posts).toHaveLength(1);
      expect(posts[0].id).toBe('p1');
    });

    it('fetches for a single unscoped account when no socialAccountIds are given', async () => {
      const service = { getPublishedVideos: jest.fn().mockResolvedValue({ data: [] }) };
      socialPlatformFactory.getService.mockReturnValue(service);

      await adapter.fetchPlatformPosts('brand-1');

      expect(service.getPublishedVideos).toHaveBeenCalledTimes(1);
      expect(service.getPublishedVideos).toHaveBeenCalledWith('brand-1', null, 50, null);
    });
  });
});

describe('BlueskyInboxSyncAdapter', () => {
  let BlueskyInboxSyncAdapter, adapter;
  let blueskyGateway, socialAuthFactory, inboxRepository, prisma;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../src/services/social/bluesky/bluesky.gateway', () => ({
      listNotifications: jest.fn(),
      getPostThread: jest.fn(),
      publishPost: jest.fn(),
      deletePost: jest.fn()
    }));
    jest.doMock('../../src/core/auth/social-auth.factory', () => ({
      getAuthClient: jest.fn()
    }));
    jest.doMock('../../src/repositories/social/inbox.repository', () => ({
      findOrCreateInbox: jest.fn(),
      findInboxItemByPlatformId: jest.fn(),
      createInboxItem: jest.fn()
    }));
    jest.doMock('../../src/config/prisma', () => ({
      inboxItem: { findFirst: jest.fn() },
      post: { findFirst: jest.fn() }
    }));

    blueskyGateway = require('../../src/services/social/bluesky/bluesky.gateway');
    socialAuthFactory = require('../../src/core/auth/social-auth.factory');
    inboxRepository = require('../../src/repositories/social/inbox.repository');
    prisma = require('../../src/config/prisma');
    BlueskyInboxSyncAdapter = require('../../src/services/social/bluesky/inbox/bluesky-inbox-sync.adapter');
    adapter = new BlueskyInboxSyncAdapter();
  });

  afterEach(() => {
    jest.dontMock('../../src/services/social/bluesky/bluesky.gateway');
    jest.dontMock('../../src/core/auth/social-auth.factory');
    jest.dontMock('../../src/repositories/social/inbox.repository');
    jest.dontMock('../../src/config/prisma');
  });

  describe('sync', () => {
    it('returns zero synced with an error when there is no auth client', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue(null);
      const result = await adapter.sync('brand-1', 'acc-1');
      expect(result).toEqual({ syncedCount: 0, errors: ['No auth client available'] });
    });

    it('returns zero synced with an error when the auth has no AT Protocol agent', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({ auth: {} });
      const result = await adapter.sync('brand-1', 'acc-1');
      expect(result).toEqual({ syncedCount: 0, errors: ['No active Bluesky AT Protocol agent'] });
    });

    it('counts replies extracted from reply/mention/quote notifications only', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({ auth: { agent: {} } });
      blueskyGateway.listNotifications.mockResolvedValue({
        notifications: [
          { reason: 'reply', uri: 'at://n1' },
          { reason: 'like', uri: 'at://n2' },
          { reason: 'mention', uri: 'at://n3' }
        ]
      });
      blueskyGateway.getPostThread.mockResolvedValue({
        $type: 'app.bsky.feed.defs#threadViewPost',
        post: { uri: 'at://post1' }
      });

      const result = await adapter.sync('brand-1', 'acc-1');

      expect(blueskyGateway.getPostThread).toHaveBeenCalledTimes(2);
      expect(result.syncedCount).toBe(2);
      expect(result.errors).toEqual([]);
    });

    it('keeps syncing other notifications when one thread fetch throws', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({ auth: { agent: {} } });
      blueskyGateway.listNotifications.mockResolvedValue({
        notifications: [{ reason: 'reply', uri: 'at://n1' }, { reason: 'reply', uri: 'at://n2' }]
      });
      blueskyGateway.getPostThread
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce({ $type: 'app.bsky.feed.defs#threadViewPost', post: { uri: 'at://post2' } });

      const result = await adapter.sync('brand-1', 'acc-1');

      expect(result.syncedCount).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('records an error when fetching notifications itself fails', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({ auth: { agent: {} } });
      blueskyGateway.listNotifications.mockRejectedValue(new Error('network down'));

      const result = await adapter.sync('brand-1', 'acc-1');

      expect(result.syncedCount).toBe(0);
      expect(result.errors).toEqual(['Notifications Sync Error: network down']);
    });
  });

  describe('_extractPostsFromThreadView', () => {
    it('collects the post from a single node', () => {
      const node = { post: { uri: 'at://p1' } };
      const results = adapter._extractPostsFromThreadView(node);
      expect(results).toEqual([{ uri: 'at://p1' }]);
    });

    it('walks both parent and replies recursively', () => {
      const node = {
        post: { uri: 'at://root' },
        parent: { post: { uri: 'at://parent' } },
        replies: [{ post: { uri: 'at://reply1' } }, { post: { uri: 'at://reply2' } }]
      };
      const results = adapter._extractPostsFromThreadView(node);
      const uris = results.map(p => p.uri);
      expect(uris).toEqual(expect.arrayContaining(['at://root', 'at://parent', 'at://reply1', 'at://reply2']));
      expect(uris).toHaveLength(4);
    });

    it('deduplicates posts with the same uri', () => {
      const node = {
        post: { uri: 'at://root' },
        replies: [{ post: { uri: 'at://root' } }]
      };
      const results = adapter._extractPostsFromThreadView(node);
      expect(results).toHaveLength(1);
    });

    it('skips notFound and blocked nodes without throwing', () => {
      const node = { $type: 'app.bsky.feed.defs#notFoundPost', notFound: true };
      expect(adapter._extractPostsFromThreadView(node)).toEqual([]);

      const blockedNode = { $type: 'app.bsky.feed.defs#blockedPost', blocked: true };
      expect(adapter._extractPostsFromThreadView(blockedNode)).toEqual([]);
    });

    it('returns the accumulator unchanged for a null/non-object node', () => {
      expect(adapter._extractPostsFromThreadView(null)).toEqual([]);
      expect(adapter._extractPostsFromThreadView(undefined, [{ uri: 'seed' }])).toEqual([{ uri: 'seed' }]);
    });
  });

  describe('syncPostComments', () => {
    it('returns an empty array when there is no auth client', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue(null);
      const result = await adapter.syncPostComments('brand-1', 'post-1', {});
      expect(result).toEqual([]);
    });

    it('returns an empty array when the resolved id is not an AT URI', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({ auth: { agent: {} } });
      prisma.inboxItem.findFirst.mockResolvedValue(null);
      prisma.post.findFirst.mockResolvedValue(null);

      const result = await adapter.syncPostComments('brand-1', 'not-a-uri', {});
      expect(result).toEqual([]);
    });

    it('extracts posts from the thread once the real AT URI is resolved', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({ auth: { agent: {} } });
      blueskyGateway.getPostThread.mockResolvedValue({
        $type: 'app.bsky.feed.defs#threadViewPost',
        post: { uri: 'at://did:plc:x/app.bsky.feed.post/y' }
      });

      const result = await adapter.syncPostComments('brand-1', 'at://did:plc:x/app.bsky.feed.post/y', {});

      expect(result).toEqual([{ uri: 'at://did:plc:x/app.bsky.feed.post/y' }]);
    });
  });

  describe('_resolveRealPlatformId', () => {
    it('returns the id unchanged when it is already an AT URI', async () => {
      const result = await adapter._resolveRealPlatformId('at://did:plc:x/app.bsky.feed.post/y');
      expect(result).toBe('at://did:plc:x/app.bsky.feed.post/y');
    });

    it('returns null for a falsy id', async () => {
      expect(await adapter._resolveRealPlatformId(null)).toBeNull();
    });

    it('resolves via InboxItem.platformItemId when found', async () => {
      prisma.inboxItem.findFirst.mockResolvedValue({ platformItemId: 'at://did:plc:x/app.bsky.feed.post/y' });
      const result = await adapter._resolveRealPlatformId('inbox-item-1');
      expect(result).toBe('at://did:plc:x/app.bsky.feed.post/y');
    });

    it('falls back to Post.platformPostId when InboxItem lookup misses', async () => {
      prisma.inboxItem.findFirst.mockResolvedValue(null);
      prisma.post.findFirst.mockResolvedValue({ platformPostId: 'at://did:plc:x/app.bsky.feed.post/y' });
      const result = await adapter._resolveRealPlatformId('post-1');
      expect(result).toBe('at://did:plc:x/app.bsky.feed.post/y');
    });

    it('extracts an embedded AT URI from a platformPostId that contains extra text', async () => {
      prisma.inboxItem.findFirst.mockResolvedValue(null);
      prisma.post.findFirst.mockResolvedValue({ platformPostId: '{"uri":"at://did:plc:x/app.bsky.feed.post/y"}' });
      const result = await adapter._resolveRealPlatformId('post-1');
      expect(result).toBe('at://did:plc:x/app.bsky.feed.post/y');
    });

    it('returns null when neither lookup finds an AT URI', async () => {
      prisma.inboxItem.findFirst.mockResolvedValue(null);
      prisma.post.findFirst.mockResolvedValue(null);
      const result = await adapter._resolveRealPlatformId('unknown-id');
      expect(result).toBeNull();
    });

    it('tolerates DB lookup errors and still returns null', async () => {
      prisma.inboxItem.findFirst.mockRejectedValue(new Error('db down'));
      prisma.post.findFirst.mockRejectedValue(new Error('db down'));
      const result = await adapter._resolveRealPlatformId('unknown-id');
      expect(result).toBeNull();
    });
  });

  describe('deleteReply', () => {
    it('throws when there is no auth client', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue(null);
      await expect(adapter.deleteReply('brand-1', 'item-1')).rejects.toThrow('Bluesky account authentication failed');
    });

    it('throws when there is no active agent', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({ auth: {} });
      await expect(adapter.deleteReply('brand-1', 'at://item-1')).rejects.toThrow('No active Bluesky AT Protocol agent');
    });

    it('deletes using the resolved real platform id', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({ auth: { agent: { id: 'agent-1' } } });
      blueskyGateway.deletePost.mockResolvedValue({ success: true });

      const result = await adapter.deleteReply('brand-1', 'at://did:plc:x/app.bsky.feed.post/y');

      expect(blueskyGateway.deletePost).toHaveBeenCalledWith({ id: 'agent-1' }, 'at://did:plc:x/app.bsky.feed.post/y');
      expect(result).toEqual({ success: true });
    });
  });

  describe('reply', () => {
    it('delegates to createComment with the same arguments', async () => {
      const spy = jest.spyOn(adapter, 'createComment').mockResolvedValue({ id: 'new-item' });
      const result = await adapter.reply('brand-1', 'parent-1', 'hello', 'acc-1', 'https://media/x.png');
      expect(spy).toHaveBeenCalledWith('brand-1', 'parent-1', 'hello', 'acc-1', 'https://media/x.png');
      expect(result).toEqual({ id: 'new-item' });
    });
  });

  describe('createComment', () => {
    it('throws when there is no auth client', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue(null);
      await expect(adapter.createComment('brand-1', 'post-1', 'hi')).rejects.toThrow('Bluesky account authentication failed');
    });

    it('throws when there is no active agent', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({ auth: {}, account: {} });
      await expect(adapter.createComment('brand-1', 'post-1', 'hi')).rejects.toThrow('No active Bluesky AT Protocol agent');
    });

    it('publishes the post and stores the resulting inbox item', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({
        auth: { agent: {} },
        account: { platformAccountId: 'did:plc:acc', displayName: 'My Brand' }
      });
      prisma.inboxItem.findFirst.mockResolvedValue(null);
      prisma.post.findFirst.mockResolvedValue(null);
      blueskyGateway.publishPost.mockResolvedValue({ uri: 'at://new-post' });
      inboxRepository.findOrCreateInbox.mockResolvedValue({ id: 'inbox-1' });
      inboxRepository.findInboxItemByPlatformId.mockResolvedValue(null);
      inboxRepository.createInboxItem.mockResolvedValue({ id: 'item-1' });

      const result = await adapter.createComment('brand-1', 'top-level-post', 'hello world');

      expect(blueskyGateway.publishPost).toHaveBeenCalledWith({}, { text: 'hello world', replyTo: undefined });
      expect(inboxRepository.createInboxItem).toHaveBeenCalledWith(expect.objectContaining({
        platform: PLATFORMS.BLUESKY,
        content: 'hello world',
        authorId: 'did:plc:acc'
      }));
      expect(result).toEqual({ id: 'item-1' });
    });

    it('resolves reply root/parent refs when replying to an existing AT URI post', async () => {
      socialAuthFactory.getAuthClient.mockResolvedValue({
        auth: { agent: {} },
        account: { platformAccountId: 'did:plc:acc' }
      });
      blueskyGateway.getPostThread.mockResolvedValue({
        post: {
          uri: 'at://did:plc:x/app.bsky.feed.post/parent',
          cid: 'cid-parent',
          record: { reply: { root: { uri: 'at://root', cid: 'cid-root' } } }
        }
      });
      blueskyGateway.publishPost.mockResolvedValue({ uri: 'at://reply-post' });
      inboxRepository.findOrCreateInbox.mockResolvedValue({ id: 'inbox-1' });
      inboxRepository.findInboxItemByPlatformId.mockResolvedValue(null);
      inboxRepository.createInboxItem.mockResolvedValue({ id: 'item-2' });

      await adapter.createComment('brand-1', 'at://did:plc:x/app.bsky.feed.post/parent', 'a reply');

      expect(blueskyGateway.publishPost).toHaveBeenCalledWith({}, {
        text: 'a reply',
        replyTo: {
          root: { uri: 'at://root', cid: 'cid-root' },
          parent: { uri: 'at://did:plc:x/app.bsky.feed.post/parent', cid: 'cid-parent' }
        }
      });
    });
  });
});
