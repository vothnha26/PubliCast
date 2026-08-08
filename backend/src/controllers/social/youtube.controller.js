const youtubeService = require('../../services/social/youtube');
const asyncHandler = require('../../utils/async-handler');
const logger = require('../../utils/logger');

class YouTubeController {
  trackYouTubeVideo = asyncHandler(async (req, res) => {
    const { brandId, videoUrl } = req.body;
    const trackedVideo = await youtubeService.trackVideo(brandId, videoUrl);
    res.json({ message: 'Video tracked successfully', data: trackedVideo });
  });

  getTrackedVideos = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const videos = await youtubeService.getTrackedVideos(brandId);
    res.json({ data: videos });
  });

  getYouTubePublishedVideos = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit, socialAccountId, startDate, endDate } = req.query;
    const data = await youtubeService.getPublishedVideos(brandId, pageToken, limit, socialAccountId, false, startDate || null, endDate || null);
    res.json(data);
  });

  getYouTubeVideoAnalytics = asyncHandler(async (req, res) => {
    const { brandId, videoId, startDate, endDate } = req.query;
    if (!videoId) return res.status(400).json({ message: 'videoId is required' });
    
    const data = await youtubeService.getVideoAnalytics(brandId, videoId, startDate, endDate);
    res.json({ data });
  });

  // Route/method name kept as-is (public API contract) — only the internal
  // call is renamed to getPostInsights, since this fetches lifetime insights
  // for one post/video, unrelated to historyWindowMonths list-windowing.
  getYouTubeVideoInsights = asyncHandler(async (req, res) => {
    const { brandId, videoId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!videoId)  return res.status(400).json({ message: 'videoId is required' });
    const data = await youtubeService.getPostInsights(brandId, videoId);
    res.json(data);
  });

  searchYouTubeChannels = asyncHandler(async (req, res) => {
    const { brandId, query } = req.query;
    const channels = await youtubeService.searchChannel(brandId, query);
    res.json({ data: channels });
  });

  addYouTubeCompetitor = asyncHandler(async (req, res) => {
    const { brandId, channelId } = req.body;
    const competitor = await youtubeService.addCompetitor(brandId, channelId);
    res.json({ message: 'Competitor added successfully', data: competitor });
  });

  getYouTubeCompetitors = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const competitors = await youtubeService.getCompetitors(brandId);
    res.json({ data: competitors });
  });

  deleteYouTubeCompetitor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });

    await youtubeService.deleteCompetitor(id, brandId, req.user.id);
    res.json({ message: 'Competitor deleted successfully' });
  });

  getYouTubePlaylists = asyncHandler(async (req, res) => {
    const { brandId, sync } = req.query;
    logger.debug(`=== GET YOUTUBE PLAYLISTS ===`);
    logger.debug(`brandId: ${brandId}, sync: ${sync}`);
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const forceRefresh = sync === 'true' || sync === true;
    try {
      const playlists = await youtubeService.getPlaylists(brandId, forceRefresh);
      logger.debug(`Successfully fetched playlists: ${playlists.length} playlists found`);
      res.json({ data: playlists });
    } catch (error) {
      console.error("Error fetching YouTube playlists:", error);
      res.status(500).json({ message: error.message });
    }
  });

  getYouTubeVideoCategories = asyncHandler(async (req, res) => {
    const { brandId, sync } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const forceRefresh = sync === 'true' || sync === true;
    try {
      const categories = await youtubeService.getVideoCategories(brandId, forceRefresh);
      res.json({ data: categories });
    } catch (error) {
      console.error("Error fetching YouTube video categories:", error);
      res.status(500).json({ message: error.message });
    }
  });

  updateYouTubeVideo = asyncHandler(async (req, res) => {
    const { brandId, videoId, updates, socialAccountId } = req.body;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!videoId) return res.status(400).json({ message: 'videoId is required' });

    const updatedVideo = await youtubeService.updateVideo(brandId, videoId, updates || {}, socialAccountId);
    res.json({ message: 'YouTube video updated successfully', data: updatedVideo });
  });
}

module.exports = new YouTubeController();
