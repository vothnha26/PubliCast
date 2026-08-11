const redditService = require('../../services/social/reddit/reddit.service');
const redditGateway = require('../../services/social/reddit/reddit.gateway');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { PLATFORMS } = require('../../utils/constants');
const asyncHandler = require('../../utils/async-handler');
const { v2Success, v2Error } = require('../../utils/response.helper');

/**
 * v2 envelope wrapper around RedditController's non-redirect endpoints —
 * `callback` stays v1-only since it 302s the browser rather than returning
 * JSON. Delegates to the same redditService/redditGateway/repository the
 * v1 controller uses, only reshapes the response (v1's `success` field is
 * dropped — no frontend caller reads it, same as social-connection.controller.js).
 */
class RedditControllerV2 {
  getAuthUrl = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const state = brandId ? JSON.stringify({ brandId }) : 'reddit_auth';
    const url = redditGateway.getAuthUrl(state);
    v2Success(res, { url });
  });

  getUserSubreddits = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const subreddits = await redditService.getUserSubreddits(brandId);
    v2Success(res, subreddits);
  });

  searchSubreddits = asyncHandler(async (req, res) => {
    const { brandId, q } = req.query;
    const subreddits = await redditService.searchSubreddits(brandId, q || '');
    v2Success(res, subreddits);
  });

  getSubredditFlairs = asyncHandler(async (req, res) => {
    const { brandId } = req.query;
    const { subreddit } = req.params;
    const flairs = await redditService.getSubredditFlairs(brandId, subreddit);
    v2Success(res, flairs);
  });

  disconnect = asyncHandler(async (req, res) => {
    const { brandId, socialAccountId } = req.body;
    if (socialAccountId) {
      await socialAccountRepository.deleteByIdAndBrand(brandId, socialAccountId);
    } else {
      await socialAccountRepository.deleteManyByBrandAndPlatform(brandId, PLATFORMS.REDDIT);
    }
    v2Success(res, null, 'Disconnected Reddit account successfully');
  });

  submitPost = asyncHandler(async (req, res) => {
    const { brandId, ...postData } = req.body;
    const result = await redditService.publishPost(brandId, postData);
    v2Success(res, result);
  });
}

module.exports = new RedditControllerV2();
