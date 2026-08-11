const productService = require('../../services/admin/product.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success } = require('../../utils/response.helper');

class ProductControllerV2 {
  getProductMatrix = asyncHandler(async (req, res) => {
    const data = await productService.getProductMatrix();
    v2Success(res, data, 'Product matrix retrieved successfully');
  });

  enableProductMatrix = asyncHandler(async (req, res) => {
    const { platformId, moduleId, sku } = req.body;
    const data = await productService.enableProductMatrix(platformId, moduleId, sku);
    v2Success(res, data, 'Platform module enabled successfully');
  });

  disableProductMatrix = asyncHandler(async (req, res) => {
    const { platformId, moduleId } = req.body;
    const data = await productService.disableProductMatrix(platformId, moduleId);
    v2Success(res, data, 'Platform module disabled successfully');
  });

  createPlatform = asyncHandler(async (req, res) => {
    const { id, name, color, image } = req.body;
    const data = await productService.createPlatform({ id, name, color, image });
    v2Success(res, data, 'Platform created successfully', 201);
  });

  deletePlatform = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await productService.deletePlatform(id);
    v2Success(res, null, 'Platform deleted successfully');
  });

  createModule = asyncHandler(async (req, res) => {
    const { id, name, description } = req.body;
    const finalId = id || `M${Math.floor(Math.random() * 1000)}`;
    const data = await productService.createModule({ id: finalId, name, description });
    v2Success(res, data, 'Module created successfully', 201);
  });

  deleteModule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await productService.deleteModule(id);
    v2Success(res, null, 'Module deleted successfully');
  });
}

module.exports = new ProductControllerV2();
