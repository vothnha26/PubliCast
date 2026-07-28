const youtubeController = require('../../src/controllers/social/youtube.controller');
const youtubeService = require('../../src/services/social/youtube');

jest.mock('../../src/services/social/youtube');

describe('YouTubeController.updateYouTubeVideo', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {
        brandId: 'brand_123',
        videoId: 'vid_456',
        updates: { title: 'Updated Title' }
      }
    };
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  it('should call youtubeService.updateVideo and return 200 json response', async () => {
    const mockUpdatedData = { id: 'vid_456', snippet: { title: 'Updated Title' } };
    youtubeService.updateVideo.mockResolvedValue(mockUpdatedData);

    await youtubeController.updateYouTubeVideo(req, res, next);

    expect(youtubeService.updateVideo).toHaveBeenCalledWith(
      'brand_123',
      'vid_456',
      { title: 'Updated Title' },
      undefined
    );
    expect(res.json).toHaveBeenCalledWith({
      message: 'YouTube video updated successfully',
      data: mockUpdatedData
    });
  });

  it('should return 400 if brandId or videoId is missing', async () => {
    req.body = { videoId: 'vid_456' };
    await youtubeController.updateYouTubeVideo(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);

    req.body = { brandId: 'brand_123' };
    await youtubeController.updateYouTubeVideo(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
