const { google } = require('googleapis');
const youtubeGateway = require('../../src/services/social/youtube/youtube.gateway');

jest.mock('googleapis');

describe('YouTubeGateway.updateVideo Merge & Quota Tests', () => {
  let mockVideosList, mockVideosUpdate;

  beforeEach(() => {
    jest.clearAllMocks();

    mockVideosList = jest.fn().mockResolvedValue({
      data: {
        items: [
          {
            id: 'v123',
            snippet: {
              title: 'Original Title',
              description: 'Original Description',
              tags: ['tag1', 'tag2'],
              categoryId: '22'
            },
            status: {
              privacyStatus: 'public',
              selfDeclaredMadeForKids: false
            }
          }
        ]
      }
    });

    mockVideosUpdate = jest.fn().mockResolvedValue({
      data: { id: 'v123', snippet: {}, status: {} }
    });

    google.youtube.mockReturnValue({
      videos: {
        list: mockVideosList,
        update: mockVideosUpdate
      }
    });
  });

  it('should fetch existing video details, merge updated title, and preserve existing description/tags/privacyStatus', async () => {
    const auth = { credentials: { access_token: 'valid_token' } };
    const updates = { title: 'Updated Title Only' };

    await youtubeGateway.updateVideo(auth, 'v123', updates);

    expect(mockVideosList).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'v123', part: expect.any(String) })
    );

    expect(mockVideosUpdate).toHaveBeenCalledWith({
      part: 'snippet,status',
      requestBody: {
        id: 'v123',
        snippet: {
          title: 'Updated Title Only',
          description: 'Original Description',
          tags: ['tag1', 'tag2'],
          categoryId: '22'
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false
        }
      }
    });
  });

  it('should override containsSyntheticMedia when provided in updates', async () => {
    const auth = { credentials: { access_token: 'valid_token' } };
    const updates = { containsSyntheticMedia: true, privacyStatus: 'unlisted' };

    await youtubeGateway.updateVideo(auth, 'v123', updates);

    expect(mockVideosUpdate).toHaveBeenCalledWith({
      part: 'snippet,status',
      requestBody: {
        id: 'v123',
        snippet: {
          title: 'Original Title',
          description: 'Original Description',
          tags: ['tag1', 'tag2'],
          categoryId: '22'
        },
        status: {
          privacyStatus: 'unlisted',
          selfDeclaredMadeForKids: false,
          containsSyntheticMedia: true
        }
      }
    });
  });

  it('should throw error when video is not found', async () => {
    mockVideosList.mockResolvedValueOnce({ data: { items: [] } });
    const auth = { credentials: { access_token: 'valid_token' } };

    await expect(
      youtubeGateway.updateVideo(auth, 'invalid_id', { title: 'New' })
    ).rejects.toThrow('YouTube video not found: invalid_id');
  });
});
