const productService = require('../../services/admin/product.service');
const asyncHandler = require('../../utils/async-handler');

class ProductController {
  getProductMatrix = asyncHandler(async (req, res) => {
    const data = await productService.getProductMatrix();
    res.status(200).json({
      message: 'Product matrix retrieved successfully',
      data
    });
  });

  enableProductMatrix = asyncHandler(async (req, res) => {
    const { platformId, moduleId, sku } = req.body;
    const data = await productService.enableProductMatrix(platformId, moduleId, sku);
    res.status(200).json({
      message: 'Platform module enabled successfully',
      data
    });
  });

  disableProductMatrix = asyncHandler(async (req, res) => {
    const { platformId, moduleId } = req.body;
    const data = await productService.disableProductMatrix(platformId, moduleId);
    res.status(200).json({
      message: 'Platform module disabled successfully',
      data
    });
  });

  createPlatform = asyncHandler(async (req, res) => {
    const { id, name, color, image } = req.body;
    const data = await productService.createPlatform({ id, name, color, image });
    res.status(201).json({
      message: 'Platform created successfully',
      data
    });
  });

  deletePlatform = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await productService.deletePlatform(id);
    res.status(200).json({
      message: 'Platform deleted successfully'
    });
  });

  createModule = asyncHandler(async (req, res) => {
    const { id, name, description } = req.body;
    // Generate id dynamically if not provided
    const finalId = id || `M${Math.floor(Math.random() * 1000)}`;
    const data = await productService.createModule({ id: finalId, name, description });
    res.status(201).json({
      message: 'Module created successfully',
      data
    });
  });

  deleteModule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await productService.deleteModule(id);
    res.status(200).json({
      message: 'Module deleted successfully'
    });
  });
}

module.exports = new ProductController();
