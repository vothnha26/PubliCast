const Parser = require('rss-parser');
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

const parser = new Parser({ timeout: 15000 });

// rss-parser gives every item at least a link; guid is the dedupe key we
// prefer since some feeds reuse links (e.g. a redirect shortener) but not
// guids. Falls back to link when guid is missing, per RSS's own spec intent.
function extractGuid(item) {
  return item.guid || item.id || item.link;
}

function extractImageUrl(item) {
  if (item.enclosure?.url) return item.enclosure.url;
  const mediaContent = item['media:content'];
  if (mediaContent?.$ && mediaContent.$.url) return mediaContent.$.url;
  return null;
}

class FeedService {
  async listFeedSources(brandId) {
    return prisma.feedSource.findMany({
      where: { OR: [{ brandId }, { isSystem: true }] },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async createCustomFeedSource(brandId, { name, url, category }) {
    const trimmedUrl = url?.trim();
    if (!trimmedUrl) {
      const error = new Error('url is required');
      error.status = 400;
      throw error;
    }

    const feedSource = await prisma.feedSource.create({
      data: {
        brandId,
        name: name?.trim() || trimmedUrl,
        url: trimmedUrl,
        category: category?.trim() || null,
        isSystem: false
      }
    });

    // First refresh happens inline so the brand sees entries immediately
    // instead of waiting for the next scheduler pass.
    await this.refreshFeedSource(feedSource.id).catch((error) => {
      logger.warn(`[FeedService] Initial refresh failed for new feed ${feedSource.id}:`, error.message);
    });

    return feedSource;
  }

  async deleteFeedSource(id, brandId) {
    const existing = await prisma.feedSource.findUnique({ where: { id } });
    if (!existing || existing.brandId !== brandId) {
      const error = new Error('Feed source not found');
      error.status = 404;
      throw error;
    }
    await prisma.feedSource.delete({ where: { id } });
  }

  async getFeedEntries(brandId, { limit = 50 } = {}) {
    return prisma.feedEntry.findMany({
      where: {
        feedSource: { OR: [{ brandId }, { isSystem: true }] }
      },
      include: { feedSource: { select: { id: true, name: true, category: true, isSystem: true } } },
      orderBy: { publishedAt: 'desc' },
      take: limit
    });
  }

  async refreshFeedSource(feedSourceId) {
    const feedSource = await prisma.feedSource.findUnique({ where: { id: feedSourceId } });
    if (!feedSource) return { added: 0 };

    const feed = await parser.parseURL(feedSource.url);

    const rows = (feed.items || [])
      .map((item) => {
        const guid = extractGuid(item);
        if (!guid) return null;
        return {
          feedSourceId,
          guid: guid.slice(0, 500),
          title: item.title || '(untitled)',
          link: item.link || feedSource.url,
          summary: item.contentSnippet || item.summary || null,
          imageUrl: extractImageUrl(item),
          publishedAt: item.isoDate ? new Date(item.isoDate) : null
        };
      })
      .filter(Boolean);

    if (rows.length === 0) return { added: 0 };

    const result = await prisma.feedEntry.createMany({ data: rows, skipDuplicates: true });
    return { added: result.count };
  }

  async refreshAllFeedSources() {
    const feedSources = await prisma.feedSource.findMany({ select: { id: true, url: true } });

    let succeeded = 0;
    let failed = 0;
    for (const source of feedSources) {
      try {
        await this.refreshFeedSource(source.id);
        succeeded += 1;
      } catch (error) {
        failed += 1;
        logger.warn(`[FeedService] Refresh failed for feed source ${source.id} (${source.url}):`, error.message);
      }
    }

    return { total: feedSources.length, succeeded, failed };
  }
}

module.exports = new FeedService();
