const instagramService = require('../../services/social/instagram');
const asyncHandler = require('../../utils/async-handler');

class InstagramController {
  getInstagramPublishedPosts = asyncHandler(async (req, res) => {
    const { brandId, pageToken, limit } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    
    const result = await instagramService.getPublishedVideos(brandId, pageToken || null, limit ? parseInt(limit) : 10);
    res.json(result);
  });

  searchAudio = asyncHandler(async (req, res) => {
    const { brandId, q } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    
    const result = await instagramService.searchAudio(brandId, q || '');
    res.json(result);
  });
}

module.exports = new InstagramController();
