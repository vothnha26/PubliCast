const productRepository = require('../../repositories/admin/product.repository');

class ProductService {
  async getProductMatrix() {
    return await productRepository.getMatrixData();
  }

  async enableProductMatrix(platformId, moduleId, sku) {
    if (!platformId || !moduleId) {
      throw new Error('Platform ID and Module ID are required');
    }
    return await productRepository.enableProductMatrix(platformId, moduleId, sku);
  }

  async disableProductMatrix(platformId, moduleId) {
    if (!platformId || !moduleId) {
      throw new Error('Platform ID and Module ID are required');
    }
    return await productRepository.disableProductMatrix(platformId, moduleId);
  }

  async createPlatform(data) {
    if (!data.id || !data.name) {
      throw new Error('Platform ID and Name are required');
    }
    return await productRepository.createPlatform(data);
  }

  async deletePlatform(id) {
    if (!id) throw new Error('Platform ID is required');
    return await productRepository.deletePlatform(id);
  }

  async createModule(data) {
    if (!data.id || !data.name) {
      throw new Error('Module ID and Name are required');
    }
    return await productRepository.createModule(data);
  }

  async deleteModule(id) {
    if (!id) throw new Error('Module ID is required');
    return await productRepository.deleteModule(id);
  }
}

module.exports = new ProductService();
