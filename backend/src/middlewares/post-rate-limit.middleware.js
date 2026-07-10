const redisClient = require('../config/redis');
const logger = require('../utils/logger');

// ─── Cấu hình các ngưỡng giới hạn ────────────────────────────────────────────
// Tách hằng số ra để dễ thay đổi mà không cần sửa logic
const RATE_WINDOWS = {
  SHORT: {
    key: 'short',
    maxRequests: 10,    // tối đa 10 bài
    windowSec: 60,      // trong 1 phút
    label: '1 phút',
  },
  LONG: {
    key: 'long',
    maxRequests: 50,    // tối đa 50 bài
    windowSec: 3600,    // trong 1 giờ
    label: '1 giờ',
  },
};

// ─── Strategy: Kiểm tra và ghi nhận 1 cửa sổ thời gian ──────────────────────
/**
 * @param {string} brandId
 * @param {{ key, maxRequests, windowSec, label }} window
 * @returns {{ allowed: boolean, current: number, max: number, resetIn: number }}
 */
async function checkWindow(brandId, window) {
  const redisKey = `post_rate:${window.key}:${brandId}`;

  // Tăng bộ đếm, nếu là lần đầu thì tự set TTL
  const current = await redisClient.incr(redisKey);
  if (current === 1) {
    await redisClient.expire(redisKey, window.windowSec);
  }

  const resetIn = await redisClient.ttl(redisKey);

  return {
    allowed: current <= window.maxRequests,
    current,
    max: window.maxRequests,
    resetIn: resetIn > 0 ? resetIn : window.windowSec,
    label: window.label,
  };
}

// ─── Middleware Factory ───────────────────────────────────────────────────────
/**
 * Middleware chống spam bài đăng dựa trên brandId.
 * Áp dụng 2 cửa sổ thời gian song song (Strategy Pattern):
 *   - SHORT: 10 bài / phút
 *   - LONG : 50 bài / giờ
 *
 * Fail-open: nếu Redis lỗi → cho phép request qua và ghi log cảnh báo.
 */
const postRateLimitMiddleware = async (req, res, next) => {
  try {
    const brandId = req.query.brandId || req.body.brandId;

    // Bỏ qua nếu không có brandId (các route GET không cần limit)
    if (!brandId) {
      return next();
    }

    // Kiểm tra cả 2 cửa sổ song song để tối ưu latency
    const [shortResult, longResult] = await Promise.all([
      checkWindow(brandId, RATE_WINDOWS.SHORT),
      checkWindow(brandId, RATE_WINDOWS.LONG),
    ]);

    // Nếu vượt cửa sổ ngắn
    if (!shortResult.allowed) {
      logger.warn('[PostRateLimit] Short window exceeded', {
        brandId,
        current: shortResult.current,
        max: shortResult.max,
      });
      return res.status(429).json({
        code: 'POST_RATE_LIMIT_EXCEEDED',
        message: `Bạn đang đăng quá nhanh! Tối đa ${shortResult.max} bài/${shortResult.label}. Vui lòng thử lại sau ${shortResult.resetIn} giây.`,
        retryAfter: shortResult.resetIn,
        current: shortResult.current,
        max: shortResult.max,
        window: shortResult.label,
      });
    }

    // Nếu vượt cửa sổ dài
    if (!longResult.allowed) {
      logger.warn('[PostRateLimit] Long window exceeded', {
        brandId,
        current: longResult.current,
        max: longResult.max,
      });
      return res.status(429).json({
        code: 'POST_RATE_LIMIT_EXCEEDED',
        message: `Bạn đã đạt giới hạn ${longResult.max} bài/${longResult.label}. Vui lòng thử lại sau ${Math.ceil(longResult.resetIn / 60)} phút.`,
        retryAfter: longResult.resetIn,
        current: longResult.current,
        max: longResult.max,
        window: longResult.label,
      });
    }

    next();
  } catch (err) {
    // Fail-open: không chặn user khi Redis gặp sự cố
    logger.error('[PostRateLimit] Redis error - failing open', { error: err.message });
    next();
  }
};

module.exports = postRateLimitMiddleware;
