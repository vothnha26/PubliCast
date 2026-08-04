const helpCenterService = require('../../services/workspace/help-center.service');
const asyncHandler = require('../../utils/async-handler');

class HelpCenterController {
  listArticles = asyncHandler(async (req, res) => {
    const { category } = req.query;
    const data = await helpCenterService.listArticles({ category });
    res.status(200).json({
      message: 'Help articles retrieved successfully',
      data
    });
  });

  getArticleBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const data = await helpCenterService.getArticleBySlug(slug);
    res.status(200).json({
      message: 'Help article retrieved successfully',
      data
    });
  });

  ask = asyncHandler(async (req, res) => {
    const { question } = req.body;
    const data = await helpCenterService.askQuestion(question, req.user.id);
    res.status(200).json({
      message: 'Answer generated successfully',
      data
    });
  });
}

module.exports = new HelpCenterController();
