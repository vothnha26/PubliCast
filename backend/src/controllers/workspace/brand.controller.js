const brandService = require('../../services/workspace/brand.service');
const asyncHandler = require('../../utils/async-handler');
const logger = require('../../utils/logger');

class BrandController {
  getBrands = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const brands = await brandService.getUserBrands(userId);
    logger.debug("=== GET /api/brands ===");
    brands.forEach(b => {
      logger.debug(`Brand: ${b.name} (${b.id})`);
      logger.debug(`Social Accounts:`);
      b.socialAccounts.forEach(sa => {
        logger.debug(` - ${sa.platform}: isConnected = ${sa.isConnected}`);
      });
    });
    res.status(200).json({
      message: 'Brands retrieved successfully',
      data: brands
    });
  });

  createBrand = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, timezone, defaultLanguage } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Brand name is required' });
    }

    const newBrand = await brandService.createBrand(userId, {
      name: name.trim(),
      timezone,
      defaultLanguage
    });

    res.status(201).json({
      message: 'Brand created successfully',
      data: newBrand
    });
  });

  updateBrand = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const brandId = req.params.id;
    const { name, timezone, defaultLanguage, logoUrl } = req.body;

    const updatedBrand = await brandService.updateBrand(brandId, userId, {
      name: name?.trim(),
      timezone,
      defaultLanguage,
      logoUrl
    });

    res.status(200).json({
      message: 'Brand updated successfully',
      data: updatedBrand
    });
  });

  deleteBrand = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const brandId = req.params.id;

    await brandService.deleteBrand(brandId, userId);

    res.status(200).json({
      message: 'Brand deleted successfully'
    });
  });
}

module.exports = new BrandController();
