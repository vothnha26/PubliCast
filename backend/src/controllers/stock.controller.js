const stockMediaFacade = require('../services/stock/stock-media.facade');
const asyncHandler = require('../utils/async-handler');
const { STOCK_PROVIDERS, STOCK_MEDIA_TYPES } = require('../utils/constants');

class StockController {
  /**
   * GET /api/stock/search
   * Query: provider, query, page, perPage, mediaType, orientation
   */
  searchMedia = asyncHandler(async (req, res) => {
    const { 
      provider = STOCK_PROVIDERS.UNSPLASH, 
      query, 
      page = 1, 
      perPage = 20, 
      mediaType = STOCK_MEDIA_TYPES.PHOTO, 
      orientation 
    } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        message: 'Search query parameter is required',
        items: [],
        total: 0,
        page: Number(page)
      });
    }

    const result = await stockMediaFacade.search({
      provider: provider.toUpperCase(),
      query: query.trim(),
      page: Number(page),
      perPage: Number(perPage),
      mediaType: mediaType.toUpperCase(),
      orientation
    });

    res.status(200).json({
      message: 'Stock media retrieved successfully',
      ...result
    });
  });

  /**
   * POST /api/stock/import
   * Body: { brandId, provider, externalId, downloadUrl, downloadLocationUrl, photographerName, photographerUrl, attributionHtml, mediaType }
   */
  importMedia = asyncHandler(async (req, res) => {
    const { 
      brandId, 
      provider = STOCK_PROVIDERS.UNSPLASH, 
      externalId, 
      downloadUrl, 
      downloadLocationUrl, 
      photographerName, 
      photographerUrl, 
      attributionHtml, 
      mediaType = STOCK_MEDIA_TYPES.PHOTO 
    } = req.body;

    if (!brandId || !downloadUrl || !externalId) {
      return res.status(400).json({
        message: 'brandId, externalId, and downloadUrl are required'
      });
    }

    const userId = req.user.id;

    const importedItem = await stockMediaFacade.importToMediaLibrary({
      brandId,
      userId,
      provider: provider.toUpperCase(),
      externalId,
      downloadUrl,
      downloadLocationUrl,
      photographerName,
      photographerUrl,
      attributionHtml,
      mediaType: mediaType.toUpperCase()
    });

    res.status(201).json({
      message: 'Stock media imported to library successfully',
      data: importedItem
    });
  });
}

module.exports = new StockController();
