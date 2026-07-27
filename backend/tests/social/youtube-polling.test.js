const { google } = require('googleapis');
const prisma = require('../../src/config/prisma');
const youtubePollingManager = require('../../src/services/social/youtube/youtube-polling.manager');
const socketManager = require('../../src/services/workspace/socket/socket.manager');
const inboxRepository = require('../../src/repositories/social/inbox.repository');
const { SOCKET_EVENTS } = require('../../src/utils/socket-constants');

// Helper to flush all promises in the microtask queue during fake timer tests
const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate);

jest.mock('../../src/config/prisma', () => ({
  livestream: {
    findUnique: jest.fn(),
    update: jest.fn()
  }
}));

jest.mock('../../src/services/workspace/socket/socket.manager', () => ({
  emitToLivestreamRoom: jest.fn()
}));

jest.mock('../../src/repositories/social/inbox.repository', () => ({
  findOrCreateInbox: jest.fn().mockResolvedValue({ id: 'inbox_123' }),
  upsertInboxItem: jest.fn().mockResolvedValue({ id: 'inbox_item_123' })
}));

jest.mock('googleapis', () => {
  const mockYoutube = {
    liveChatMessages: {
      list: jest.fn()
    },
    liveBroadcasts: {
      list: jest.fn()
    }
  };
  return {
    google: {
      youtube: jest.fn(() => mockYoutube)
    }
  };
});

describe('YoutubePollingManager Unit Tests', () => {
  let mockYoutubeService;

  beforeEach(() => {
    mockYoutubeService = google.youtube();
    jest.clearAllMocks();
    youtubePollingManager.activePolls.clear();
    jest.useFakeTimers();

    // Mock _getAccountAndAuth to simulate real connected account behavior
    jest.spyOn(youtubePollingManager, '_getAccountAndAuth').mockResolvedValue({
      account: { id: 'account_123' },
      auth: {},
      isMock: false
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Dynamic Polling Interval', () => {
    it('should schedule next poll dynamically using pollingIntervalMillis returned by API', async () => {
      const livestreamId = 'stream_111';
      prisma.livestream.findUnique.mockResolvedValue({
        id: livestreamId,
        platformStreamId: 'live_chat_111',
        brandId: 'brand_111'
      });

      // Mock first response with 3500ms interval
      mockYoutubeService.liveChatMessages.list.mockResolvedValue({
        data: {
          items: [],
          nextPageToken: 'token_2',
          pollingIntervalMillis: 3500
        }
      });

      await youtubePollingManager.startPolling(livestreamId, 'brand_111', socketManager);

      // Resolve microtasks
      await flushPromises();

      const pollInfo = youtubePollingManager.activePolls.get(livestreamId);
      expect(pollInfo).toBeDefined();

      // Fast-forward just before 3500ms -> should not have fired second call
      jest.advanceTimersByTime(3400);
      expect(mockYoutubeService.liveChatMessages.list).toHaveBeenCalledTimes(1);

      // Fast-forward to 3500ms -> should fire second call
      mockYoutubeService.liveChatMessages.list.mockResolvedValue({
        data: {
          items: [],
          nextPageToken: 'token_3',
          pollingIntervalMillis: 8000
        }
      });

      jest.advanceTimersByTime(100);
      await flushPromises();
      expect(mockYoutubeService.liveChatMessages.list).toHaveBeenCalledTimes(2);

      // Next interval should be 8000ms
      jest.advanceTimersByTime(7900);
      expect(mockYoutubeService.liveChatMessages.list).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(100);
      await flushPromises();
      expect(mockYoutubeService.liveChatMessages.list).toHaveBeenCalledTimes(3);

      youtubePollingManager.stopPolling(livestreamId);
    });
  });

  describe('Multi-Room Isolation', () => {
    it('should manage multiple independent polling rooms and not affect others when one is stopped', async () => {
      const streamA = 'stream_A';
      const streamB = 'stream_B';

      prisma.livestream.findUnique
        .mockResolvedValueOnce({ id: streamA, platformStreamId: 'chat_A', brandId: 'brand_1' })
        .mockResolvedValueOnce({ id: streamB, platformStreamId: 'chat_B', brandId: 'brand_1' });

      mockYoutubeService.liveChatMessages.list.mockResolvedValue({
        data: { items: [], nextPageToken: 'token', pollingIntervalMillis: 4000 }
      });

      await youtubePollingManager.startPolling(streamA, 'brand_1', socketManager);
      await flushPromises();
      await youtubePollingManager.startPolling(streamB, 'brand_1', socketManager);
      await flushPromises();

      expect(youtubePollingManager.activePolls.has(streamA)).toBe(true);
      expect(youtubePollingManager.activePolls.has(streamB)).toBe(true);

      // Stop stream A
      youtubePollingManager.stopPolling(streamA);

      expect(youtubePollingManager.activePolls.has(streamA)).toBe(false);
      expect(youtubePollingManager.activePolls.has(streamB)).toBe(true);

      // Advance time -> B should poll, A should not
      jest.advanceTimersByTime(4000);
      await flushPromises();
      
      // Clear mocks to finish cleanly
      youtubePollingManager.stopPolling(streamB);
    });
  });

  describe('Token and Quota Errors', () => {
    it('should handle 401 Authentication error: stop polling and emit login message', async () => {
      const livestreamId = 'stream_error_401';
      prisma.livestream.findUnique.mockResolvedValue({
        id: livestreamId,
        platformStreamId: 'chat_error',
        brandId: 'brand_1'
      });

      // Simulate 401 error
      const authError = new Error('Invalid Credentials');
      authError.code = 401;
      mockYoutubeService.liveChatMessages.list.mockRejectedValue(authError);

      await youtubePollingManager.startPolling(livestreamId, 'brand_1', socketManager);
      await flushPromises();

      // Verify polling stopped
      expect(youtubePollingManager.activePolls.has(livestreamId)).toBe(false);

      // Verify correct error message emitted to client
      expect(socketManager.emitToLivestreamRoom).toHaveBeenCalledWith(
        livestreamId,
        SOCKET_EVENTS.ERROR,
        { message: 'YouTube authentication failed. Please reconnect your account.' }
      );
    });

    it('should handle 403 Quota exceeded error: stop polling and emit quota message', async () => {
      const livestreamId = 'stream_error_403';
      prisma.livestream.findUnique.mockResolvedValue({
        id: livestreamId,
        platformStreamId: 'chat_error',
        brandId: 'brand_1'
      });

      // Simulate 403 quota error
      const quotaError = new Error('The request cannot be completed because you have exceeded your quota.');
      quotaError.code = 403;
      mockYoutubeService.liveChatMessages.list.mockRejectedValue(quotaError);

      await youtubePollingManager.startPolling(livestreamId, 'brand_1', socketManager);
      await flushPromises();

      // Verify polling stopped
      expect(youtubePollingManager.activePolls.has(livestreamId)).toBe(false);

      // Verify correct error message emitted to client
      expect(socketManager.emitToLivestreamRoom).toHaveBeenCalledWith(
        livestreamId,
        SOCKET_EVENTS.ERROR,
        { message: 'YouTube API quota exceeded. Please try again later.' }
      );
    });
  });

  describe('Race Condition on Client Exit/Entry', () => {
    it('should not leak timers if stopPolling is called during async network request', async () => {
      const livestreamId = 'stream_race';
      prisma.livestream.findUnique.mockResolvedValue({
        id: livestreamId,
        platformStreamId: 'chat_race',
        brandId: 'brand_1'
      });

      let resolveApi;
      const apiPromise = new Promise(resolve => {
        resolveApi = resolve;
      });

      mockYoutubeService.liveChatMessages.list.mockReturnValue(apiPromise.then(() => ({
        data: { items: [], nextPageToken: 'token_race', pollingIntervalMillis: 4000 }
      })));

      await youtubePollingManager.startPolling(livestreamId, 'brand_1', socketManager);

      // Let startPolling execution proceed to API call
      await flushPromises();

      // Client leaves room during API request
      youtubePollingManager.stopPolling(livestreamId);
      expect(youtubePollingManager.activePolls.has(livestreamId)).toBe(false);

      // Resolve the API call
      resolveApi();
      await flushPromises();

      // Timer should not be scheduled
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('Message Deduplication (Overlap case)', () => {
    it('should filter out duplicate messages when response contains mixed old and new messages', async () => {
      const livestreamId = 'stream_dedup';
      prisma.livestream.findUnique.mockResolvedValue({
        id: livestreamId,
        platformStreamId: 'chat_dedup',
        brandId: 'brand_1'
      });

      // Lượt 1: Trả về msg_1 and msg_2
      mockYoutubeService.liveChatMessages.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'msg_1', snippet: { displayMessage: 'Message 1', publishedAt: new Date().toISOString() }, authorDetails: {} },
            { id: 'msg_2', snippet: { displayMessage: 'Message 2', publishedAt: new Date().toISOString() }, authorDetails: {} }
          ],
          nextPageToken: 'token_1',
          pollingIntervalMillis: 4000
        }
      });

      await youtubePollingManager.startPolling(livestreamId, 'brand_1', socketManager);
      await flushPromises();

      // Hết lượt 1: emit 2 comments
      expect(socketManager.emitToLivestreamRoom).toHaveBeenCalledTimes(2);
      expect(socketManager.emitToLivestreamRoom).toHaveBeenNthCalledWith(1, livestreamId, SOCKET_EVENTS.NEW_LIVESTREAM_COMMENT, expect.objectContaining({ id: 'msg_1' }));
      expect(socketManager.emitToLivestreamRoom).toHaveBeenNthCalledWith(2, livestreamId, SOCKET_EVENTS.NEW_LIVESTREAM_COMMENT, expect.objectContaining({ id: 'msg_2' }));

      // Live comments must not save to Unified Inbox
      expect(inboxRepository.upsertInboxItem).not.toHaveBeenCalled();

      socketManager.emitToLivestreamRoom.mockClear();

      // Lượt 2: Trả về hỗn hợp: msg_2 (cũ) và msg_3 (mới)
      mockYoutubeService.liveChatMessages.list.mockResolvedValueOnce({
        data: {
          items: [
            { id: 'msg_2', snippet: { displayMessage: 'Message 2', publishedAt: new Date().toISOString() }, authorDetails: {} },
            { id: 'msg_3', snippet: { displayMessage: 'Message 3', publishedAt: new Date().toISOString() }, authorDetails: {} }
          ],
          nextPageToken: 'token_2',
          pollingIntervalMillis: 4000
        }
      });

      // Chạy lượt 2
      jest.advanceTimersByTime(4000);
      await flushPromises();

      // Chỉ emit msg_3 (mới), không emit lại msg_2
      expect(socketManager.emitToLivestreamRoom).toHaveBeenCalledTimes(1);
      expect(socketManager.emitToLivestreamRoom).toHaveBeenCalledWith(livestreamId, SOCKET_EVENTS.NEW_LIVESTREAM_COMMENT, expect.objectContaining({ id: 'msg_3' }));

      // Check again that no inbox save happened
      expect(inboxRepository.upsertInboxItem).not.toHaveBeenCalled();

      youtubePollingManager.stopPolling(livestreamId);
    });
  });
});
