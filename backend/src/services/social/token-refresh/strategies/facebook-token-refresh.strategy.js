const BaseTokenRefreshStrategy = require('./base-token-refresh.strategy');
const { PLATFORMS, FACEBOOK_API, API_VERSIONS } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

class FacebookTokenRefreshStrategy extends BaseTokenRefreshStrategy {
  constructor() {
    super(PLATFORMS.FACEBOOK);
    this.appId = process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
  }

  async refresh(account) {
    if (!this.appId || !this.appSecret) {
      throw new Error('FACEBOOK_APP_ID and FACEBOOK_APP_SECRET must be configured in environment');
    }

    logger.info(`[FacebookTokenRefresh] Refreshing long-lived token for account: ${account.id}`);

    const url = `${FACEBOOK_API.GRAPH_URL}/${API_VERSIONS.FACEBOOK}/oauth/access_token`
      + `?grant_type=fb_exchange_token`
      + `&client_id=${this.appId}`
      + `&client_secret=${this.appSecret}`
      + `&fb_exchange_token=${account.accessToken}`;

    const res = await global.fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Facebook Token Exchange API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.access_token) {
      throw new Error('Facebook Token Exchange API response did not contain access_token');
    }

    // Facebook long-lived tokens have expires_in (seconds)
    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

    return {
      accessToken: data.access_token,
      refreshToken: null, // Facebook Page/User Access tokens don't use refresh_token for long-lived exchange
      expiresAt
    };
  }
}

module.exports = FacebookTokenRefreshStrategy;
