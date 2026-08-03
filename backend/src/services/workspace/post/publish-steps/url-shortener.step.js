const BaseStep = require('../../../../core/pipeline/base.step');
const urlShortenerService = require('../../url-shortener.service');
const logger = require('../../../../utils/logger');

class UrlShortenerStep extends BaseStep {
  async execute(context) {
    const { post, options, brandId } = context;

    // Check if URL shortener option is enabled
    if (options && options.useUrlShortener) {
      logger.debug(`[UrlShortenerStep] 🔗 Auto-shortening URLs for Post ${post.id}...`);

      // 1. Shorten URLs in Post Caption
      if (post.caption) {
        const shortenedCaption = await urlShortenerService.shortenUrlsInText(post.caption, brandId);
        if (shortenedCaption !== post.caption) {
          post.caption = shortenedCaption;
          logger.debug(`[UrlShortenerStep] ✅ Caption URLs shortened successfully.`);
        }
      }

      // 2. Shorten URLs in First Comment
      if (options.firstComment) {
        const shortenedComment = await urlShortenerService.shortenUrlsInText(options.firstComment, brandId);
        if (shortenedComment !== options.firstComment) {
          options.firstComment = shortenedComment;
          logger.debug(`[UrlShortenerStep] ✅ First Comment URLs shortened successfully.`);
        }
      }
    }
  }
}

module.exports = UrlShortenerStep;
