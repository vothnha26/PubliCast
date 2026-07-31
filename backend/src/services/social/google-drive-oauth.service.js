const googleOAuthService = require('./google-oauth.service');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { GOOGLE_OAUTH_SCOPE_SETS } = require('../../utils/constants');

class GoogleDriveOAuthService {
  getAuthUrl(brandId, redirectUri) {
    return googleOAuthService.getAuthUrl(GOOGLE_OAUTH_SCOPE_SETS.GOOGLE_DRIVE, brandId, redirectUri);
  }

  async connectAccount(brandId, code, redirectUri) {
    const tokens = await googleOAuthService.getTokens(code, redirectUri);
    const profile = await googleOAuthService.getUserInfo(tokens);
    return socialAccountRepository.upsertGoogleDriveAccount(brandId, profile, tokens);
  }

  async disconnectAccount(brandId) {
    return socialAccountRepository.disconnectGoogleDriveAccount(brandId);
  }
}

module.exports = new GoogleDriveOAuthService();
