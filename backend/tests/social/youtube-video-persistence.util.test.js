const videoPersistenceUtil = require('../../src/services/social/youtube/youtube-video-persistence.util');
const prisma = require('../../src/config/prisma');

jest.mock('../../src/config/prisma', () => ({
  post: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  postTarget: {
    upsert: jest.fn()
  },
  brand: {
    findUnique: jest.fn()
  }
}));

describe('youtube-video-persistence.util', () => {
  const brandId = 'brand-123';
  const socialAccountId = 'acc-123';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.brand.findUnique.mockResolvedValue({ ownerId: 'user-owner-1' });
  });

  describe('upsertPublishedVideosToDb', () => {
    const video = {
      id: 'v-1',
      title: 'My Video',
      description: 'Desc',
      thumbnailUrl: 'http://thumb',
      publishedAt: '2026-01-01T00:00:00.000Z'
    };

    it('creates a new PostTarget when a socialAccountId is provided for a newly-created post', async () => {
      prisma.post.findFirst.mockResolvedValue(null);
      prisma.post.create.mockResolvedValue({ id: 'post-1' });

      await videoPersistenceUtil.upsertPublishedVideosToDb(brandId, [video], socialAccountId);

      expect(prisma.post.create).toHaveBeenCalled();
      expect(prisma.postTarget.upsert).toHaveBeenCalledWith({
        where: { postId_socialAccountId: { postId: 'post-1', socialAccountId } },
        update: {},
        create: {
          postId: 'post-1',
          socialAccountId,
          platform: 'YOUTUBE',
          publishStatus: 'PUBLISHED',
          publishedAt: expect.any(Date)
        }
      });
    });

    it('creates a PostTarget for an already-existing post being updated', async () => {
      prisma.post.findFirst.mockResolvedValue({ id: 'post-existing', title: 'Old', caption: '', mediaThumbnailUrls: '', publishedAt: null });
      prisma.post.update.mockResolvedValue({ id: 'post-existing' });

      await videoPersistenceUtil.upsertPublishedVideosToDb(brandId, [video], socialAccountId);

      expect(prisma.post.update).toHaveBeenCalled();
      expect(prisma.postTarget.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { postId_socialAccountId: { postId: 'post-existing', socialAccountId } }
      }));
    });

    it('does not write a PostTarget when socialAccountId is omitted', async () => {
      prisma.post.findFirst.mockResolvedValue(null);
      prisma.post.create.mockResolvedValue({ id: 'post-1' });

      await videoPersistenceUtil.upsertPublishedVideosToDb(brandId, [video]);

      expect(prisma.postTarget.upsert).not.toHaveBeenCalled();
    });

    it('isolates one video failure from the rest of the batch', async () => {
      const video2 = { ...video, id: 'v-2' };
      prisma.post.findFirst
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValueOnce(null);
      prisma.post.create.mockResolvedValue({ id: 'post-2' });

      await videoPersistenceUtil.upsertPublishedVideosToDb(brandId, [video, video2], socialAccountId);

      expect(prisma.postTarget.upsert).toHaveBeenCalledTimes(1);
      expect(prisma.postTarget.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { postId_socialAccountId: { postId: 'post-2', socialAccountId } }
      }));
    });

    it('no-ops when the brand has no ownerId', async () => {
      prisma.brand.findUnique.mockResolvedValue(null);

      await videoPersistenceUtil.upsertPublishedVideosToDb(brandId, [video], socialAccountId);

      expect(prisma.post.findFirst).not.toHaveBeenCalled();
      expect(prisma.postTarget.upsert).not.toHaveBeenCalled();
    });
  });

  describe('formatVideoList', () => {
    it('excludes private videos and maps expected fields', () => {
      const items = [
        {
          id: 'v-1',
          snippet: { title: 'Public', thumbnails: { default: { url: 'u1' } }, publishedAt: '2026-01-01' },
          statistics: { viewCount: '10', likeCount: '2', commentCount: '1' },
          status: { privacyStatus: 'public' }
        },
        {
          id: 'v-2',
          snippet: { title: 'Private', thumbnails: { default: { url: 'u2' } }, publishedAt: '2026-01-02' },
          statistics: {},
          status: { privacyStatus: 'private' }
        }
      ];

      const result = videoPersistenceUtil.formatVideoList(items);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('v-1');
    });
  });

});
