const BaseTokenRefreshStrategy = require('./base-token-refresh.strategy');
const { PLATFORMS } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

class LinkedInTokenRefreshStrategy extends BaseTokenRefreshStrategy {
  constructor() {
    super(PLATFORMS.LINKEDIN);
    this.clientId = process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  }

  // LinkedIn only issues a refresh_token to apps enrolled in its
  // Programmatic Refresh Tokens program — most accounts connected before
  // that (or via an app not enrolled) never receive one, so there is
  // nothing to exchange and the account must be reconnected manually
  // once its access token expires.
  canRefresh(account) {
    return Boolean(account.refreshToken);
  }

  async refresh(account) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be configured in environment');
    }

    logger.info(`[LinkedInTokenRefresh] Refreshing access token for account: ${account.id}`);

    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', account.refreshToken);
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);

    const res = await global.fetch(LINKEDIN_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error_description || data.message || `LinkedIn Token Refresh API returned status ${res.status}`);
    }

    if (!data.access_token) {
      throw new Error('LinkedIn Token Refresh API response did not contain access_token');
    }

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

    return {
      accessToken: data.access_token,
      // LinkedIn may rotate the refresh_token on use; fall back to the
      // existing one if the response doesn't include a new one.
      refreshToken: data.refresh_token || account.refreshToken,
      expiresAt
    };
  }
}

module.exports = LinkedInTokenRefreshStrategy;
