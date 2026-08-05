jest.mock('axios');
const axios = require('axios');
const appConfig = require('../../src/config/app.config');
const { purgeUrls } = require('../../src/utils/cloudflare-cache');

describe('cloudflareCache.purgeUrls', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('does nothing when CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN is missing', async () => {
    delete process.env.CLOUDFLARE_ZONE_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;

    await purgeUrls(['/api/v2/templates']);

    expect(axios.post).not.toHaveBeenCalled();
  });

  it('calls the Cloudflare purge_cache API with absolute URLs when configured', async () => {
    process.env.CLOUDFLARE_ZONE_ID = 'zone-123';
    process.env.CLOUDFLARE_API_TOKEN = 'token-abc';
    axios.post.mockResolvedValue({ data: { success: true } });

    await purgeUrls(['/api/v2/templates']);

    expect(axios.post).toHaveBeenCalledWith(
      'https://api.cloudflare.com/client/v4/zones/zone-123/purge_cache',
      { files: [`${appConfig.backendBaseUrl}/api/v2/templates`] },
      { headers: { Authorization: 'Bearer token-abc', 'Content-Type': 'application/json' } }
    );
  });

  it('swallows errors from the Cloudflare API without throwing', async () => {
    process.env.CLOUDFLARE_ZONE_ID = 'zone-123';
    process.env.CLOUDFLARE_API_TOKEN = 'token-abc';
    axios.post.mockRejectedValue(new Error('network error'));

    await expect(purgeUrls(['/api/v2/templates'])).resolves.toBeUndefined();
  });
});
