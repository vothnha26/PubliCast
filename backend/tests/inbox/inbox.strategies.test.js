const inboxService = require('../../src/services/social/inbox.service');
const inboxRepository = require('../../src/repositories/social/inbox.repository');
const { PLATFORMS, INBOX_STATUS, INBOX_TYPES } = require('../../src/utils/constants');

jest.mock('../../src/repositories/social/inbox.repository');

describe('Inbox SOLID Strategy Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Strategy Registration', () => {
    it('should register five specific strategies in InboxService', () => {
      expect(inboxService.strategies).toHaveLength(5);

      const strategyNames = inboxService.strategies.map(s => s.constructor.name);
      expect(strategyNames).toContain('YoutubeCommentSyncStrategy');
      expect(strategyNames).toContain('FacebookCommentSyncStrategy');
      expect(strategyNames).toContain('FacebookDMSyncStrategy');
      expect(strategyNames).toContain('InstagramDMSyncStrategy');
      expect(strategyNames).toContain('TiktokCommentSyncStrategy');
    });
  });

  describe('Platform Support Resolution', () => {
    it('should identify the correct strategies for each platform', () => {
      // YouTube platform supports
      const ytStrategies = inboxService.strategies.filter(s => s.supports(PLATFORMS.YOUTUBE));
      expect(ytStrategies).toHaveLength(1);
      expect(ytStrategies[0].constructor.name).toBe('YoutubeCommentSyncStrategy');

      // Facebook platform supports comments and DMs
      const fbStrategies = inboxService.strategies.filter(s => s.supports(PLATFORMS.FACEBOOK));
      expect(fbStrategies).toHaveLength(2);
      const fbNames = fbStrategies.map(s => s.constructor.name);
      expect(fbNames).toContain('FacebookCommentSyncStrategy');
      expect(fbNames).toContain('FacebookDMSyncStrategy');

      // Instagram platform supports Instagram DM strategy
      const instaStrategies = inboxService.strategies.filter(s => s.supports(PLATFORMS.INSTAGRAM));
      expect(instaStrategies).toHaveLength(1);
      expect(instaStrategies[0].constructor.name).toBe('InstagramDMSyncStrategy');
    });

    it('should map reply support correctly according to platform and type', () => {
      const ytComment = { platform: PLATFORMS.YOUTUBE, type: INBOX_TYPES.COMMENT };
      const fbComment = { platform: PLATFORMS.FACEBOOK, type: INBOX_TYPES.COMMENT };
      const fbDM = { platform: PLATFORMS.FACEBOOK, type: INBOX_TYPES.DIRECT_MESSAGE };
      const instaDM = { platform: PLATFORMS.INSTAGRAM, type: INBOX_TYPES.DIRECT_MESSAGE };

      const ytCommentStrategy = inboxService.strategies.find(s => s.supportsReply(ytComment));
      expect(ytCommentStrategy.constructor.name).toBe('YoutubeCommentSyncStrategy');

      const fbCommentStrategy = inboxService.strategies.find(s => s.supportsReply(fbComment));
      expect(fbCommentStrategy.constructor.name).toBe('FacebookCommentSyncStrategy');

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

    it('should execute strategy sync and aggregate results', async () => {
      inboxRepository.findOrCreateInbox.mockResolvedValue({ id: 'inbox_123' });
      
      // Mock YouTube Comment strategy sync method
      const ytStrategy = inboxService.strategies.find(s => s.constructor.name === 'YoutubeCommentSyncStrategy');
      const syncSpy = jest.spyOn(ytStrategy, 'sync').mockResolvedValue([{ id: 'comment_1', content: 'hello' }]);

      const result = await inboxService.syncPlatformComments('brand_123', PLATFORMS.YOUTUBE);
      
      expect(syncSpy).toHaveBeenCalledWith('brand_123', { id: 'inbox_123' });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('comment_1');
      expect(inboxRepository.updateInboxLastSync).toHaveBeenCalledWith('inbox_123');
      
      syncSpy.mockRestore();
    });
  });
});
