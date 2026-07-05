const productService = require('../../src/services/admin/product.service');
const productRepository = require('../../src/repositories/admin/product.repository');

jest.mock('../../src/repositories/admin/product.repository', () => ({
  getMatrixData: jest.fn(),
  enableProductMatrix: jest.fn(),
  disableProductMatrix: jest.fn(),
  createPlatform: jest.fn(),
  deletePlatform: jest.fn(),
  createModule: jest.fn(),
  deleteModule: jest.fn()
}));

describe('ProductService Unit Tests', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProductMatrix', () => {
    it('should call getMatrixData on repository', async () => {
      const mockResult = { platforms: [], modules: [], matrix: {} };
      productRepository.getMatrixData.mockResolvedValue(mockResult);

      const result = await productService.getProductMatrix();

      expect(result).toEqual(mockResult);
      expect(productRepository.getMatrixData).toHaveBeenCalledTimes(1);
    });
  });

  describe('enableProductMatrix', () => {
    it('should throw error if platformId or moduleId is missing', async () => {
      await expect(productService.enableProductMatrix('', 'M1')).rejects.toThrow('Platform ID and Module ID are required');
      await expect(productService.enableProductMatrix('YT', '')).rejects.toThrow('Platform ID and Module ID are required');
    });

    it('should call repository enableProductMatrix when valid inputs are provided', async () => {
      productRepository.enableProductMatrix.mockResolvedValue({ id: 'yt_m1', status: 'ACTIVE' });

      const result = await productService.enableProductMatrix('YT', 'M1', 'SKU-YT-M1');

      expect(result).toEqual({ id: 'yt_m1', status: 'ACTIVE' });
      expect(productRepository.enableProductMatrix).toHaveBeenCalledWith('YT', 'M1', 'SKU-YT-M1');
    });
  });

  describe('disableProductMatrix', () => {
    it('should throw error if platformId or moduleId is missing', async () => {
      await expect(productService.disableProductMatrix('', 'M1')).rejects.toThrow('Platform ID and Module ID are required');
    });

    it('should call repository disableProductMatrix when valid inputs are provided', async () => {
      productRepository.disableProductMatrix.mockResolvedValue({ id: 'yt_m1', status: 'INACTIVE' });

      const result = await productService.disableProductMatrix('YT', 'M1');

      expect(result).toEqual({ id: 'yt_m1', status: 'INACTIVE' });
      expect(productRepository.disableProductMatrix).toHaveBeenCalledWith('YT', 'M1');
    });
  });

  describe('createPlatform', () => {
    it('should throw error if id or name is missing', async () => {
      await expect(productService.createPlatform({ id: '', name: 'Threads' })).rejects.toThrow('Platform ID and Name are required');
    });

    it('should call repository createPlatform when valid inputs are provided', async () => {
      const platformData = { id: 'TH', name: 'Threads', color: '#000000' };
      productRepository.createPlatform.mockResolvedValue(platformData);

      const result = await productService.createPlatform(platformData);

      expect(result).toEqual(platformData);
      expect(productRepository.createPlatform).toHaveBeenCalledWith(platformData);
    });
  });

  describe('deletePlatform', () => {
    it('should call repository deletePlatform', async () => {
      productRepository.deletePlatform.mockResolvedValue({ id: 'YT' });

      const result = await productService.deletePlatform('YT');

      expect(result).toEqual({ id: 'YT' });
      expect(productRepository.deletePlatform).toHaveBeenCalledWith('YT');
    });
  });

  describe('createModule', () => {
    it('should throw error if id or name is missing', async () => {
      await expect(productService.createModule({ id: '', name: 'Ads' })).rejects.toThrow('Module ID and Name are required');
    });

    it('should call repository createModule when valid inputs are provided', async () => {
      const moduleData = { id: 'M5', name: 'Ads Campaign', description: 'Ads manager' };
      productRepository.createModule.mockResolvedValue(moduleData);

      const result = await productService.createModule(moduleData);

      expect(result).toEqual(moduleData);
      expect(productRepository.createModule).toHaveBeenCalledWith(moduleData);
    });
  });

  describe('deleteModule', () => {
    it('should call repository deleteModule', async () => {
      productRepository.deleteModule.mockResolvedValue({ id: 'M1' });

      const result = await productService.deleteModule('M1');

      expect(result).toEqual({ id: 'M1' });
      expect(productRepository.deleteModule).toHaveBeenCalledWith('M1');
    });
  });
});
