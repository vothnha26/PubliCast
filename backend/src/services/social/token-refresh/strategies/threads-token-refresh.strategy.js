const BaseTokenRefreshStrategy = require('./base-token-refresh.strategy');
const { PLATFORMS } = require('../../../../utils/constants');
const logger = require('../../../../utils/logger');

const THREADS_AUTH_BASE = 'https://graph.threads.net';

class ThreadsTokenRefreshStrategy extends BaseTokenRefreshStrategy {
  constructor() {
    super(PLATFORMS.THREADS);
  }

  async refresh(account) {
    logger.info(`[ThreadsTokenRefresh] Refreshing long-lived token for Threads account: ${account.id}`);

    const url = `${THREADS_AUTH_BASE}/refresh_access_token`
      + `?grant_type=th_refresh_token`
      + `&access_token=${account.accessToken}`;

    const res = await global.fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error_message || err.error?.message || `Threads Token Refresh API returned status ${res.status}`);
    }

    const data = await res.json();
    if (!data.access_token) {
      throw new Error('Threads Token Refresh API response did not contain access_token');
    }

    const expiresAt = data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000)
      : null;

    return {
      accessToken: data.access_token,
      refreshToken: null, // Threads uses the long-lived token itself to refresh, no separate refresh_token is needed
      expiresAt
    };
  }
}

module.exports = ThreadsTokenRefreshStrategy;
