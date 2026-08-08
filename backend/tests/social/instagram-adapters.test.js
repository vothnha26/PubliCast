const { postAdapterFactory, channelAdapterFactory } = require('../../src/core/insights');
const { inboxSyncFactory, inboxDisplayFactory } = require('../../src/core/inbox');
const { PLATFORMS } = require('../../src/utils/constants');

describe('Instagram Adapters Integration Tests', () => {
  describe('Core Insights Registration', () => {
    test('InstagramPostInsightAdapter is registered in postAdapterFactory', () => {
      expect(postAdapterFactory.isSupported(PLATFORMS.INSTAGRAM)).toBe(true);
      const adapter = postAdapterFactory.getAdapter(PLATFORMS.INSTAGRAM);
      expect(adapter.platform).toBe(PLATFORMS.INSTAGRAM);
      expect(adapter.isUniqueKeyed).toBe(true);
    });

    test('InstagramChannelAdapter is registered in channelAdapterFactory', () => {
      expect(channelAdapterFactory.isSupported(PLATFORMS.INSTAGRAM)).toBe(true);
      const adapter = channelAdapterFactory.getAdapter(PLATFORMS.INSTAGRAM);
      expect(adapter.platform).toBe(PLATFORMS.INSTAGRAM);
      expect(adapter.supportsBackfill).toBe(false);
    });
  });

  describe('Core Inbox Registration', () => {
    test('InstagramInboxSyncAdapter is registered in inboxSyncFactory', () => {
      expect(inboxSyncFactory.isSupported(PLATFORMS.INSTAGRAM)).toBe(true);
      const adapter = inboxSyncFactory.getAdapter(PLATFORMS.INSTAGRAM);
      expect(adapter.platform).toBe(PLATFORMS.INSTAGRAM);
      expect(typeof adapter.syncDirectMessages).toBe('function');
      expect(typeof adapter.syncMediaComments).toBe('function');
    });

    test('InstagramInboxDisplayAdapter is registered in inboxDisplayFactory', () => {
      expect(inboxDisplayFactory.isSupported(PLATFORMS.INSTAGRAM)).toBe(true);
      const adapter = inboxDisplayFactory.getAdapter(PLATFORMS.INSTAGRAM);
      expect(adapter.platform).toBe(PLATFORMS.INSTAGRAM);
    });
  });
});
