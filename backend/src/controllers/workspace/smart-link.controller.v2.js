const smartLinkService = require('../../services/workspace/smart-link.service');
const smartLinkAnalyticsService = require('../../services/workspace/smart-link-analytics.service');
const asyncHandler = require('../../utils/async-handler');
const logger = require('../../utils/logger');
const { v2Success, v2Error } = require('../../utils/response.helper');

class SmartLinkControllerV2 {
  getSmartLink = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    const smartLink = await smartLinkService.getSmartLinkByBrand(brandId);
    v2Success(res, smartLink, 'SmartLink retrieved successfully');
  });

  listSmartLinks = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    const smartLinks = await smartLinkService.getAllByBrand(brandId);
    v2Success(res, smartLinks, 'SmartLinks retrieved successfully');
  });

  getSmartLinkById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    const smartLink = await smartLinkService.getById(id, brandId);
    v2Success(res, smartLink, 'SmartLink retrieved successfully');
  });

  cloneSmartLink = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    const cloned = await smartLinkService.cloneSmartLink(id, brandId);
    v2Success(res, cloned, 'SmartLink cloned successfully', 201);
  });

  deleteSmartLink = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    await smartLinkService.deleteSmartLink(id, brandId);
    v2Success(res, null, 'SmartLink deleted successfully');
  });

  createSmartLink = asyncHandler(async (req, res) => {
    const { brandId, ...payload } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    const newSmartLink = await smartLinkService.createSmartLink(brandId, payload);
    v2Success(res, newSmartLink, 'SmartLink created successfully', 201);
  });

  updateSmartLink = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId, ...payload } = req.body;
    if (!brandId) return v2Error(res, 'brandId is required', 400);
    const updatedSmartLink = await smartLinkService.updateSmartLink(id, brandId, payload);
    v2Success(res, updatedSmartLink, 'SmartLink updated successfully');
  });

  getAnalytics = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId, from, to } = req.query;
    if (!brandId) return v2Error(res, 'brandId is required', 400);

    const analytics = await smartLinkService.getAnalytics(id, brandId, { from, to });
    v2Success(res, analytics, 'SmartLink analytics retrieved successfully');
  });

  getPublicSmartLink = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const smartLink = await smartLinkService.getPublicSmartLinkBySlug(slug);

    smartLinkAnalyticsService.trackPageView(
      smartLink.id,
      req.ip,
      req.headers['user-agent']
    ).catch(err => logger.error('[SmartLinkControllerV2] Failed to log page view async', err));

    v2Success(res, smartLink, 'Public SmartLink retrieved successfully');
  });

  trackLinkClick = asyncHandler(async (req, res) => {
    const { linkItemId } = req.params;
    await smartLinkAnalyticsService.trackLinkClick(
      linkItemId,
      req.ip,
      req.headers['user-agent']
    );
    v2Success(res, null, 'Link click tracked successfully');
  });
}

module.exports = new SmartLinkControllerV2();
