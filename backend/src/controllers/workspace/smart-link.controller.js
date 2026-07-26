const smartLinkService = require('../../services/workspace/smart-link.service');
const smartLinkAnalyticsService = require('../../services/workspace/smart-link-analytics.service');
const asyncHandler = require('../../utils/async-handler');

class SmartLinkController {
  getSmartLink = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }
    const smartLink = await smartLinkService.getSmartLinkByBrand(brandId);
    res.status(200).json({
      message: 'SmartLink retrieved successfully',
      data: smartLink
    });
  });

  createSmartLink = asyncHandler(async (req, res) => {
    const { brandId, ...payload } = req.body;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }
    const newSmartLink = await smartLinkService.createSmartLink(brandId, payload);
    res.status(201).json({
      message: 'SmartLink created successfully',
      data: newSmartLink
    });
  });

  updateSmartLink = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId, ...payload } = req.body;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }
    const updatedSmartLink = await smartLinkService.updateSmartLink(id, brandId, payload);
    res.status(200).json({
      message: 'SmartLink updated successfully',
      data: updatedSmartLink
    });
  });

  getAnalytics = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { brandId, from, to } = req.query;
    if (!brandId) {
      return res.status(400).json({ message: 'brandId is required' });
    }

    const analytics = await smartLinkService.getAnalytics(id, brandId, { from, to });
    res.status(200).json({
      message: 'SmartLink analytics retrieved successfully',
      data: analytics
    });
  });

  getPublicSmartLink = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const smartLink = await smartLinkService.getPublicSmartLinkBySlug(slug);
    
    // Log Page Visitor asynchronously (Luồng B)
    smartLinkAnalyticsService.trackPageView(
      smartLink.id,
      req.ip,
      req.headers['user-agent']
    ).catch(err => console.error('Failed to log page view async', err));

    res.status(200).json({
      message: 'Public SmartLink retrieved successfully',
      data: smartLink
    });
  });

  trackLinkClick = asyncHandler(async (req, res) => {
    const { linkItemId } = req.params;
    await smartLinkAnalyticsService.trackLinkClick(
      linkItemId,
      req.ip,
      req.headers['user-agent']
    );
    res.status(200).json({
      message: 'Link click tracked successfully'
    });
  });

  redirectLinkClick = asyncHandler(async (req, res) => {
    const { linkItemId } = req.params;

    // HEAD requests thường là bot/crawler kiểm tra link — không track click.
    if (req.method === 'HEAD') {
      return res.sendStatus(200);
    }

    const linkItem = await smartLinkAnalyticsService.trackLinkClick(
      linkItemId,
      req.ip,
      req.headers['user-agent']
    );

    const targetUrl = linkItem.url.startsWith('http') ? linkItem.url : `https://${linkItem.url}`;
    return res.redirect(302, targetUrl);
  });
}

module.exports = new SmartLinkController();
