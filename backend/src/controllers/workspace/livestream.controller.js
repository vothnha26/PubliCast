const livestreamService = require('../../services/workspace/livestream.service');
const asyncHandler = require('../../utils/async-handler');
const jwtUtils = require('../../utils/jwt.utils');

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
    const stream = await livestreamService.getStreamById(req.params.id, req.user.id);
    if (!stream) {
      return res.status(404).json({ message: 'Livestream not found' });
    }
    res.status(200).json({
      message: 'Stream details retrieved successfully',
      data: stream
    });
  });

  /**
   * GET /api/livestreams/:id/overlay-token
   * Mint a short-lived, single-livestream overlay token for embedding in
   * the OBS Browser Source link (see #173). Reuses getStreamById's brand
   * access check so only someone who can already view this stream can
   * generate a link for it.
   */
  getOverlayToken = asyncHandler(async (req, res) => {
    const stream = await livestreamService.getStreamById(req.params.id, req.user.id);
    if (!stream) {
      return res.status(404).json({ message: 'Livestream not found' });
    }
    const token = jwtUtils.generateOverlayToken({ livestreamId: req.params.id });
    res.status(200).json({
      message: 'Overlay token generated successfully',
      data: { token }
    });
  });
}

module.exports = new LivestreamController();
