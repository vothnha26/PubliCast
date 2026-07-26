const youtubePublishService = require('../../src/services/social/youtube/youtube-publish.service');

describe('YouTube Title & Description Extraction Logic', () => {
  it('should extract first sentence as title and remaining text as description', () => {
    const postData = {
      title: 'Untitled Post',
      caption: 'This is the first sentence of my video.\n\nThis is paragraph two containing the detailed description.'
    };
    const options = {};

    const metadata = youtubePublishService._prepareMetadata(postData, options);
    expect(metadata.title).toBe('This is the first sentence of my video.');
    expect(metadata.description).toBe('This is paragraph two containing the detailed description.');
  });

  it('should respect explicit youtubeTitle option when provided', () => {
    const postData = {
      title: 'Untitled Post',
      caption: 'First sentence.\n\nSecond paragraph.'
    };
    const options = {
      youtubeTitle: 'Custom Preset Title'
    };

    const metadata = youtubePublishService._prepareMetadata(postData, options);
    expect(metadata.title).toBe('Custom Preset Title');
    expect(metadata.description).toBe('First sentence.\n\nSecond paragraph.');
  });
});
