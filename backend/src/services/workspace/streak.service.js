const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a, b) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_PER_DAY);
}

class StreakService {
  /**
   * Recomputes a brand's posting streak from its most recent PUBLISHED post,
   * called right after a post is marked PUBLISHED (see update-db.step.js).
   * Idempotent for same-day republishes: publishing a second time on a day
   * already counted is a no-op, not an extra +1.
   */
  async recalculateStreak(brandId, publishedAt = new Date()) {
    try {
      const today = startOfDay(publishedAt);

      const existing = await prisma.brandStreak.findUnique({ where: { brandId } });

      if (!existing || !existing.lastPostedDate) {
        await prisma.brandStreak.upsert({
          where: { brandId },
          update: { currentStreak: 1, longestStreak: 1, lastPostedDate: today },
          create: { brandId, currentStreak: 1, longestStreak: 1, lastPostedDate: today }
        });
        return;
      }

      const gap = daysBetween(today, existing.lastPostedDate);

      if (gap === 0) {
        // Already counted today — nothing to do.
        return;
      }
      if (gap < 0) {
        // A publishedAt older than the stored high-water mark (e.g. a
        // partial-retry finishing late) — never move the streak backwards.
        return;
      }

      const newCurrent = gap === 1 ? existing.currentStreak + 1 : 1;
      const newLongest = Math.max(existing.longestStreak, newCurrent);

      await prisma.brandStreak.update({
        where: { brandId },
        data: { currentStreak: newCurrent, longestStreak: newLongest, lastPostedDate: today }
      });
    } catch (error) {
      // Streak bookkeeping must never break the publish pipeline it's hooked into.
      logger.error(`[StreakService] Failed to recalculate streak for brand ${brandId}:`, error);
    }
  }

  /**
   * Zeroes out currentStreak for brands whose last published post wasn't
   * today or yesterday — called once daily by streak-scheduler.service.js.
   * Publishing itself never decreases a streak (only this sweep does),
   * since a brand that hasn't posted yet today shouldn't lose its streak
   * mid-day just because the clock ticked past midnight.
   */
  async resetLapsedStreaks(now = new Date()) {
    const today = startOfDay(now);

    const lapsed = await prisma.brandStreak.findMany({
      where: {
        currentStreak: { gt: 0 },
        OR: [
          { lastPostedDate: null },
          { lastPostedDate: { lt: new Date(today.getTime() - 24 * 60 * 60 * 1000) } }
        ]
      },
      select: { id: true, brandId: true }
    });

    if (lapsed.length === 0) return 0;

    await prisma.brandStreak.updateMany({
      where: { id: { in: lapsed.map((s) => s.id) } },
      data: { currentStreak: 0 }
    });

    return lapsed.length;
  }

  async getStreak(brandId) {
    const streak = await prisma.brandStreak.findUnique({ where: { brandId } });
    return streak || { brandId, currentStreak: 0, longestStreak: 0, lastPostedDate: null };
  }
}

module.exports = new StreakService();
