const youtubeService = require('../../services/social/youtube');
const asyncHandler = require('../../utils/async-handler');
const { sendSuccess } = require('../../utils/response.util');

class YouTubeControllerV2 {
  trackYouTubeVideo = asyncHandler(async (req, res) => {
    const { brandId, videoUrl } = req.body;
    const trackedVideo = await youtubeService.trackVideo(brandId, videoUrl);
    sendSuccess(res, trackedVideo, 'Video tracked successfully');
  });

  getTrackedVideos = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const videos = await youtubeService.getTrackedVideos(brandId);
    sendSuccess(res, videos);
  });

  getYouTubePublishedVideos = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit, socialAccountId } = req.query;
    const data = await youtubeService.getPublishedVideos(brandId, pageToken, limit, socialAccountId);
    sendSuccess(res, data);
  });

  getYouTubeVideoAnalytics = asyncHandler(async (req, res) => {
    const { brandId, videoId, startDate, endDate } = req.query;
    if (!videoId) return res.status(400).json({ message: 'videoId is required' });

    const data = await youtubeService.getVideoAnalytics(brandId, videoId, startDate, endDate);
    sendSuccess(res, data);
  });

  getYouTubeVideoInsights = asyncHandler(async (req, res) => {
    const { brandId, videoId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!videoId) return res.status(400).json({ message: 'videoId is required' });
    const data = await youtubeService.getVideoInsights(brandId, videoId);
    sendSuccess(res, data);
  });

  searchYouTubeChannels = asyncHandler(async (req, res) => {
    const { brandId, query } = req.query;
    const channels = await youtubeService.searchChannel(brandId, query);
    sendSuccess(res, channels);
  });

  addYouTubeCompetitor = asyncHandler(async (req, res) => {
    const { brandId, channelId } = req.body;
    const competitor = await youtubeService.addCompetitor(brandId, channelId);
    sendSuccess(res, competitor, 'Competitor added successfully');
  });

  getYouTubeCompetitors = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const competitors = await youtubeService.getCompetitors(brandId);
    sendSuccess(res, competitors);
  });

  deleteYouTubeCompetitor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await youtubeService.deleteCompetitor(id, brandId, req.user.id);
    sendSuccess(res, null, 'Competitor deleted successfully');
  });

  getYouTubePlaylists = asyncHandler(async (req, res) => {
    const { brandId, sync } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const forceRefresh = sync === 'true' || sync === true;
    try {
      const playlists = await youtubeService.getPlaylists(brandId, forceRefresh);
      sendSuccess(res, playlists);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  getYouTubeVideoCategories = asyncHandler(async (req, res) => {
    const { brandId, sync } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const forceRefresh = sync === 'true' || sync === true;
    try {
      const categories = await youtubeService.getVideoCategories(brandId, forceRefresh);
      sendSuccess(res, categories);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

  updateYouTubeVideo = asyncHandler(async (req, res) => {
    const { brandId, videoId, updates, socialAccountId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!videoId) return res.status(400).json({ message: 'videoId is required' });

    const updatedVideo = await youtubeService.updateVideo(brandId, videoId, updates || {}, socialAccountId);
    sendSuccess(res, updatedVideo, 'YouTube video updated successfully');
  });
}

module.exports = new YouTubeControllerV2();
