const brandService = require('../../services/workspace/brand.service');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

class BrandControllerV2 {
  getBrands = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const brands = await brandService.getUserBrands(userId);
    v2Success(res, brands, 'Brands retrieved successfully');
  });

  getBrandById = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const brandId = req.params.id;

    const brand = await brandService.getFullBrand(brandId, userId);

    v2Success(res, brand, 'Brand retrieved successfully');
  });

  createBrand = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, timezone, defaultLanguage } = req.body;

    if (!name || name.trim() === '') {
      return v2Error(res, 'Brand name is required', 400);
    }

    const newBrand = await brandService.createBrand(userId, {
      name: name.trim(),
      timezone,
      defaultLanguage
    });

    v2Success(res, newBrand, 'Brand created successfully', 201);
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

    v2Success(res, updatedBrand, 'Brand updated successfully');
  });

  deleteBrand = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const brandId = req.params.id;

    await brandService.deleteBrand(brandId, userId);

    v2Success(res, null, 'Brand deleted successfully');
  });
}

module.exports = new BrandControllerV2();
