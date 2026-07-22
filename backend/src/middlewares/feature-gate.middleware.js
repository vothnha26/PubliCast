const subscriptionGate = require('../services/subscription/subscription-gate.facade');
const logger = require('../utils/logger');

/**
 * Middleware to check subscription permission for a specific feature
 * @param {string} productId - Product slug to check (from PRODUCT_IDS constants)
 */
function requireFeature(productId) {
  return async (req, res, next) => {
    // Retrieve brand ID from header, query, or body
    const brandId = req.headers['x-brand-id'] || req.query.brandId || req.body?.brandId;
    if (!brandId) {
      return res.status(400).json({
        message: 'Missing brand configuration header (x-brand-id)',
        code: 'MISSING_BRAND_ID'
      });
    }

    try {
      const hasAccess = await subscriptionGate.checkFeatureAccess(brandId, productId);
      if (!hasAccess) {
        return res.status(403).json({
          message: 'Feature not included in your current subscription plan. Please upgrade.',
          code: 'PLAN_UPGRADE_REQUIRED',
          productId
        });
      }
      next();
    } catch (err) {
      // Without this catch, an async rejection here in Express 4 never
      // reaches the global error handler — the request hangs until the
      // client times out (#118 H5). Fail closed: a broken entitlement check
      // must not silently grant access to a paid feature either.
      logger.error('[requireFeature] Error checking feature access — denying request', { error: err.message, brandId, productId });
      next(err);
    }
  };
}

module.exports = { requireFeature };
