const subscriptionRepository = require('../repositories/billing/subscription.repository');
const logger = require('../utils/logger');

/**
 * checkLimit middleware factory
 * ISP: Each route receives only the specific limit check it needs.
 * Usage: router.post('/brands', verifyAuth, checkLimit('maxBrands'), controller.create)
 *
 * @param {string} limitField - Key in PlanLimit (e.g. 'maxBrands', 'maxPostsPerMonth')
 */
const checkLimit = (limitField) => async (req, res, next) => {
  try {
    const brandId = req.query.brandId || req.body.brandId || req.params.brandId;
    const userId  = req.user?.id;

    // Fetch the active plan and its limits for this brand
    const subscription = await subscriptionRepository.findActivePlanByBrandId(brandId);
    if (!subscription) {
      return res.status(403).json({ message: 'Không tìm thấy gói đăng ký.' });
    }

    const limits = subscription.plan?.planLimit;
    if (!limits) {
      // Fail CLOSED: a brand with an active subscription but no planLimit row
      // is a data-integrity gap, not proof the caller is entitled to
      // unlimited usage — letting the request through here bypassed every
      // maxBrands/maxPostsPerMonth/maxTeamSeats enforcement (#118 H5).
      logger.error('[checkLimit] PlanLimit not found — denying request', { brandId, limitField });
      return res.status(403).json({ message: 'Cấu hình gói đăng ký bị thiếu. Vui lòng liên hệ hỗ trợ.' });
    }

    const limitValue = limits[limitField];

    // Boolean limits (e.g. allowCustomRoles, allowApprovalWorkflow)
    if (typeof limitValue === 'boolean') {
      if (!limitValue) {
        return res.status(403).json({
          code: 'LIMIT_REACHED',
          message: `Tính năng này không có trong gói ${subscription.plan.name}.`,
          upgradeRequired: true,
          currentPlan: subscription.plan.name
        });
      }
      return next();
    }

    // Numeric limits - need to count current usage
    const currentCount = await _countUsage(limitField, brandId, userId);

    if (currentCount >= limitValue) {
      logger.info('[checkLimit] Limit reached', { brandId, limitField, current: currentCount, max: limitValue });
      return res.status(403).json({
        code: 'LIMIT_REACHED',
        message: `Bạn đã đạt giới hạn (${currentCount}/${limitValue}) của gói ${subscription.plan.name}. Vui lòng nâng cấp!`,
        upgradeRequired: true,
        currentPlan:  subscription.plan.name,
        currentUsage: currentCount,
        maxAllowed:   limitValue,
        upgradeUrl:   '/pricing'
      });
    }

    next();
  } catch (err) {
    // Fail CLOSED: a transient DB/repo error here previously still called
    // next(), letting the request bypass whatever limit it was meant to
    // enforce — a DB blip or thrown error became a free pass past billing
    // limits (#118 H5). A 500 here is the correct signal; the client can retry.
    logger.error('[checkLimit] Error checking plan limit — denying request', { error: err.message, limitField });
    next(err);
  }
};

/**
 * Internal helper: maps limitField to the correct DB count query
 */
async function _countUsage(limitField, brandId, userId) {
  switch (limitField) {
    case 'maxBrands':
      return subscriptionRepository.countBrands(userId);
    case 'maxSocialProfiles':
      return subscriptionRepository.countSocialProfiles(brandId);
    case 'maxPostsPerMonth':
      return subscriptionRepository.countPostsThisMonth(brandId);
    case 'maxTeamSeats':
      return subscriptionRepository.countTeamSeats(brandId);
    case 'maxLivePlatforms':
      return 0; // Placeholder - implement when Livestream backend is built
    default:
      logger.warn('[checkLimit] Unknown limitField', { limitField });
      return 0;
  }
}

module.exports = { checkLimit };
