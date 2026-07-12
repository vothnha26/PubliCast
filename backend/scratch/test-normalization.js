const postService = require('../src/services/workspace/post.service');

const badPostData = {
  title: 'Test Escape',
  caption: 'Tây Ban Nha vs Áo \\u',
  targetPlatforms: ['FACEBOOK'],
  mediaUrls: ['D:\\Fullit\\projects\\PubliCast\\backend\\uploads\\media_123.png'],
  mediaThumbnailUrls: ['D:\\Fullit\\projects\\PubliCast\\backend\\uploads\\media_123_thumb.png'],
  options: {
    youtubeThumbnail: 'D:\\Fullit\\projects\\PubliCast\\backend\\uploads\\media_123_thumb.png',
    albumMedia: [
      'D:\\Fullit\\projects\\PubliCast\\backend\\uploads\\media_123_thumb.png',
      { url: 'D:\\Fullit\\projects\\PubliCast\\backend\\uploads\\media_123_thumb.png' }
    ],
    someNestedObject: {
      nestedPath: 'D:\\Fullit\\projects\\PubliCast\\backend\\uploads\\nested.png'
    },
    someStringWithoutPath: 'Tây Ban Nha \\ Áo' // should NOT be normalized
  }
};

const result = postService._preparePostData(badPostData, 'user-123', 'brand-123');
console.log('Result metadata:', result.metadata);
console.log('Result mediaUrls:', result.mediaUrls);
console.log('Result mediaThumbnailUrls:', result.mediaThumbnailUrls);
console.log('Result caption:', result.caption);
