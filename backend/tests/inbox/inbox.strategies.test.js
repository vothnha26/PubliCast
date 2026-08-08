const inboxService = require('../../src/services/social/inbox.service');
const inboxRepository = require('../../src/repositories/social/inbox.repository');
const { PLATFORMS, INBOX_TYPES } = require('../../src/utils/constants');

jest.mock('../../src/repositories/social/inbox.repository');

// YouTube and Facebook now sync/reply via core/inbox's adapter/factory
// (see core/inbox/index.js) instead of the legacy this.strategies array —
// only DM/TikTok strategies still live there. Mock the facade the same way
// inbox.service.js's callers do.
jest.mock('../../src/core/inbox', () => ({
  inboxFacade: {
    syncPlatformComments: jest.fn(),
    getSyncAdapter: jest.fn()
  },
  inboxSyncFactory: {
    isSupported: jest.fn().mockImplementation((platform) => platform === 'YOUTUBE' || platform === 'FACEBOOK'),
    getAdapter: jest.fn()
  },
  inboxDisplayFactory: {
    isSupported: jest.fn().mockReturnValue(false),
    getAdapter: jest.fn()
  }
}));

const { inboxFacade } = require('../../src/core/inbox');

describe('Inbox SOLID Strategy Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Strategy Registration', () => {
    it('should register the legacy DM/TikTok strategies not yet migrated to core/inbox adapters', () => {
      expect(inboxService.strategies).toHaveLength(4);

      const strategyNames = inboxService.strategies.map(s => s.constructor.name);
      expect(strategyNames).toContain('YoutubeCommentSyncStrategy');
      expect(strategyNames).toContain('FacebookDMSyncStrategy');
      expect(strategyNames).toContain('InstagramDMSyncStrategy');
      expect(strategyNames).toContain('TiktokCommentSyncStrategy');
      // Facebook comment sync moved to core/inbox's FacebookInboxSyncAdapter
      // (see core/inbox/index.js) — no longer registered here.
      expect(strategyNames).not.toContain('FacebookCommentSyncStrategy');
    });
  });

  describe('Platform Support Resolution (legacy strategies only)', () => {
    it('should identify the correct legacy strategies for each platform', () => {
      // YouTube's legacy strategy entry still exists in this.strategies, but
      // inboxSyncFactory.isSupported('YOUTUBE') is true, so inbox.service.js
      // never actually reaches it for sync/reply anymore — see the facade
      // routing test below.
      const ytStrategies = inboxService.strategies.filter(s => s.supports(PLATFORMS.YOUTUBE));
      expect(ytStrategies).toHaveLength(1);
      expect(ytStrategies[0].constructor.name).toBe('YoutubeCommentSyncStrategy');

      // Facebook DMs still go through the legacy strategy (comments don't —
      // see FacebookInboxSyncAdapter).
      const fbStrategies = inboxService.strategies.filter(s => s.supports(PLATFORMS.FACEBOOK));
      expect(fbStrategies).toHaveLength(1);
      expect(fbStrategies[0].constructor.name).toBe('FacebookDMSyncStrategy');

      const instaStrategies = inboxService.strategies.filter(s => s.supports(PLATFORMS.INSTAGRAM));
      expect(instaStrategies).toHaveLength(1);
      expect(instaStrategies[0].constructor.name).toBe('InstagramDMSyncStrategy');
    });

    it('should map DM/TikTok reply support correctly according to platform and type', () => {
      const fbDM = { platform: PLATFORMS.FACEBOOK, type: INBOX_TYPES.DIRECT_MESSAGE };
      const instaDM = { platform: PLATFORMS.INSTAGRAM, type: INBOX_TYPES.DIRECT_MESSAGE };

      const fbDMStrategy = inboxService.strategies.find(s => s.supportsReply(fbDM));
      expect(fbDMStrategy.constructor.name).toBe('FacebookDMSyncStrategy');

      const instaDMStrategy = inboxService.strategies.find(s => s.supportsReply(instaDM));
      expect(instaDMStrategy.constructor.name).toBe('InstagramDMSyncStrategy');
    });
  });

  describe('syncPlatformComments strategy execution', () => {
    it('should return empty list and log warning when no strategy supports platform', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      inboxRepository.findOrCreateInbox.mockResolvedValue({ id: 'inbox_123' });

      const result = await inboxService.syncPlatformComments('brand_123', 'UNKNOWN_PLATFORM');

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('No sync strategies found'));
      consoleWarnSpy.mockRestore();
    });

    it('should route YouTube sync through inboxFacade (core/inbox adapter), not the legacy strategy array', async () => {
      inboxRepository.findOrCreateInbox.mockResolvedValue({ id: 'inbox_123' });
      inboxFacade.syncPlatformComments.mockResolvedValue([{ id: 'comment_1', content: 'hello' }]);

      const ytStrategy = inboxService.strategies.find(s => s.constructor.name === 'YoutubeCommentSyncStrategy');
      const syncSpy = jest.spyOn(ytStrategy, 'sync');

      const result = await inboxService.syncPlatformComments('brand_123', PLATFORMS.YOUTUBE);

      expect(inboxFacade.syncPlatformComments).toHaveBeenCalledWith('brand_123', PLATFORMS.YOUTUBE, { id: 'inbox_123' });
      expect(syncSpy).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('comment_1');
      expect(inboxRepository.updateInboxLastSync).toHaveBeenCalledWith('inbox_123');

      syncSpy.mockRestore();
    });

    it('should execute legacy strategy sync for a platform not yet migrated to core/inbox (Instagram DMs)', async () => {
      inboxRepository.findOrCreateInbox.mockResolvedValue({ id: 'inbox_123' });

      const instaStrategy = inboxService.strategies.find(s => s.constructor.name === 'InstagramDMSyncStrategy');
      const syncSpy = jest.spyOn(instaStrategy, 'sync').mockResolvedValue([{ id: 'dm_1', content: 'hi' }]);

      const result = await inboxService.syncPlatformComments('brand_123', PLATFORMS.INSTAGRAM);

      expect(syncSpy).toHaveBeenCalledWith('brand_123', { id: 'inbox_123' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('dm_1');
      expect(inboxRepository.updateInboxLastSync).toHaveBeenCalledWith('inbox_123');

      syncSpy.mockRestore();
    });
  });
});
