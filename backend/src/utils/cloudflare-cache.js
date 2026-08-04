const axios = require('axios');
const logger = require('./logger');
const appConfig = require('../config/app.config');

const CLOUDFLARE_PURGE_URL = 'https://api.cloudflare.com/client/v4/zones';

/**
 * Purge specific URLs from the Cloudflare edge cache. Best-effort: logs and
 * swallows failures rather than throwing, since a stale CDN entry (cleared
 * automatically by max-age) is not worth failing an admin write for.
 */
async function purgeUrls(paths) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!zoneId || !apiToken) return;

  const files = paths.map((path) => `${appConfig.backendBaseUrl}${path}`);

  try {
    await axios.post(
      `${CLOUDFLARE_PURGE_URL}/${zoneId}/purge_cache`,
      { files },
      { headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.warn('Cloudflare cache purge failed', { files, error: error.message });
  }
}

module.exports = { purgeUrls };
