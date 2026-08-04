jest.mock('../../src/repositories/admin/template.repository', () => ({
  findAllCategoriesWithTemplates: jest.fn(),
  findCategoryByName: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  createTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn()
}));

const templateService = require('../../src/services/admin/template.service');
const templateRepository = require('../../src/repositories/admin/template.repository');

describe('TemplateService', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('getFeaturedTemplates', () => {
    it('reads directly from the DB', async () => {
      templateRepository.findAllCategoriesWithTemplates.mockResolvedValue([{ id: 'cat-1', name: 'Tip', templates: [] }]);

      const result = await templateService.getFeaturedTemplates();

      expect(templateRepository.findAllCategoriesWithTemplates).toHaveBeenCalled();
      expect(result).toEqual([{ id: 'cat-1', name: 'Tip', templates: [] }]);
    });
  });

  describe('createCategory', () => {
    it('rejects an empty/whitespace-only name', async () => {
      await expect(templateService.createCategory({ name: '   ' })).rejects.toMatchObject({ status: 400 });
      expect(templateRepository.createCategory).not.toHaveBeenCalled();
    });

    it('rejects a duplicate category name', async () => {
      templateRepository.findCategoryByName.mockResolvedValue({ id: 'cat-1', name: 'Tip' });

      await expect(templateService.createCategory({ name: 'Tip' })).rejects.toMatchObject({ status: 409 });
      expect(templateRepository.createCategory).not.toHaveBeenCalled();
    });

    it('creates the category', async () => {
      templateRepository.findCategoryByName.mockResolvedValue(null);
      templateRepository.createCategory.mockResolvedValue({ id: 'cat-1', name: 'Tip', sortOrder: 0 });

      const result = await templateService.createCategory({ name: '  Tip  ' });

      expect(templateRepository.createCategory).toHaveBeenCalledWith({ name: 'Tip', sortOrder: undefined });
      expect(result).toEqual({ id: 'cat-1', name: 'Tip', sortOrder: 0 });
    });
  });

  describe('deleteCategory', () => {
    it('deletes the category', async () => {
      templateRepository.deleteCategory.mockResolvedValue({});

      const result = await templateService.deleteCategory('cat-1');

      expect(templateRepository.deleteCategory).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual({ message: 'Category deleted successfully' });
    });
  });

  describe('createTemplate', () => {
    it('rejects when categoryIds is missing', async () => {
      await expect(templateService.createTemplate({ title: 'x', description: 'y' })).rejects.toMatchObject({ status: 400 });
      expect(templateRepository.createTemplate).not.toHaveBeenCalled();
    });

    it('rejects when categoryIds is an empty array', async () => {
      await expect(templateService.createTemplate({ categoryIds: [], title: 'x', description: 'y' }))
        .rejects.toMatchObject({ status: 400 });
      expect(templateRepository.createTemplate).not.toHaveBeenCalled();
    });

    it('rejects when title or description is missing', async () => {
      await expect(templateService.createTemplate({ categoryIds: ['cat-1'], title: '  ', description: 'y' }))
        .rejects.toMatchObject({ status: 400 });
      expect(templateRepository.createTemplate).not.toHaveBeenCalled();
    });

    it('creates the template tagged under multiple categories with trimmed fields', async () => {
      templateRepository.createTemplate.mockResolvedValue({ id: 'tpl-1' });

      await templateService.createTemplate({
        categoryIds: ['cat-1', 'cat-2'],
        emoji: '🛠️',
        title: '  My title  ',
        description: '  My description  ',
        body: '  Trend: {{finding}}  ',
        format: 'VIDEO',
        goal: 'ENGAGEMENT'
      });

      expect(templateRepository.createTemplate).toHaveBeenCalledWith({
        categoryIds: ['cat-1', 'cat-2'],
        emoji: '🛠️',
        title: 'My title',
        description: 'My description',
        body: 'Trend: {{finding}}',
        format: 'VIDEO',
        goal: 'ENGAGEMENT'
      });
    });

    it('rejects an invalid format value', async () => {
      await expect(templateService.createTemplate({
        categoryIds: ['cat-1'], title: 'x', description: 'y', format: 'GIF'
      })).rejects.toMatchObject({ status: 400 });
      expect(templateRepository.createTemplate).not.toHaveBeenCalled();
    });

    it('rejects an invalid goal value', async () => {
      await expect(templateService.createTemplate({
        categoryIds: ['cat-1'], title: 'x', description: 'y', goal: 'GROWTH'
      })).rejects.toMatchObject({ status: 400 });
      expect(templateRepository.createTemplate).not.toHaveBeenCalled();
    });

    it('stores a null body when body is omitted', async () => {
      templateRepository.createTemplate.mockResolvedValue({ id: 'tpl-1' });

      await templateService.createTemplate({
        categoryIds: ['cat-1'],
        title: 'Title',
        description: 'Description'
      });

      expect(templateRepository.createTemplate).toHaveBeenCalledWith(
        expect.objectContaining({ body: null })
      );
    });
  });

  describe('updateTemplate', () => {
    it('rejects an empty title on update', async () => {
      await expect(templateService.updateTemplate('tpl-1', { title: '   ' })).rejects.toMatchObject({ status: 400 });
      expect(templateRepository.updateTemplate).not.toHaveBeenCalled();
    });

    it('rejects clearing categoryIds to an empty array', async () => {
      await expect(templateService.updateTemplate('tpl-1', { categoryIds: [] })).rejects.toMatchObject({ status: 400 });
      expect(templateRepository.updateTemplate).not.toHaveBeenCalled();
    });

    it('updates only the provided fields', async () => {
      templateRepository.updateTemplate.mockResolvedValue({ id: 'tpl-1', title: 'New title' });

      await templateService.updateTemplate('tpl-1', { title: 'New title' });

      expect(templateRepository.updateTemplate).toHaveBeenCalledWith('tpl-1', { title: 'New title' });
    });

    it('replaces the category assignment when categoryIds is provided', async () => {
      templateRepository.updateTemplate.mockResolvedValue({ id: 'tpl-1', categories: [] });

      await templateService.updateTemplate('tpl-1', { categoryIds: ['cat-1', 'cat-3'] });

      expect(templateRepository.updateTemplate).toHaveBeenCalledWith('tpl-1', { categoryIds: ['cat-1', 'cat-3'] });
    });

    it('trims and updates the body field', async () => {
      templateRepository.updateTemplate.mockResolvedValue({ id: 'tpl-1' });

      await templateService.updateTemplate('tpl-1', { body: '  New body  ' });

      expect(templateRepository.updateTemplate).toHaveBeenCalledWith('tpl-1', { body: 'New body' });
    });
  });

  describe('deleteTemplate', () => {
    it('deletes the template', async () => {
      templateRepository.deleteTemplate.mockResolvedValue({});

      const result = await templateService.deleteTemplate('tpl-1');

      expect(templateRepository.deleteTemplate).toHaveBeenCalledWith('tpl-1');
      expect(result).toEqual({ message: 'Template deleted successfully' });
    });
  });
});
