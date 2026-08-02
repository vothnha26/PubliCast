const blueskyGateway = require('../../src/services/social/bluesky/bluesky.gateway');
const { blueskyService } = require('../../src/services/social/bluesky');

describe('Bluesky AT Protocol Thread & Comments API Integration', () => {
  describe('BlueskyGateway.getPostThread', () => {
    it('should throw an error if uri is missing', async () => {
      await expect(
        blueskyGateway.getPostThread({}, {})
      ).rejects.toThrow('Post URI is required');
    });

    it('should call agent.getPostThread with uri, depth, and parentHeight', async () => {
      const mockAgent = {
        getPostThread: jest.fn().mockResolvedValue({
          data: {
            thread: {
              $type: 'app.bsky.feed.defs#threadViewPost',
              post: {
                uri: 'at://did:plc:123/app.bsky.feed.post/456',
                cid: 'cid-root',
                record: { text: 'Root post text' },
                author: { handle: 'author.bsky.social', displayName: 'Root Author' },
                likeCount: 10,
                replyCount: 2
              },
              replies: []
            }
          }
        })
      };

      const thread = await blueskyGateway.getPostThread(mockAgent, {
        uri: 'at://did:plc:123/app.bsky.feed.post/456',
        depth: 4,
        parentHeight: 10
      });

      expect(mockAgent.getPostThread).toHaveBeenCalledWith({
        uri: 'at://did:plc:123/app.bsky.feed.post/456',
        depth: 4,
        parentHeight: 10
      });
      expect(thread.$type).toBe('app.bsky.feed.defs#threadViewPost');
    });
  });

  describe('BlueskyService.getPostComments', () => {
    it('should return mock comments for mock account IDs', async () => {
      const res = await blueskyService.getPostComments('test-brand', {
        uri: 'at://did:plc:mock/app.bsky.feed.post/100',
        socialAccountId: 'mock-bluesky-acc'
      });

      expect(res.comments).toBeDefined();
      expect(res.comments.length).toBeGreaterThan(0);
      expect(res.comments[0].platform).toBe('BLUESKY');
      expect(res.comments[0].text).toContain('AT Protocol');
    });

    it('should recursively extract nested replies and format into PubliCast comment schema', () => {
      const threadNode = {
        $type: 'app.bsky.feed.defs#threadViewPost',
        post: {
          uri: 'at://did:plc:root/app.bsky.feed.post/1',
          cid: 'cid-1'
        },
        replies: [
          {
            $type: 'app.bsky.feed.defs#threadViewPost',
            post: {
              uri: 'at://did:plc:user1/app.bsky.feed.post/reply1',
              cid: 'cid-reply1',
              record: { text: 'First reply', createdAt: '2026-08-02T10:00:00Z' },
              author: { displayName: 'User One', handle: 'user1.bsky.social', avatar: 'https://avatar.png' },
              likeCount: 3,
              replyCount: 1,
              repostCount: 0
            },
            replies: [
              {
                $type: 'app.bsky.feed.defs#threadViewPost',
                post: {
                  uri: 'at://did:plc:user2/app.bsky.feed.post/nested1',
                  cid: 'cid-nested1',
                  record: { text: 'Nested reply to user1', createdAt: '2026-08-02T10:05:00Z' },
                  author: { displayName: 'User Two', handle: 'user2.bsky.social' },
                  likeCount: 1,
                  replyCount: 0,
                  repostCount: 0
                },
                replies: []
              }
            ]
          },
          {
            $type: 'app.bsky.feed.defs#notFoundPost',
            notFound: true
          }
        ]
      };

      const comments = [];
      blueskyService._extractThreadReplies(threadNode, comments);

      expect(comments).toHaveLength(2);
      expect(comments[0]).toMatchObject({
        id: 'at://did:plc:user1/app.bsky.feed.post/reply1',
        text: 'First reply',
        authorName: 'User One',
        authorHandle: 'user1.bsky.social',
        likeCount: 3,
        replyCount: 1,
        platform: 'BLUESKY'
      });

      expect(comments[1]).toMatchObject({
        id: 'at://did:plc:user2/app.bsky.feed.post/nested1',
        parentCommentId: 'at://did:plc:user1/app.bsky.feed.post/reply1',
        text: 'Nested reply to user1',
        authorName: 'User Two',
        platform: 'BLUESKY'
      });
    });
    it('should throw IDOR error if socialAccountId does not belong to requested brandId', async () => {
      const socialAccountRepository = require('../../src/repositories/social/social-account.repository');
      jest.spyOn(socialAccountRepository, 'findById').mockResolvedValueOnce({
        id: 'acc-other-brand',
        brandId: 'brand-B',
        platform: 'BLUESKY'
      });

      await expect(
        blueskyService._getAccount('brand-A', 'acc-other-brand')
      ).rejects.toThrow('Social account does not belong to this brand');
    });
  });
});
