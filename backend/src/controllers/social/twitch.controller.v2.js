const { twitchService } = require('../../services/social/twitch');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { DEFAULT_CONFIG, PLATFORMS } = require('../../utils/constants');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v2 envelope wrapper around TwitchController's non-redirect endpoints —
 * `twitchCallback` stays v1-only since it's an OAuth redirect target.
 * Delegates to the same twitchService/repository the v1 controller uses,
 * only reshapes the response (v1's `status: 'success'/'error'` field is
 * dropped — the frontend only ever reads `data`, confirmed by
 * social.service.js returning the unwrapped apiV2 result directly).
 */
class TwitchControllerV2 {
  getTwitchAuthUrl = asyncHandler(async (req, res) => {
    const { brandId, redirectUri } = req.query;
    const callbackUrl = redirectUri || `${DEFAULT_CONFIG.FRONTEND_URL}/settings/connections/twitch/callback`;
    const url = twitchService.getAuthUrl(brandId, callbackUrl);
    v2Success(res, { url });
  });

  disconnectTwitchAccount = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    if (socialAccountId) {
      await socialAccountRepository.deleteByIdAndBrand(brandId, socialAccountId);
    } else {
      await socialAccountRepository.deleteManyByBrandAndPlatform(brandId, PLATFORMS.TWITCH);
    }
    v2Success(res, null, 'Twitch account disconnected successfully');
  });
}

module.exports = new TwitchControllerV2();
