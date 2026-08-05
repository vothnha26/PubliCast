const helpArticleService = require('../../services/admin/help-article.service');
const asyncHandler = require('../../utils/async-handler');

class HelpArticleController {
  list = asyncHandler(async (req, res) => {
    const { status, category } = req.query;
    const data = await helpArticleService.list({ status, category });
    res.status(200).json({
      message: 'Help articles retrieved successfully',
      data
    });
  });

  getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await helpArticleService.getById(id);
    res.status(200).json({
      message: 'Help article retrieved successfully',
      data
    });
  });

  create = asyncHandler(async (req, res) => {
    const { title, slug, category, tags, contentJson, contentHtml } = req.body;
    const data = await helpArticleService.create({
      title,
      slug,
      category,
      tags,
      contentJson,
      contentHtml,
      authorId: req.user.id
    });
    res.status(201).json({
      message: 'Help article created successfully',
      data
    });
  });

  update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, slug, category, tags, contentJson, contentHtml } = req.body;
    const data = await helpArticleService.update(id, { title, slug, category, tags, contentJson, contentHtml });
    res.status(200).json({
      message: 'Help article updated successfully',
      data
    });
  });

  publish = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await helpArticleService.publish(id);
    res.status(200).json({
      message: 'Help article published successfully',
      data
    });
  });

  unpublish = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = await helpArticleService.unpublish(id);
    res.status(200).json({
      message: 'Help article unpublished successfully',
      data
    });
  });

  remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await helpArticleService.remove(id);
    res.status(200).json({
      message: 'Help article deleted successfully'
    });
  });
}

module.exports = new HelpArticleController();
