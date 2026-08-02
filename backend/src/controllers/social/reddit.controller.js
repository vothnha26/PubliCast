const redditService = require('../../services/social/reddit/reddit.service');
const redditGateway = require('../../services/social/reddit/reddit.gateway');
const socialAccountRepository = require('../../repositories/social/social-account.repository');
const { PLATFORMS } = require('../../utils/constants');

class RedditController {
  async getAuthUrl(req, res, next) {
    try {
      const { brandId } = req.query;
      const state = brandId ? JSON.stringify({ brandId }) : 'reddit_auth';
      const url = redditGateway.getAuthUrl(state);
      return res.json({ success: true, url });
    } catch (error) {
      next(error);
    }
  }

  async callback(req, res, next) {
    try {
      const { code, state, error } = req.query;

      if (error) {
        return res.status(400).json({ success: false, message: `Reddit OAuth error: ${error}` });
      }

      let brandId;
      if (state) {
        try {
          const parsed = JSON.parse(state);
          brandId = parsed.brandId;
        } catch (e) {
          brandId = state;
        }
      }

      if (!brandId) {
        return res.status(400).json({ success: false, message: 'Missing brandId in OAuth state' });
      }

      const account = await redditService.connectChannel(brandId, code);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/dashboard/brand/${brandId}/settings/connections?connected=reddit`);
    } catch (error) {
      next(error);
    }
  }

  async getUserSubreddits(req, res, next) {
    try {
      const { brandId } = req.query;
      const subreddits = await redditService.getUserSubreddits(brandId);
      return res.json({ success: true, data: subreddits });
    } catch (error) {
      next(error);
    }
  }

  async searchSubreddits(req, res, next) {
    try {
      const { brandId, q } = req.query;
      const subreddits = await redditService.searchSubreddits(brandId, q || '');
      return res.json({ success: true, data: subreddits });
    } catch (error) {
      next(error);
    }
  }

  async getSubredditFlairs(req, res, next) {
    try {
      const { brandId } = req.query;
      const { subreddit } = req.params;
      const flairs = await redditService.getSubredditFlairs(brandId, subreddit);
      return res.json({ success: true, data: flairs });
    } catch (error) {
      next(error);
    }
  }

  async disconnect(req, res, next) {
    try {
      const { brandId, socialAccountId } = req.body;
      if (socialAccountId) {
        await socialAccountRepository.deleteByIdAndBrand(brandId, socialAccountId);
      } else {
        await socialAccountRepository.deleteManyByBrandAndPlatform(brandId, PLATFORMS.REDDIT);
      }
      return res.json({ success: true, message: 'Disconnected Reddit account successfully' });
    } catch (error) {
      next(error);
    }
  }

  async submitPost(req, res, next) {
    try {
      const { brandId, ...postData } = req.body;
      const result = await redditService.publishPost(brandId, postData);
      return res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RedditController();
