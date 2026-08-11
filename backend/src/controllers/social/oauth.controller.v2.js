const oauthController = require('./oauth.controller');
const { v2Success } = require('../../utils/response.helper');
const asyncHandler = require('../../utils/async-handler');

/**
 * v2 wrapper around OAuthController's auth-URL endpoints only — the
 * redirect-based OAuth callbacks (googleCallback/facebookCallback/etc.)
 * stay v1-only since they 302 the browser rather than return JSON, so a
 * v2 envelope has no meaning for them. Delegates to the same v1 instance
 * (not a reimplementation) so the actual OAuth/service logic has exactly
 * one copy; this file only reshapes the response envelope.
 */
class OAuthControllerV2 {
  getGoogleAuthUrl = asyncHandler(async (req, res) => {
    const { brandId, frontendOrigin } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = await oauthController._buildGoogleAuthUrl(req, brandId, frontendOrigin);
    v2Success(res, { url });
  });

  getGoogleDriveAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = await oauthController._buildGoogleDriveAuthUrl(req, brandId);
    v2Success(res, { url });
  });

  getFacebookAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = oauthController._buildFacebookAuthUrl(req, brandId);
    v2Success(res, { url });
  });

  getInstagramAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = oauthController._buildInstagramAuthUrl(req, brandId);
    v2Success(res, { url });
  });

  getTikTokAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = await oauthController._buildTikTokAuthUrl(req, brandId);
    v2Success(res, { url });
  });

  getThreadsAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    if (!brandId) return res.status(400).json({ message: 'brandId is required' });
    const url = oauthController._buildThreadsAuthUrl(req, brandId);
    v2Success(res, { url });
  });
}

module.exports = new OAuthControllerV2();
