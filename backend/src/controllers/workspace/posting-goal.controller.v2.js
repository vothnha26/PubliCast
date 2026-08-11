const prisma = require('../../config/prisma');
const asyncHandler = require('../../utils/async-handler');
const authorizationFacade = require('../../services/auth/authorization.facade');
const { v2Success, v2Error } = require('../../utils/response.helper');

function getPeriodStart(period, now = new Date()) {
  if (period === 'WEEKLY') {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - diffToMonday);
    return start;
  }
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

exports.getPostingGoals = asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  if (!brandId) {
    return v2Error(res, 'Missing required fields: brandId', 400);
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

  v2Success(res, { goals: results }, 'Posting goals retrieved successfully');
});

exports.upsertPostingGoal = asyncHandler(async (req, res) => {
  const { brandId, period, targetCount } = req.body;

  if (!brandId || !period || targetCount == null) {
    return v2Error(res, 'Missing required fields: brandId, period, targetCount', 400);
  }

  if (!['WEEKLY', 'MONTHLY'].includes(period)) {
    return v2Error(res, 'period must be WEEKLY or MONTHLY', 400);
  }

  if (!Number.isInteger(targetCount) || targetCount < 1) {
    return v2Error(res, 'targetCount must be a positive integer', 400);
  }

  const goal = await prisma.postingGoal.upsert({
    where: { brandId_period: { brandId, period } },
    update: { targetCount },
    create: { brandId, period, targetCount }
  });

  const { periodStart, currentCount } = await getProgress(brandId, period);

  v2Success(res, { ...goal, currentCount, periodStart }, 'Posting goal saved successfully');
});

exports.deletePostingGoal = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.postingGoal.findUnique({ where: { id } });
  if (!existing) {
    return v2Error(res, 'Posting goal not found', 404);
  }

  const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, existing.brandId);
  if (!hasAccess) {
    return v2Error(res, 'Bạn không có quyền truy cập vào tài nguyên này.', 403);
  }

  await prisma.postingGoal.delete({ where: { id } });

  v2Success(res, null, 'Posting goal deleted successfully');
});
