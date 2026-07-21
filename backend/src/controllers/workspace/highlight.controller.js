const highlightService = require('../../services/workspace/highlight.service');
const asyncHandler = require('../../utils/async-handler');

const createHighlight = asyncHandler(async (req, res) => {
  const { youtubeUrl, brandId } = req.body;
  const highlight = await highlightService.createHighlightTask(youtubeUrl, brandId);
  res.status(201).json({
    status: 'success',
    data: { highlight }
  });
});

const getHighlight = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const highlight = await highlightService.getHighlightStatus(id, req.user.id);
  res.status(200).json({
    status: 'success',
    data: { highlight }
  });
});

const updateHighlightCallback = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const highlight = await highlightService.updateHighlightStatus(id, updateData);
  
  res.status(200).json({
    status: 'success',
    data: { highlight }
  });
});

const publishHighlightToYouTube = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, brandId } = req.body;
  const result = await highlightService.publishToYouTube(id, brandId, title, description, req.user.id);
  res.status(200).json({
    status: 'success',
    data: result
  });
});

module.exports = {
  createHighlight,
  getHighlight,
  updateHighlightCallback,
  publishHighlightToYouTube
};
