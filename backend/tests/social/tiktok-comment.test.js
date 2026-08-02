const tiktokGateway = require('../../src/services/social/tiktok/tiktok.gateway');
const tiktokCommentService = require('../../src/services/social/tiktok/tiktok-comment.service');

describe('TikTok Research Video Comments API Integration', () => {
  describe('TikTokGateway.getVideoComments', () => {
    it('should throw an error if neither videoId nor commentId is provided', async () => {
      await expect(
        tiktokGateway.getVideoComments('mock-token', {})
      ).rejects.toThrow('Either videoId or commentId must be provided');
    });

    it('should format request body correctly with video_id', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            comments: [
              {
                id: 101,
                video_id: 12345678901,
                text: "Awesome clip!",
                like_count: 8,
                reply_count: 1,
                parent_comment_id: 0,
                create_time: 1680000000,
                display_name: "TikTok Creator"
              }
            ],
            cursor: 10,
            has_more: false
          }
        })
      });

      global.fetch = mockFetch;

      const res = await tiktokGateway.getVideoComments('test-token', {
        videoId: '12345678901',
        maxCount: 20,
        cursor: 0
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain('/v2/research/video/comment/list/');
      expect(callArgs[1].headers['Authorization']).toBe('Bearer test-token');
      expect(callArgs[1].headers['Content-Type']).toBe('application/json');

      const parsedBody = JSON.parse(callArgs[1].body);
      expect(parsedBody.video_id).toBe(12345678901);
      expect(parsedBody.max_count).toBe(20);
      expect(parsedBody.cursor).toBe(0);

      expect(res.comments).toHaveLength(1);
      expect(res.comments[0].text).toBe("Awesome clip!");
    });
  });

  describe('TikTokCommentService.getVideoComments', () => {
    it('should return mock comments for mock accounts', async () => {
      const res = await tiktokCommentService.getVideoComments('test-brand', {
        videoId: '12345678901',
        socialAccountId: 'mock-account-id'
      });

      expect(res.comments).toBeDefined();
      expect(res.comments.length).toBeGreaterThan(0);
      expect(res.comments[0].platform).toBe('TIKTOK');
      expect(res.comments[0].text).toContain('TikTok content');
    });

    it('should format raw TikTok comments correctly into PubliCast comment schema', () => {
      const rawComments = [
        {
          id: 999,
          video_id: 8888,
          parent_comment_id: 0,
          text: "Love this video!",
          like_count: 15,
          reply_count: 3,
          display_name: "User123",
          create_time: 1700000000
        }
      ];

      const formatted = tiktokCommentService._formatComments(rawComments);
      expect(formatted).toEqual([
        {
          id: "999",
          videoId: "8888",
          parentCommentId: null,
          text: "Love this video!",
          likeCount: 15,
          replyCount: 3,
          authorName: "User123",
          createdAt: new Date(1700000000 * 1000).toISOString(),
          platform: "TIKTOK"
        }
      ]);
    });
  });
});
