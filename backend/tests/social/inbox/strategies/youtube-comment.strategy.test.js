const YoutubeCommentSyncStrategy = require('../../../../src/services/social/inbox/strategies/youtube-comment.strategy');
const youtubeGateway = require('../../../../src/services/social/youtube/youtube.gateway');
const socialAccountRepository = require('../../../../src/repositories/social/social-account.repository');
const inboxRepository = require('../../../../src/repositories/social/inbox.repository');

jest.mock('../../../../src/services/social/youtube/youtube.gateway');
jest.mock('../../../../src/repositories/social/social-account.repository');
jest.mock('../../../../src/repositories/social/inbox.repository');
jest.mock('../../../../src/services/social/google-oauth.service', () => ({
  createClient: jest.fn().mockReturnValue({
    setCredentials: jest.fn()
  })
}));

describe('YoutubeCommentSyncStrategy Pagination Unit Tests', () => {
  let strategy;
  const mockBrandId = 'brand-123';
  const mockInbox = { id: 'inbox-123', brandId: mockBrandId };
  const mockAccount = {
    id: 'acc-123',
    platformAccountId: 'channel-123',
    accessToken: 'token-123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new YoutubeCommentSyncStrategy();
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue([mockAccount]);
    inboxRepository.upsertInboxItem.mockImplementation((where, update, create) => {
      return Promise.resolve({ id: `item-${create.platformItemId}`, ...create });
    });
  });

  it('should sync comments from a single page when nextPageToken is absent', async () => {
    youtubeGateway.getCommentThreads.mockResolvedValue({
      data: {
        items: [
          {
            id: 'thread-1',
            snippet: {
              topLevelComment: {
                id: 'comment-1',
                snippet: {
                  textDisplay: 'Hello 1',
                  authorDisplayName: 'User A',
                  authorProfileImageUrl: 'avatar-url',
                  authorChannelId: { value: 'user-channel-1' },
                  videoId: 'video-1',
                  publishedAt: '2026-07-27T00:00:00Z'
                }
              }
            }
          }
        ]
      }
    });

    const result = await strategy.sync(mockBrandId, mockInbox);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('item-comment-1');
    expect(youtubeGateway.getCommentThreads).toHaveBeenCalledTimes(1);
    expect(youtubeGateway.getCommentThreads).toHaveBeenCalledWith(expect.any(Object), 'channel-123', 100, null);
  });

  it('should sync and combine comments from multiple pages when nextPageToken is present', async () => {
    youtubeGateway.getCommentThreads
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'thread-1',
              snippet: {
                topLevelComment: {
                  id: 'comment-1',
                  snippet: {
                    textDisplay: 'Hello 1',
                    authorDisplayName: 'User A',
                    authorProfileImageUrl: 'avatar-url',
                    authorChannelId: { value: 'user-channel-1' },
                    videoId: 'video-1',
                    publishedAt: '2026-07-27T00:00:00Z'
                  }
                }
              }
            }
          ],
          nextPageToken: 'page-2'
        }
      })
      .mockResolvedValueOnce({
        data: {
          items: [
            {
              id: 'thread-2',
              snippet: {
                topLevelComment: {
                  id: 'comment-2',
                  snippet: {
                    textDisplay: 'Hello 2',
                    authorDisplayName: 'User B',
                    authorProfileImageUrl: 'avatar-url',
                    authorChannelId: { value: 'user-channel-2' },
                    videoId: 'video-1',
                    publishedAt: '2026-07-27T01:00:00Z'
                  }
                }
              }
            }
          ]
        }
      });

    const result = await strategy.sync(mockBrandId, mockInbox);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('item-comment-1');
    expect(result[1].id).toBe('item-comment-2');
    expect(youtubeGateway.getCommentThreads).toHaveBeenCalledTimes(2);
    expect(youtubeGateway.getCommentThreads).toHaveBeenNthCalledWith(1, expect.any(Object), 'channel-123', 100, null);
    expect(youtubeGateway.getCommentThreads).toHaveBeenNthCalledWith(2, expect.any(Object), 'channel-123', 100, 'page-2');
  });

  it('should stop syncing after reaching MAX_PAGES_PER_SYNC limit to prevent infinite loop', async () => {
    // Luôn trả về nextPageToken giả lập vòng lặp vô hạn
    youtubeGateway.getCommentThreads.mockResolvedValue({
      data: {
        items: [
          {
            id: 'thread-loop',
            snippet: {
              topLevelComment: {
                id: 'comment-loop',
                snippet: {
                  textDisplay: 'Looping...',
                  authorDisplayName: 'User Loop',
                  authorProfileImageUrl: 'avatar-url',
                  authorChannelId: { value: 'user-loop' },
                  videoId: 'video-1',
                  publishedAt: '2026-07-27T00:00:00Z'
                }
              }
            }
          }
        ],
        nextPageToken: 'next-infinite-page'
      }
    });

    const result = await strategy.sync(mockBrandId, mockInbox);
    
    // MAX_PAGES_PER_SYNC = 10, mỗi trang 1 item -> 10 items
    expect(result).toHaveLength(10);
    expect(youtubeGateway.getCommentThreads).toHaveBeenCalledTimes(10);
  });

  it('should filter out mock accounts and select the real account if present', async () => {
    const mockAccounts = [
      { id: 'acc-mock', platformAccountId: 'mock-channel', accessToken: 'mock-token' },
      { id: 'acc-real', platformAccountId: 'real-channel', accessToken: 'real-token' }
    ];
    socialAccountRepository.findByBrandAndPlatform.mockResolvedValue(mockAccounts);
    
    youtubeGateway.getCommentThreads.mockResolvedValue({ data: { items: [] } });

    await strategy.sync(mockBrandId, mockInbox);

    // Verify that the getCommentThreads was called with real channel ID
    expect(youtubeGateway.getCommentThreads).toHaveBeenCalledWith(
      expect.any(Object),
      'real-channel',
      100,
      null
    );
  });
});
