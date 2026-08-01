const { twitchService, twitchClipService, twitchGateway } = require('../../services/social/twitch');
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

  async createClip(req, res, next) {
    try {
      const { socialAccountId, broadcasterId, maxAttempts } = req.body;

      let bId = broadcasterId;
      let accessToken = null;
      let refreshToken = null;

      if (socialAccountId) {
        const account = await socialAccountRepository.findById(socialAccountId);
        if (!account) {
          return res.status(404).json({ status: 'error', message: 'Twitch account not found' });
        }
        bId = account.platformAccountId;
        accessToken = account.accessToken;
        refreshToken = account.refreshToken;
      }

      if (!bId) {
        return res.status(400).json({ status: 'error', message: 'Broadcaster ID is required' });
      }

      const authProvider = twitchGateway.createAuthProvider(socialAccountId, {
        accessToken: accessToken || '',
        refreshToken: refreshToken || '',
        expiresIn: 0,
        obtainingTimestamp: Date.now()
      });

      const apiClient = twitchGateway.getApiClient(authProvider);

      const clipDetails = await twitchClipService.createAndPollClip(apiClient, bId, maxAttempts || 10);
      return res.json({ status: 'success', data: clipDetails });
    } catch (err) {
      if (err.code === 'STREAM_OFFLINE') {
        return res.status(400).json({ status: 'error', message: 'Stream must be LIVE to create clips' });
      }
      next(err);
    }
  }

  async getStreamStatus(req, res, next) {
    try {
      const { broadcasterId, socialAccountId } = req.query;

      let bId = broadcasterId;
      let accessToken = null;
      let refreshToken = null;

      if (socialAccountId) {
        const account = await socialAccountRepository.findById(socialAccountId);
        if (account) {
          bId = account.platformAccountId;
          accessToken = account.accessToken;
          refreshToken = account.refreshToken;
        }
      }

      if (!bId) {
        return res.status(400).json({ status: 'error', message: 'Broadcaster ID is required' });
      }

      const authProvider = twitchGateway.createAuthProvider(socialAccountId, {
        accessToken: accessToken || '',
        refreshToken: refreshToken || '',
        expiresIn: 0,
        obtainingTimestamp: Date.now()
      });

      const apiClient = twitchGateway.getApiClient(authProvider);
      const status = await twitchGateway.getStreamStatus(apiClient, bId);

      return res.json({ status: 'success', data: status });
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
