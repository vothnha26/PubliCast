const socialService = require('../../services/social/social.service');
const { PLATFORMS, PERMISSION_KEYS } = require('../../utils/constants');
const asyncHandler = require('../../utils/async-handler');
const brandRepository = require('../../repositories/workspace/brand.repository');
const { ConnectionConflictGuard: connectionConflictGuard } = require('../../services/social/connection-conflict.guard');
const authorizationFacade = require('../../services/auth/authorization.facade');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v2 envelope wrapper around SocialConnectionController — delegates to the
 * same services/repositories the v1 controller uses, only reshapes the
 * response. v1's ad-hoc `{ success: true, message, data? }` shape drops the
 * `success` field here since no frontend caller reads it (confirmed by
 * grep — every caller either awaits successfully or catches a thrown
 * error, never branches on response.success).
 */
class SocialConnectionControllerV2 {
  disconnectGoogleAccount = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    await socialService.disconnectAccount(brandId, PLATFORMS.YOUTUBE, socialAccountId);
    v2Success(res, null, 'Google account disconnected successfully');
  });

  disconnectGoogleDriveAccount = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    await socialService.disconnectAccount(brandId, PLATFORMS.GOOGLE_DRIVE, socialAccountId);
    v2Success(res, null, 'Google Drive account disconnected successfully');
  });

  disconnectFacebookAccount = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    await socialService.disconnectAccount(brandId, PLATFORMS.FACEBOOK, socialAccountId);
    v2Success(res, null, 'Facebook page disconnected successfully');
  });

  disconnectTikTokAccount = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    await socialService.disconnectAccount(brandId, PLATFORMS.TIKTOK, socialAccountId);
    v2Success(res, null, 'TikTok account disconnected successfully');
  });

  disconnectInstagramAccount = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    await socialService.disconnectAccount(brandId, PLATFORMS.INSTAGRAM, socialAccountId);
    v2Success(res, null, 'Instagram account disconnected successfully');
  });

  disconnectThreadsAccount = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    await socialService.disconnectAccount(brandId, PLATFORMS.THREADS, socialAccountId);
    v2Success(res, null, 'Threads account disconnected successfully');
  });

  disconnectBlueskyAccount = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    await socialService.disconnectAccount(brandId, PLATFORMS.BLUESKY, socialAccountId);
    v2Success(res, null, 'Bluesky account disconnected successfully');
  });

  disconnectTwitchAccount = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    await socialService.disconnectAccount(brandId, PLATFORMS.TWITCH, socialAccountId);
    v2Success(res, null, 'Twitch account disconnected successfully');
  });

  // Smart Fetch manual-refresh escape hatch — see SocialService#syncPublishedPostsNow.
  syncPublishedPostsNow = asyncHandler(async (req, res) => {
    const { brandId, platform, socialAccountId } = req.body;
    if (!brandId || !platform || !socialAccountId) {
      return v2Error(res, 'brandId, platform, and socialAccountId are required', 400);
    }

    try {
      const result = await socialService.syncPublishedPostsNow(brandId, platform, socialAccountId);
      v2Success(res, result, 'Sync triggered successfully');
    } catch (error) {
      v2Error(res, error.message, error.statusCode || 500);
    }
  });

  setDefaultAccount = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (!brandId || !socialAccountId) {
      return v2Error(res, 'brandId and socialAccountId are required', 400);
    }

    const account = await socialService.setDefaultAccount(brandId, socialAccountId);
    v2Success(res, account, 'Default account updated successfully');
  });

  reassignSocialAccount = asyncHandler(async (req, res) => {
    const { platform, platformAccountId, targetBrandId } = req.body;
    if (!platform || !platformAccountId || !targetBrandId) {
      return v2Error(res, 'platform, platformAccountId, and targetBrandId are required', 400);
    }

    const userId = req.user.id;

    const targetBrand = await brandRepository.findById(targetBrandId);
    if (!targetBrand) {
      return v2Error(res, 'Target brand not found', 404);
    }

    // Source brand is derived from the account being moved, never trusted from the
    // client — the account already tells us which brand currently owns it.
    const existingAccount = await socialAccountRepository.findByPlatformAccountIdAndPlatform(platformAccountId, platform);
    if (!existingAccount) {
      return v2Error(res, 'Social account not found', 404);
    }
    const sourceBrandId = existingAccount.brandId;

    // Reassigning touches both brands, so MANAGE_CONNECTIONS must be checked on
    // each side individually (the shared checkPermission middleware only knows
    // how to check a single brandId).
    const [canManageSource, canManageTarget] = await Promise.all([
      authorizationFacade.checkPermission(userId, sourceBrandId, PERMISSION_KEYS.MANAGE_CONNECTIONS),
      authorizationFacade.checkPermission(userId, targetBrandId, PERMISSION_KEYS.MANAGE_CONNECTIONS)
    ]);
    if (!canManageSource) {
      return v2Error(res, 'Bạn không có quyền quản lý kết nối trên thương hiệu nguồn.', 403);
    }
    if (!canManageTarget) {
      return v2Error(res, 'Bạn không có quyền quản lý kết nối trên thương hiệu đích.', 403);
    }

    try {
      await connectionConflictGuard.reassignAccount(platform, platformAccountId, targetBrandId);
      v2Success(res, null, 'Social account reassigned successfully');
    } catch (error) {
      v2Error(res, error.message, 400);
    }
  });
}

module.exports = new SocialConnectionControllerV2();
