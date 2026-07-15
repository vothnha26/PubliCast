const socialService = require('../../services/social/social.service');
const { PLATFORMS, PERMISSION_KEYS } = require('../../utils/constants');
const asyncHandler = require('../../utils/async-handler');
const brandRepository = require('../../repositories/workspace/brand.repository');
const { ConnectionConflictGuard: connectionConflictGuard } = require('../../services/social/connection-conflict.guard');
const authorizationFacade = require('../../services/auth/authorization.facade');
const socialAccountRepository = require('../../repositories/social/social-account.repository');

class SocialConnectionController {
  disconnectGoogleAccount = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await socialService.disconnectAccount(brandId, PLATFORMS.YOUTUBE);
    res.json({ success: true, message: 'Google account disconnected successfully' });
  });

  disconnectFacebookAccount = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await socialService.disconnectAccount(brandId, PLATFORMS.FACEBOOK);
    res.json({ success: true, message: 'Facebook page disconnected successfully' });
  });

  disconnectTikTokAccount = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await socialService.disconnectAccount(brandId, PLATFORMS.TIKTOK);
    res.json({ success: true, message: 'TikTok account disconnected successfully' });
  });

  disconnectInstagramAccount = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await socialService.disconnectAccount(brandId, PLATFORMS.INSTAGRAM);
    res.json({ success: true, message: 'Instagram account disconnected successfully' });
  });

  disconnectLinkedInAccount = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await socialService.disconnectAccount(brandId, PLATFORMS.LINKEDIN);
    res.json({ success: true, message: 'LinkedIn account disconnected successfully' });
  });

  disconnectTelegramAccount = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await socialService.disconnectAccount(brandId, PLATFORMS.TELEGRAM);
    res.json({ success: true, message: 'Telegram account disconnected successfully' });
  });

  disconnectDiscordAccount = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await socialService.disconnectAccount(brandId, PLATFORMS.DISCORD);
    res.json({ success: true, message: 'Discord account disconnected successfully' });
  });

  disconnectThreadsAccount = asyncHandler(async (req, res) => {
    const { brandId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await socialService.disconnectAccount(brandId, PLATFORMS.THREADS);
    res.json({ success: true, message: 'Threads account disconnected successfully' });
  });

  reassignSocialAccount = asyncHandler(async (req, res) => {
    const { platform, platformAccountId, targetBrandId } = req.body;
    if (!platform || !platformAccountId || !targetBrandId) {
      return res.status(400).json({ message: 'platform, platformAccountId, and targetBrandId are required' });
    }

    const userId = req.user.id;

    const targetBrand = await brandRepository.findById(targetBrandId);
    if (!targetBrand) {
      return res.status(404).json({ message: 'Target brand not found' });
    }

    // Source brand is derived from the account being moved, never trusted from the
    // client — the account already tells us which brand currently owns it.
    const existingAccount = await socialAccountRepository.findByPlatformAccountIdAndPlatform(platformAccountId, platform);
    if (!existingAccount) {
      return res.status(404).json({ message: 'Social account not found' });
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
      return res.status(403).json({ message: 'Bạn không có quyền quản lý kết nối trên thương hiệu nguồn.' });
    }
    if (!canManageTarget) {
      return res.status(403).json({ message: 'Bạn không có quyền quản lý kết nối trên thương hiệu đích.' });
    }

    try {
      await connectionConflictGuard.reassignAccount(platform, platformAccountId, targetBrandId);
      res.json({ success: true, message: 'Social account reassigned successfully' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });
}

module.exports = new SocialConnectionController();
