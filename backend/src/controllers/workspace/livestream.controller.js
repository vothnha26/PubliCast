const livestreamService = require('../../services/workspace/livestream.service');
const asyncHandler = require('../../utils/async-handler');

class LivestreamController {
  /**
   * GET /api/livestreams/history
   * Fetch stream history with filters
   */
  getStreamHistory = asyncHandler(async (req, res) => {
    const brandId = req.query.brandId || 'default-brand';
    const result = await livestreamService.getStreamHistory(req.query, brandId);

    res.status(200).json({
      message: 'Stream history retrieved successfully',
      ...result
    });
  });

  /**
   * GET /api/livestreams/:id
   * Fetch single stream details
   */
  getStreamById = asyncHandler(async (req, res) => {
    const stream = await livestreamService.getStreamById(req.params.id);
    if (!stream) {
      return res.status(404).json({ message: 'Livestream not found' });
    }
    res.status(200).json({
      message: 'Stream details retrieved successfully',
      data: stream
    });
  });
}

module.exports = new LivestreamController();
