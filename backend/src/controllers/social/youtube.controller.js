const youtubeService = require('../../services/social/youtube');
const asyncHandler = require('../../utils/async-handler');

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
    const { brandId, pageToken, limit } = req.query;
    const data = await youtubeService.getPublishedVideos(brandId, pageToken, limit);
    res.json(data);
  });

  getYouTubeVideoAnalytics = asyncHandler(async (req, res) => {
    const { brandId, videoId, startDate, endDate } = req.query;
    if (!videoId) return res.status(400).json({ message: 'videoId is required' });
    
    const data = await youtubeService.getVideoAnalytics(brandId, videoId, startDate, endDate);
    res.json({ data });
  });

  getYouTubeVideoInsights = asyncHandler(async (req, res) => {
    const { brandId, videoId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    if (!videoId)  return res.status(400).json({ message: 'videoId is required' });
    const data = await youtubeService.getVideoInsights(brandId, videoId);
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
    await youtubeService.deleteCompetitor(id);
    res.json({ message: 'Competitor deleted successfully' });
  });

  getYouTubePlaylists = asyncHandler(async (req, res) => {
    const { brandId, sync } = req.query;
    console.log(`=== GET YOUTUBE PLAYLISTS ===`);
    console.log(`brandId: ${brandId}, sync: ${sync}`);
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const forceRefresh = sync === 'true' || sync === true;
    try {
      const playlists = await youtubeService.getPlaylists(brandId, forceRefresh);
      console.log(`Successfully fetched playlists: ${playlists.length} playlists found`);
      res.json({ data: playlists });
    } catch (error) {
      console.error("Error fetching YouTube playlists:", error);
      res.status(500).json({ message: error.message });
    }
  });
}

module.exports = new YouTubeController();
