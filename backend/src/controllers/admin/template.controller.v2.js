const templateService = require('../../services/admin/template.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

class AdminTemplateControllerV2 {
  getFeaturedTemplates = asyncHandler(async (req, res) => {
    const data = await templateService.getFeaturedTemplates();
    v2Success(res, data, 'Templates retrieved successfully');
  });

  createCategory = asyncHandler(async (req, res) => {
    const { name, sortOrder } = req.body;
    const data = await templateService.createCategory({ name, sortOrder });
    v2Success(res, data, 'Category created successfully', 201);
  });

  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, sortOrder } = req.body;
    const data = await templateService.updateCategory(id, { name, sortOrder });
    v2Success(res, data, 'Category updated successfully');
  });

  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await templateService.deleteCategory(id);
    v2Success(res, null, result.message);
  });

  createTemplate = asyncHandler(async (req, res) => {
    const { categoryIds, emoji, title, description, body, format, goal } = req.body;
    const data = await templateService.createTemplate({ categoryIds, emoji, title, description, body, format, goal });
    v2Success(res, data, 'Template created successfully', 201);
  });

  updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { categoryIds, emoji, title, description, body, format, goal } = req.body;
    const data = await templateService.updateTemplate(id, { categoryIds, emoji, title, description, body, format, goal });
    v2Success(res, data, 'Template updated successfully');
  });

  deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await templateService.deleteTemplate(id);
    v2Success(res, null, result.message);
  });
}

module.exports = new AdminTemplateControllerV2();
