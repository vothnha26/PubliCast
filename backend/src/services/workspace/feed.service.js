const Parser = require('rss-parser');
const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');
const cloudflareCache = require('../../utils/cloudflare-cache');

const CURATED_FEEDS_PATH = '/api/v2/content-extras/feeds/curated';

// media:thumbnail/media:content aren't part of rss-parser's default field
// set — without this, feeds that only use those tags (e.g. BBC) silently
// lose their image even though the data is right there in the XML.
const parser = new Parser({
  timeout: 15000,
  customFields: { item: ['media:thumbnail', 'media:content', 'content:encoded'] }
});

// rss-parser gives every item at least a link; guid is the dedupe key we
// prefer since some feeds reuse links (e.g. a redirect shortener) but not
// guids. Falls back to link when guid is missing, per RSS's own spec intent.
function extractGuid(item) {
  return item.guid || item.id || item.link;
}

const FIRST_IMG_TAG_SRC = /<img[^>]+src=["']([^"']+)["']/i;

function extractImageUrl(item) {
  if (item.enclosure?.url) return item.enclosure.url;

  const mediaThumbnail = item['media:thumbnail'];
  if (mediaThumbnail?.$?.url) return mediaThumbnail.$.url;

  const mediaContent = item['media:content'];
  if (mediaContent?.$?.url) return mediaContent.$.url;

  // Many feeds (The Verge, HubSpot, ...) don't expose a dedicated image
  // field at all — the only image is the first <img> inside the HTML body.
  const html = item['content:encoded'] || item.content;
  const match = html?.match(FIRST_IMG_TAG_SRC);
  if (match) return match[1];

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

  // Same response for every caller regardless of brand — safe to cache at
  // the Cloudflare edge (see routes/workspace/content-extras.routes.v2.js),
  // unlike getFeedSources/getFeedEntries which mix in the caller's own
  // custom feeds and must stay per-brand.
  async getCuratedFeeds() {
    const feedSources = await prisma.feedSource.findMany({
      where: { isSystem: true },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }]
    });

    const entries = await prisma.feedEntry.findMany({
      where: { feedSource: { isSystem: true } },
      include: { feedSource: { select: { id: true, name: true, category: true, isSystem: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 100
    });

    return { feedSources, entries };
  }

  async _purgeCuratedFeedsCache() {
    await cloudflareCache.purgeUrls([CURATED_FEEDS_PATH]);
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

    // The name defaults to the raw URL at creation time (see
    // createCustomFeedSource) since we don't know the feed's real title
    // until it's been fetched. Backfill it here, but only while the name
    // still equals the URL — once a user (or admin) picks a real name we
    // must not overwrite it on the next scheduled refresh.
    if (feed.title && feedSource.name === feedSource.url) {
      await prisma.feedSource.update({ where: { id: feedSourceId }, data: { name: feed.title } });
    }

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

    if (rows.length === 0) {
      if (feedSource.isSystem) await this._purgeCuratedFeedsCache();
      return { added: 0 };
    }

    const result = await prisma.feedEntry.createMany({ data: rows, skipDuplicates: true });

    if (feedSource.isSystem) {
      await this._purgeCuratedFeedsCache();
    }

    return { added: result.count };
  }
}

module.exports = new FeedService();
