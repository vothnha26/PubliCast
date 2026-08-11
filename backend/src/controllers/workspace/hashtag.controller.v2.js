const prisma = require('../../config/prisma');
const asyncHandler = require('../../utils/async-handler');
const trendingHashtagService = require('../../services/workspace/hashtag/trending/TrendingHashtagService');
const tokApiHashtagProvider = require('../../services/workspace/hashtag/tokapi-hashtag.provider');
const authorizationFacade = require('../../services/auth/authorization.facade');
const { v2Success, v2Error } = require('../../utils/response.helper');

const PLATFORM_MAP = {
  IG: 'INSTAGRAM',
  INSTAGRAM: 'INSTAGRAM',
  FB: 'FACEBOOK',
  FACEBOOK: 'FACEBOOK',
  TK: 'TIKTOK',
  TIKTOK: 'TIKTOK',
  YT: 'YOUTUBE',
  YOUTUBE: 'YOUTUBE',
  TW: 'TWITTER_X',
  TWITTER: 'TWITTER_X',
  TWITTER_X: 'TWITTER_X',
  PIN: 'PINTEREST',
  PINTEREST: 'PINTEREST',
  LI: 'LINKEDIN',
  LINKEDIN: 'LINKEDIN'
};

function normalizePlatform(p) {
  if (!p) return 'INSTAGRAM';
  const upper = String(p).toUpperCase();
  return PLATFORM_MAP[upper] || upper;
}

async function fetchRealHashtagStats(platform, hashtagName, previousTotalPosts) {
  if (platform !== 'TIKTOK') {
    return { totalPosts: null, totalReach: null, platformHashtagId: null, trendDirection: 'STABLE' };
  }

  const result = await tokApiHashtagProvider.searchHashtag(hashtagName);
  if (!result) {
    return { totalPosts: null, totalReach: null, platformHashtagId: null, trendDirection: 'STABLE' };
  }

  let trendDirection = 'STABLE';
  if (previousTotalPosts != null && result.totalPosts != null) {
    if (result.totalPosts > previousTotalPosts) trendDirection = 'UP';
    else if (result.totalPosts < previousTotalPosts) trendDirection = 'DOWN';
  }

  return {
    totalPosts: result.totalPosts,
    totalReach: result.totalReach,
    platformHashtagId: result.platformHashtagId,
    trendDirection
  };
}

/**
 * getHashtagData keeps v1's bare { sets, trackers } shape (no message/data
 * wrapper) and getTrendingHashtags keeps v1's bare { trending } shape —
 * same as v1, unchanged.
 */
exports.getHashtagData = asyncHandler(async (req, res) => {
  const { brandId } = req.query;
  if (!brandId) {
    return v2Error(res, 'Missing required fields: brandId', 400);
  }

  const sets = await prisma.hashtagSet.findMany({
    where: { brandId },
    orderBy: { createdAt: 'desc' }
  });

  const trackers = await prisma.hashtagTracker.findMany({
    where: { brandId },
    orderBy: { addedAt: 'desc' }
  });

  return res.status(200).json({ sets, trackers });
});

exports.createHashtagSet = asyncHandler(async (req, res) => {
  const { brandId, name, hashtags, targetPlatforms } = req.body;

  if (!brandId || !name || !hashtags) {
    return v2Error(res, 'Missing required fields: brandId, name, or hashtags', 400);
  }

  const newSet = await prisma.hashtagSet.create({
    data: {
      brandId,
      name,
      hashtags: Array.isArray(hashtags) ? hashtags.join(',') : hashtags,
      targetPlatforms: Array.isArray(targetPlatforms) ? targetPlatforms.join(',') : (targetPlatforms || 'IG,TK')
    }
  });

  v2Success(res, newSet, 'Hashtag set created successfully', 201);
});

exports.updateHashtagSet = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, hashtags, targetPlatforms } = req.body;

  const existingSet = await prisma.hashtagSet.findUnique({ where: { id } });
  if (!existingSet) {
    return v2Error(res, 'Hashtag set not found', 404);
  }

  const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, existingSet.brandId);
  if (!hasAccess) {
    return v2Error(res, 'Bạn không có quyền truy cập vào tài nguyên này.', 403);
  }

  const updatedSet = await prisma.hashtagSet.update({
    where: { id },
    data: {
      name: name !== undefined ? name : existingSet?.name,
      hashtags: hashtags !== undefined
        ? (Array.isArray(hashtags) ? hashtags.join(',') : hashtags)
        : existingSet?.hashtags,
      targetPlatforms: targetPlatforms !== undefined
        ? (Array.isArray(targetPlatforms) ? targetPlatforms.join(',') : targetPlatforms)
        : existingSet?.targetPlatforms
    }
  });

  v2Success(res, updatedSet, 'Hashtag set updated successfully');
});

exports.deleteHashtagSet = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingSet = await prisma.hashtagSet.findUnique({ where: { id } });
  if (!existingSet) {
    return v2Error(res, 'Hashtag set not found', 404);
  }

  const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, existingSet.brandId);
  if (!hasAccess) {
    return v2Error(res, 'Bạn không có quyền truy cập vào tài nguyên này.', 403);
  }

  await prisma.hashtagSet.delete({ where: { id } });

  v2Success(res, null, 'Hashtag set deleted successfully');
});

exports.trackHashtag = asyncHandler(async (req, res) => {
  const { brandId, hashtag, platform } = req.body;

  if (!brandId || !hashtag || !platform) {
    return v2Error(res, 'Missing required fields: brandId, hashtag, platform', 400);
  }

  const normPlatform = normalizePlatform(platform);
  const cleanTag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;

  const existing = await prisma.hashtagTracker.findUnique({
    where: {
      brandId_platform_hashtag: {
        brandId,
        platform: normPlatform,
        hashtag: cleanTag
      }
    }
  });

  if (existing) {
    return v2Error(res, 'Hashtag is already being tracked on this platform', 409);
  }

  const stats = await fetchRealHashtagStats(normPlatform, cleanTag, null);

  const newTracker = await prisma.hashtagTracker.create({
    data: {
      brandId,
      hashtag: cleanTag,
      platform: normPlatform,
      platformHashtagId: stats.platformHashtagId,
      totalPosts: stats.totalPosts,
      postsLast24h: null,
      totalReach: stats.totalReach,
      avgEngagementRate: null,
      trendDirection: stats.trendDirection,
      addedAt: new Date(),
      lastFetchedAt: stats.totalPosts != null ? new Date() : null
    }
  });

  v2Success(res, newTracker, 'Hashtag added to tracking successfully', 201);
});

exports.refreshHashtag = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.hashtagTracker.findUnique({ where: { id } });
  if (!existing) {
    return v2Error(res, 'Tracked hashtag not found', 404);
  }

  const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, existing.brandId);
  if (!hasAccess) {
    return v2Error(res, 'Bạn không có quyền truy cập vào tài nguyên này.', 403);
  }

  const stats = await fetchRealHashtagStats(existing.platform, existing.hashtag, existing.totalPosts);

  if (stats.totalPosts == null) {
    return v2Success(res, existing, 'Không thể lấy dữ liệu mới lúc này (hết quota hoặc nền tảng chưa được hỗ trợ). Số liệu cũ được giữ nguyên.');
  }

  const updatedTracker = await prisma.hashtagTracker.update({
    where: { id },
    data: {
      platformHashtagId: stats.platformHashtagId,
      totalPosts: stats.totalPosts,
      totalReach: stats.totalReach,
      trendDirection: stats.trendDirection,
      lastFetchedAt: new Date()
    }
  });

  v2Success(res, updatedTracker, 'Hashtag refreshed successfully');
});

exports.untrackHashtag = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.hashtagTracker.findUnique({ where: { id } });
  if (!existing) {
    return v2Error(res, 'Tracked hashtag not found', 404);
  }

  const hasAccess = await authorizationFacade.checkBrandAccess(req.user.id, existing.brandId);
  if (!hasAccess) {
    return v2Error(res, 'Bạn không có quyền truy cập vào tài nguyên này.', 403);
  }

  await prisma.hashtagTracker.delete({ where: { id } });

  v2Success(res, null, 'Stopped tracking hashtag successfully');
});

exports.getTrendingHashtags = asyncHandler(async (req, res) => {
  const { platform = 'MOCK', limit = 20 } = req.query;
  const trending = await trendingHashtagService.getTrendingHashtags(platform, parseInt(limit, 10));
  return res.status(200).json({ trending });
});
