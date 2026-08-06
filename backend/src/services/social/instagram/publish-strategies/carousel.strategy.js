const InstagramPublishStrategy = require('./publish.strategy');
const instagramGateway = require('../instagram.gateway');
const { MEDIA_EXTENSIONS } = require('../../../../utils/constants');

class CarouselPublishStrategy extends InstagramPublishStrategy {
  async publish(igAccountId, accessToken, postData) {
    if (accessToken.startsWith('mock-')) {
      return { id: `ig_mock_carousel_${Date.now()}` };
    }

    const { mediaUrls = [], caption, scheduledAt, altText } = postData;
    if (mediaUrls.length === 0) {
      throw new Error('At least one media URL is required for Instagram Carousel');
    }
    if (mediaUrls.length > 10) {
      throw new Error('Instagram carousel posts support a maximum of 10 images/videos.');
    }

    // 1. Tạo các container con cho từng tệp phương tiện
    const childrenIds = [];
    for (const rawUrl of mediaUrls) {
      const url = this.resolveUrl(rawUrl);
      const isVideo = MEDIA_EXTENSIONS.VIDEO.some(ext => url.toLowerCase().endsWith(ext));
      const itemContainer = await instagramGateway.createCarouselItemContainer(igAccountId, accessToken, url, isVideo, altText);
      
      if (isVideo) {
        await this.pollUntilReady(instagramGateway, itemContainer.id, accessToken);
      }
      childrenIds.push(itemContainer.id);
    }

    // 2. Tạo container cha liên kết các container con
    const parentContainer = await instagramGateway.createCarouselContainer(igAccountId, accessToken, childrenIds, caption, scheduledAt, postData.options);

    // 2b. Chờ container cha xử lý xong trước khi publish — publishing
    // immediately after creation (before Meta finishes assembling the
    // carousel from its children) intermittently fails with
    // "Media upload has failed with error code 2207082" even though every
    // child container was itself already FINISHED. Video children were
    // already polled individually above; the parent carousel container
    // needs its own poll regardless of whether it contains images, video,
    // or a mix.
    await this.pollUntilReady(instagramGateway, parentContainer.id, accessToken);

    // 3. Xuất bản container cha
    return instagramGateway.publishContainer(igAccountId, accessToken, parentContainer.id);
  }
}

module.exports = CarouselPublishStrategy;
