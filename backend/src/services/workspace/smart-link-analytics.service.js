const crypto = require('crypto');
const prisma = require('../../config/prisma');
const smartLinkRepository = require('../../repositories/workspace/smart-link.repository');
const linkItemRepository = require('../../repositories/workspace/link-item.repository');
const redisClient = require('../../config/redis');
const logger = require('../../utils/logger');
const { REDIS_NAMESPACES, REDIS_TTL } = require('../../utils/constants');

class SmartLinkAnalyticsService {
  /**
   * Track page view asynchronously.
   * @param {string} smartLinkId - The SmartLink ID.
   * @param {string} ip - Visitor IP address.
   * @param {string} userAgent - Visitor User-Agent header.
   */
  async trackPageView(smartLinkId, ip, userAgent) {
    try {
      const isUnique = await this._isFirstEventToday('view', smartLinkId, ip);

      const today = this._today();
      await Promise.all([
        smartLinkRepository.incrementPageView(smartLinkId, isUnique),
        smartLinkRepository.upsertDailyPageView(smartLinkId, today, isUnique)
      ]);
    } catch (err) {
      console.error('Error tracking page view:', err.message);
    }
  }

  /**
   * Track link click.
   * @param {string} linkItemId - The LinkItem ID.
   * @param {string} ip - Visitor IP.
   * @param {string} userAgent - Visitor User-Agent.
   */
  async trackLinkClick(linkItemId, ip, userAgent) {
    if (!linkItemId) {
      throw new Error('Link Item ID is required');
    }

    const existingLink = await linkItemRepository.findById(linkItemId);
    if (!existingLink) {
      const error = new Error('Link Item not found');
      error.statusCode = 404;
      throw error;
    }

    // Same IP already clicked this link today: don't double-count, but still
    // return the current link state so the caller sees an accurate click count.
    const isFirstClickToday = await this._isFirstEventToday('click', linkItemId, ip);
    if (!isFirstClickToday) {
      return existingLink;
    }

    const today = this._today();

    return await prisma.$transaction(async (tx) => {
      const updatedLink = await tx.linkItem.update({
        where: { id: linkItemId },
        data: { clicks: { increment: 1 } }
      });

      await tx.smartLink.update({
        where: { id: existingLink.smartLinkId },
        data: { totalClicks: { increment: 1 } }
      });

      const dateStr = today.toISOString().slice(0, 10);
      await tx.$executeRaw`
        INSERT INTO link_item_daily_metrics ("id", "linkItemId", "smartLinkId", "date", "clicks", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${linkItemId}, ${existingLink.smartLinkId}, ${dateStr}::date, 1, now(), now())
        ON CONFLICT ("linkItemId", "date")
        DO UPDATE SET "clicks" = link_item_daily_metrics."clicks" + 1, "updatedAt" = now()
      `;

      return updatedLink;
    });
  }

  _today() {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  /**
   * Marks (eventType, entityId, ip, day) as seen and reports whether this is the
   * first occurrence today. Uses Redis SET NX so concurrent requests from the
   * same IP within the same day only count once. Dedup is scoped to entityId,
   * not to a whole SmartLink page: trackPageView passes the smartLinkId (one
   * "unique visitor" per SmartLink per IP per day), while trackLinkClick passes
   * the linkItemId (one counted click per link per IP per day — a visitor who
   * clicks 3 different links on the same page still yields 3 counted clicks).
   * Fails open (treats as first/unique) on Redis errors so an outage degrades
   * to "no dedup" rather than silently dropping real page views/clicks.
   */
  async _isFirstEventToday(eventType, entityId, ip) {
    if (!ip) return true;
    try {
      const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
      const day = this._today().toISOString().slice(0, 10);
      const key = `${REDIS_NAMESPACES.SMART_LINK_VISITOR}:${eventType}:${entityId}:${day}:${ipHash}`;
      const result = await redisClient.set(key, '1', {
        NX: true,
        EX: REDIS_TTL.SMART_LINK_VISITOR_SEC
      });
      return result !== null;
    } catch (err) {
      logger.error(`[SmartLinkAnalyticsService] Redis dedup check failed: ${err.message}`, err);
      return true;
    }
  }
}

module.exports = new SmartLinkAnalyticsService();
