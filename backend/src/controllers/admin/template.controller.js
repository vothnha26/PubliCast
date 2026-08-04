const templateService = require('../../services/admin/template.service');
const asyncHandler = require('../../utils/async-handler');

class AdminTemplateController {
  getFeaturedTemplates = asyncHandler(async (req, res) => {
    const data = await templateService.getFeaturedTemplates();
    res.status(200).json({ message: 'Templates retrieved successfully', data });
  });

  createCategory = asyncHandler(async (req, res) => {
    const { name, sortOrder } = req.body;
    const data = await templateService.createCategory({ name, sortOrder });
    res.status(201).json({ message: 'Category created successfully', data });
  });

  updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, sortOrder } = req.body;
    const data = await templateService.updateCategory(id, { name, sortOrder });
    res.status(200).json({ message: 'Category updated successfully', data });
  });

  deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await templateService.deleteCategory(id);
    res.status(200).json({ message: result.message });
  });

  createTemplate = asyncHandler(async (req, res) => {
    const { categoryIds, emoji, title, description, body } = req.body;
    const data = await templateService.createTemplate({ categoryIds, emoji, title, description, body });
    res.status(201).json({ message: 'Template created successfully', data });
  });

  updateTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { categoryIds, emoji, title, description, body } = req.body;
    const data = await templateService.updateTemplate(id, { categoryIds, emoji, title, description, body });
    res.status(200).json({ message: 'Template updated successfully', data });
  });

  deleteTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await templateService.deleteTemplate(id);
    res.status(200).json({ message: result.message });
  });
}

module.exports = new AdminTemplateController();
