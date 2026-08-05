const prisma = require('../../config/prisma');
const logger = require('../../utils/logger');

function getPeriodStart(period, now = new Date()) {
  if (period === 'WEEKLY') {
    const day = now.getDay(); // 0=Sun..6=Sat
    const diffToMonday = day === 0 ? 6 : day - 1;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - diffToMonday);
    return start;
  }
  // MONTHLY
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

async function getProgress(brandId, period) {
  const start = getPeriodStart(period);
  const count = await prisma.post.count({
    where: {
      brandId,
      status: 'PUBLISHED',
      publishedAt: { gte: start }
    }
  });
  return { periodStart: start, currentCount: count };
}

/**
 * GET /api/posting-goals
 * Returns the brand's WEEKLY and MONTHLY goals (if set) with current progress.
 */
exports.getPostingGoals = async (req, res, next) => {
  try {
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'Missing required fields: brandId' });
    }

    const goals = await prisma.postingGoal.findMany({ where: { brandId } });

    const results = await Promise.all(
      goals.map(async (goal) => {
        const { periodStart, currentCount } = await getProgress(brandId, goal.period);
        return {
          id: goal.id,
          period: goal.period,
          targetCount: goal.targetCount,
          currentCount,
          periodStart,
          updatedAt: goal.updatedAt
        };
      })
    );

    return res.status(200).json({ message: 'Posting goals retrieved successfully', data: { goals: results } });
  } catch (error) {
    logger.error('Error in getPostingGoals:', error);
    next(error);
  }
};

/**
 * PUT /api/posting-goals
 * Create or update the brand's goal for a given period.
 */
exports.upsertPostingGoal = async (req, res, next) => {
  try {
    const { brandId, period, targetCount } = req.body;

    if (!brandId || !period || targetCount == null) {
      return res.status(400).json({ message: 'Missing required fields: brandId, period, targetCount' });
    }

    if (!['WEEKLY', 'MONTHLY'].includes(period)) {
      return res.status(400).json({ message: 'period must be WEEKLY or MONTHLY' });
    }

    if (!Number.isInteger(targetCount) || targetCount < 1) {
      return res.status(400).json({ message: 'targetCount must be a positive integer' });
    }

    const goal = await prisma.postingGoal.upsert({
      where: { brandId_period: { brandId, period } },
      update: { targetCount },
      create: { brandId, period, targetCount }
    });

    const { periodStart, currentCount } = await getProgress(brandId, period);

    return res.status(200).json({
      message: 'Posting goal saved successfully',
      data: { ...goal, currentCount, periodStart }
    });
  } catch (error) {
    logger.error('Error in upsertPostingGoal:', error);
    next(error);
  }
};

/**
 * DELETE /api/posting-goals/:id
 */
exports.deletePostingGoal = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.postingGoal.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Posting goal not found' });
    }

    const authorizationFacade = require('../../services/auth/authorization.facade');
    const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, existing.brandId);
    if (!hasAccess) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập vào tài nguyên này.' });
    }

    await prisma.postingGoal.delete({ where: { id } });

    return res.status(200).json({ message: 'Posting goal deleted successfully' });
  } catch (error) {
    logger.error('Error in deletePostingGoal:', error);
    next(error);
  }
};
