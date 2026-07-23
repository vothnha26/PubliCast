const tokenRefreshRegistry = require('../../src/services/social/token-refresh/token-refresh.registry');
const { PLATFORMS } = require('../../src/utils/constants');

describe('TokenRefreshRegistry (#70)', () => {
  it('registers a strategy for LinkedIn (previously missing, so LinkedIn tokens never auto-refreshed)', () => {
    const strategy = tokenRefreshRegistry.getStrategy(PLATFORMS.LINKEDIN);
    expect(strategy).not.toBeNull();
    expect(strategy.platform).toBe(PLATFORMS.LINKEDIN);
  });

  it('includes LinkedIn in the supported platforms list used by the refresh scheduler query', () => {
    expect(tokenRefreshRegistry.getSupportedPlatforms()).toContain(PLATFORMS.LINKEDIN);
  });
});
