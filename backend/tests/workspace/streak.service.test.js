jest.mock('../../src/config/prisma', () => ({
  brandStreak: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    updateMany: jest.fn()
  }
}));

const prisma = require('../../src/config/prisma');
const streakService = require('../../src/services/workspace/streak.service');

function d(dateStr) {
  return new Date(`${dateStr}T12:00:00.000Z`);
}

describe('streak.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recalculateStreak', () => {
    it('starts a new streak at 1 when the brand has no prior streak record', async () => {
      prisma.brandStreak.findUnique.mockResolvedValue(null);

      await streakService.recalculateStreak('brand-1', d('2026-08-05'));

      expect(prisma.brandStreak.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { brandId: 'brand-1' },
        update: expect.objectContaining({ currentStreak: 1, longestStreak: 1 }),
        create: expect.objectContaining({ brandId: 'brand-1', currentStreak: 1, longestStreak: 1 })
      }));
    });

    it('is a no-op when a post already counted today publishes again the same day', async () => {
      prisma.brandStreak.findUnique.mockResolvedValue({
        brandId: 'brand-1', currentStreak: 3, longestStreak: 5, lastPostedDate: d('2026-08-05')
      });

      await streakService.recalculateStreak('brand-1', d('2026-08-05'));

      expect(prisma.brandStreak.update).not.toHaveBeenCalled();
      expect(prisma.brandStreak.upsert).not.toHaveBeenCalled();
    });

    it('increments the streak when publishing exactly one day after the last post', async () => {
      prisma.brandStreak.findUnique.mockResolvedValue({
        brandId: 'brand-1', currentStreak: 3, longestStreak: 5, lastPostedDate: d('2026-08-04')
      });

      await streakService.recalculateStreak('brand-1', d('2026-08-05'));

      expect(prisma.brandStreak.update).toHaveBeenCalledWith({
        where: { brandId: 'brand-1' },
        data: expect.objectContaining({ currentStreak: 4, longestStreak: 5 })
      });
    });

    it('raises longestStreak when the new current streak surpasses it', async () => {
      prisma.brandStreak.findUnique.mockResolvedValue({
        brandId: 'brand-1', currentStreak: 5, longestStreak: 5, lastPostedDate: d('2026-08-04')
      });

      await streakService.recalculateStreak('brand-1', d('2026-08-05'));

      expect(prisma.brandStreak.update).toHaveBeenCalledWith({
        where: { brandId: 'brand-1' },
        data: expect.objectContaining({ currentStreak: 6, longestStreak: 6 })
      });
    });

    it('resets the streak to 1 when a day was skipped', async () => {
      prisma.brandStreak.findUnique.mockResolvedValue({
        brandId: 'brand-1', currentStreak: 5, longestStreak: 10, lastPostedDate: d('2026-08-01')
      });

      await streakService.recalculateStreak('brand-1', d('2026-08-05'));

      expect(prisma.brandStreak.update).toHaveBeenCalledWith({
        where: { brandId: 'brand-1' },
        data: expect.objectContaining({ currentStreak: 1, longestStreak: 10 })
      });
    });

    it('never moves the streak backwards for a publishedAt older than the stored date', async () => {
      prisma.brandStreak.findUnique.mockResolvedValue({
        brandId: 'brand-1', currentStreak: 5, longestStreak: 5, lastPostedDate: d('2026-08-05')
      });

      await streakService.recalculateStreak('brand-1', d('2026-08-03'));

      expect(prisma.brandStreak.update).not.toHaveBeenCalled();
      expect(prisma.brandStreak.upsert).not.toHaveBeenCalled();
    });

    it('swallows errors so a streak failure never breaks the publish pipeline', async () => {
      prisma.brandStreak.findUnique.mockRejectedValue(new Error('DB down'));

      await expect(streakService.recalculateStreak('brand-1', d('2026-08-05'))).resolves.toBeUndefined();
    });
  });

  describe('resetLapsedStreaks', () => {
    it('zeroes out streaks whose last post is older than yesterday', async () => {
      prisma.brandStreak.findMany.mockResolvedValue([
        { id: 'streak-1', brandId: 'brand-1' },
        { id: 'streak-2', brandId: 'brand-2' }
      ]);

      const count = await streakService.resetLapsedStreaks(d('2026-08-05'));

      expect(prisma.brandStreak.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['streak-1', 'streak-2'] } },
        data: { currentStreak: 0 }
      });
      expect(count).toBe(2);
    });

    it('does nothing when there are no lapsed streaks', async () => {
      prisma.brandStreak.findMany.mockResolvedValue([]);

      const count = await streakService.resetLapsedStreaks(d('2026-08-05'));

      expect(prisma.brandStreak.updateMany).not.toHaveBeenCalled();
      expect(count).toBe(0);
    });
  });
});
