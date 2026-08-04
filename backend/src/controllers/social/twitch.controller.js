const { twitchService } = require('../../services/social/twitch');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { DEFAULT_CONFIG, PLATFORMS } = require('../../utils/constants');

class TwitchController {
  async getTwitchAuthUrl(req, res, next) {
    try {
      const { brandId, redirectUri } = req.query;
      const callbackUrl = redirectUri || `${DEFAULT_CONFIG.FRONTEND_URL}/settings/connections/twitch/callback`;
      const url = twitchService.getAuthUrl(brandId, callbackUrl);
      return res.json({ status: 'success', data: { url } });
    } catch (err) {
      next(err);
    }
  }

  async twitchCallback(req, res, next) {
    try {
      const { code, state, redirectUri } = req.query;
      const brandId = state;
      const callbackUrl = redirectUri || `${DEFAULT_CONFIG.FRONTEND_URL}/settings/connections/twitch/callback`;

      if (!code) {
        return res.status(400).json({ status: 'error', message: 'Missing authorization code' });
      }

      const account = await twitchService.connectChannel(brandId, code, callbackUrl);
      return res.json({ status: 'success', data: account });
    } catch (err) {
      next(err);
    }
  }

  async disconnectTwitchAccount(req, res, next) {
    try {
      const { brandId, socialAccountId } = req.body;
      if (!brandId) {
        return res.status(400).json({ status: 'error', message: 'brandId is required' });
      }
      if (socialAccountId) {
        await socialAccountRepository.deleteByIdAndBrand(brandId, socialAccountId);
      } else {
        await socialAccountRepository.deleteManyByBrandAndPlatform(brandId, PLATFORMS.TWITCH);
      }
      return res.json({ status: 'success', message: 'Twitch account disconnected successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TwitchController();
