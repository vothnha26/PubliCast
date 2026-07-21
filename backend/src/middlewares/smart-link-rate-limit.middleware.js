const rateLimit = require('express-rate-limit');

// Public page-view/click endpoints have no auth — cap per-IP volume so a script
// can't trivially inflate a brand's SmartLink analytics.
const smartLinkPublicRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    message: 'Too many requests, please try again shortly.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = smartLinkPublicRateLimiter;
