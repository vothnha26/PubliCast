jest.mock('../../src/config/prisma', () => ({
  feedSource: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  feedEntry: {
    findMany: jest.fn(),
    createMany: jest.fn()
  }
}));

const mockParseURL = jest.fn();
jest.mock('rss-parser', () => {
  return jest.fn().mockImplementation(() => ({
    parseURL: mockParseURL
  }));
});

const prisma = require('../../src/config/prisma');
const feedService = require('../../src/services/workspace/feed.service');

describe('feed.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listFeedSources', () => {
    it('queries both the brand\'s own feeds and system feeds', async () => {
      prisma.feedSource.findMany.mockResolvedValue([]);

      await feedService.listFeedSources('brand-1');

      expect(prisma.feedSource.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { OR: [{ brandId: 'brand-1' }, { isSystem: true }] }
      }));
    });
  });

  describe('createCustomFeedSource', () => {
    it('throws a 400 when url is missing', async () => {
      await expect(feedService.createCustomFeedSource('brand-1', { name: 'My Feed', url: '  ' }))
        .rejects.toMatchObject({ status: 400 });
      expect(prisma.feedSource.create).not.toHaveBeenCalled();
    });

    it('creates a non-system feed scoped to the brand and refreshes it', async () => {
      prisma.feedSource.create.mockResolvedValue({ id: 'feed-1', brandId: 'brand-1', url: 'https://example.com/rss' });
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://example.com/rss' });
      mockParseURL.mockResolvedValue({ items: [] });

      const result = await feedService.createCustomFeedSource('brand-1', { name: 'My Feed', url: 'https://example.com/rss', category: 'Tech' });

      expect(prisma.feedSource.create).toHaveBeenCalledWith({
        data: { brandId: 'brand-1', name: 'My Feed', url: 'https://example.com/rss', category: 'Tech', isSystem: false }
      });
      expect(result.id).toBe('feed-1');
    });

    it('falls back to the URL as the name when none is given', async () => {
      prisma.feedSource.create.mockResolvedValue({ id: 'feed-1' });
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://example.com/rss' });
      mockParseURL.mockResolvedValue({ items: [] });

      await feedService.createCustomFeedSource('brand-1', { url: 'https://example.com/rss' });

      expect(prisma.feedSource.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'https://example.com/rss' })
      }));
    });

    it('does not propagate a refresh failure when creating a feed', async () => {
      prisma.feedSource.create.mockResolvedValue({ id: 'feed-1' });
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://bad-feed.example.com' });
      mockParseURL.mockRejectedValue(new Error('network error'));

      await expect(feedService.createCustomFeedSource('brand-1', { url: 'https://bad-feed.example.com' }))
        .resolves.toMatchObject({ id: 'feed-1' });
    });
  });

  describe('deleteFeedSource', () => {
    it('throws 404 when the feed does not belong to the brand (IDOR guard)', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', brandId: 'brand-victim' });

      await expect(feedService.deleteFeedSource('feed-1', 'attacker-brand'))
        .rejects.toMatchObject({ status: 404 });
      expect(prisma.feedSource.delete).not.toHaveBeenCalled();
    });

    it('throws 404 when the feed does not exist', async () => {
      prisma.feedSource.findUnique.mockResolvedValue(null);

      await expect(feedService.deleteFeedSource('missing', 'brand-1'))
        .rejects.toMatchObject({ status: 404 });
    });

    it('deletes the feed when it belongs to the brand', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', brandId: 'brand-1' });

      await feedService.deleteFeedSource('feed-1', 'brand-1');

      expect(prisma.feedSource.delete).toHaveBeenCalledWith({ where: { id: 'feed-1' } });
    });

    it('cannot be used to delete a system feed via the brand-facing path', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', brandId: null, isSystem: true });

      await expect(feedService.deleteFeedSource('feed-1', 'brand-1'))
        .rejects.toMatchObject({ status: 404 });
      expect(prisma.feedSource.delete).not.toHaveBeenCalled();
    });
  });

  describe('refreshFeedSource', () => {
    it('returns added: 0 when the feed source no longer exists', async () => {
      prisma.feedSource.findUnique.mockResolvedValue(null);

      const result = await feedService.refreshFeedSource('missing');

      expect(result).toEqual({ added: 0 });
      expect(mockParseURL).not.toHaveBeenCalled();
    });

    it('parses the feed and inserts new entries, skipping duplicates', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://example.com/rss' });
      mockParseURL.mockResolvedValue({
        items: [
          { guid: 'guid-1', title: 'Post 1', link: 'https://example.com/1', isoDate: '2026-08-01T00:00:00.000Z', contentSnippet: 'Summary 1' },
          { link: 'https://example.com/2', title: 'Post 2' } // no guid -> falls back to link
        ]
      });
      prisma.feedEntry.createMany.mockResolvedValue({ count: 2 });

      const result = await feedService.refreshFeedSource('feed-1');

      expect(prisma.feedEntry.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ feedSourceId: 'feed-1', guid: 'guid-1', title: 'Post 1' }),
          expect.objectContaining({ feedSourceId: 'feed-1', guid: 'https://example.com/2', title: 'Post 2' })
        ],
        skipDuplicates: true
      });
      expect(result).toEqual({ added: 2 });
    });

    it('extracts image from media:thumbnail when there is no enclosure', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://example.com/rss' });
      mockParseURL.mockResolvedValue({
        items: [{
          guid: 'guid-1', title: 'Post 1', link: 'https://example.com/1',
          'media:thumbnail': { $: { url: 'https://example.com/thumb.jpg' } }
        }]
      });
      prisma.feedEntry.createMany.mockResolvedValue({ count: 1 });

      await feedService.refreshFeedSource('feed-1');

      expect(prisma.feedEntry.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ imageUrl: 'https://example.com/thumb.jpg' })],
        skipDuplicates: true
      });
    });

    it('falls back to the first <img> in content:encoded when no image field exists', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://example.com/rss' });
      mockParseURL.mockResolvedValue({
        items: [{
          guid: 'guid-1', title: 'Post 1', link: 'https://example.com/1',
          'content:encoded': '<figure><img alt="x" src="https://example.com/embedded.jpg" width="800"></figure>'
        }]
      });
      prisma.feedEntry.createMany.mockResolvedValue({ count: 1 });

      await feedService.refreshFeedSource('feed-1');

      expect(prisma.feedEntry.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ imageUrl: 'https://example.com/embedded.jpg' })],
        skipDuplicates: true
      });
    });

    it('sets imageUrl to null when nothing has an image at all', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://example.com/rss' });
      mockParseURL.mockResolvedValue({
        items: [{ guid: 'guid-1', title: 'Post 1', link: 'https://example.com/1', content: 'no images here' }]
      });
      prisma.feedEntry.createMany.mockResolvedValue({ count: 1 });

      await feedService.refreshFeedSource('feed-1');

      expect(prisma.feedEntry.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ imageUrl: null })],
        skipDuplicates: true
      });
    });

    it('skips items with no guid and no link', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://example.com/rss' });
      mockParseURL.mockResolvedValue({ items: [{ title: 'No identifiers' }] });

      const result = await feedService.refreshFeedSource('feed-1');

      expect(prisma.feedEntry.createMany).not.toHaveBeenCalled();
      expect(result).toEqual({ added: 0 });
    });

    it('propagates a parse failure to the caller', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://bad.example.com' });
      mockParseURL.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(feedService.refreshFeedSource('feed-1')).rejects.toThrow('ENOTFOUND');
    });

    it('backfills the feed name from the parsed title when the name still equals the raw URL', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://techcrunch.com/feed/', name: 'https://techcrunch.com/feed/' });
      mockParseURL.mockResolvedValue({ title: 'TechCrunch', items: [] });

      await feedService.refreshFeedSource('feed-1');

      expect(prisma.feedSource.update).toHaveBeenCalledWith({
        where: { id: 'feed-1' },
        data: { name: 'TechCrunch' }
      });
    });

    it('does not overwrite a name the user (or admin) already customized', async () => {
      prisma.feedSource.findUnique.mockResolvedValue({ id: 'feed-1', url: 'https://techcrunch.com/feed/', name: 'My Favorite Tech Blog' });
      mockParseURL.mockResolvedValue({ title: 'TechCrunch', items: [] });

      await feedService.refreshFeedSource('feed-1');

      expect(prisma.feedSource.update).not.toHaveBeenCalled();
    });
  });

  describe('refreshAllFeedSources', () => {
    it('keeps refreshing remaining sources when one fails', async () => {
      prisma.feedSource.findMany.mockResolvedValue([
        { id: 'feed-1', url: 'https://good.example.com' },
        { id: 'feed-2', url: 'https://bad.example.com' }
      ]);
      prisma.feedSource.findUnique
        .mockResolvedValueOnce({ id: 'feed-1', url: 'https://good.example.com' })
        .mockResolvedValueOnce({ id: 'feed-2', url: 'https://bad.example.com' });
      mockParseURL
        .mockResolvedValueOnce({ items: [] })
        .mockRejectedValueOnce(new Error('timeout'));

      const result = await feedService.refreshAllFeedSources();

      expect(result).toEqual({ total: 2, succeeded: 1, failed: 1 });
    });

    it('returns zeroed counts when there are no feed sources', async () => {
      prisma.feedSource.findMany.mockResolvedValue([]);

      const result = await feedService.refreshAllFeedSources();

      expect(result).toEqual({ total: 0, succeeded: 0, failed: 0 });
    });
  });
});
