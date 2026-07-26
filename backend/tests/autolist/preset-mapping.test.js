const postService = require('../../src/services/workspace/post.service');

describe('AutoList Preset Mapping Suite', () => {
  describe('_mapAutoListPresets', () => {
    it('should correctly map Threads whoCanReply preset option', () => {
      const meta = {
        threadsWhoCanReply: 'accounts_you_follow'
      };
      const mapped = postService._mapAutoListPresets(meta);
      expect(mapped).toEqual({
        threadsWhoCanReply: 'accounts_you_follow'
      });
      expect(mapped.threadsType).toBeUndefined();
    });

    it('should correctly map TikTok preset options and canonicalize privacy', () => {
      const meta = {
        tiktokPrivacy: 'MUTUAL_FOLLOW_FRIENDS',
        tiktokAllowComments: true,
        tiktokAllowDuet: false,
        tiktokAllowStitch: true
      };
      const mapped = postService._mapAutoListPresets(meta);
      expect(mapped).toEqual({
        tiktokPrivacy: 'friends',
        tiktokAllowComments: true,
        tiktokAllowDuet: false,
        tiktokAllowStitch: true
      });
    });

    it('should correctly map Facebook preset options including title and reel thumbnail', () => {
      const meta = {
        facebookContentType: 'reel',
        facebookTitle: 'Default FB Title',
        facebookReelThumbnail: 'https://example.com/fb-thumb.jpg'
      };
      const mapped = postService._mapAutoListPresets(meta);
      expect(mapped).toEqual({
        facebookType: 'reel',
        facebookTitle: 'Default FB Title',
        facebookReelThumbnail: 'https://example.com/fb-thumb.jpg'
      });
    });

    it('should correctly map YouTube preset options and alias keys for publisher compatibility', () => {
      const meta = {
        youtubeVideoType: 'short',
        youtubeTitle: 'Default YouTube Short Title',
        youtubePrivacy: 'unlisted',
        youtubeMadeForKids: false,
        youtubeCategory: '22',
        youtubePlaylistId: 'PL123456789',
        youtubeTags: 'tech, vlogger',
        youtubeThumbnail: 'https://example.com/yt-thumb.jpg'
      };
      const mapped = postService._mapAutoListPresets(meta);
      expect(mapped).toEqual({
        youtubeType: 'short',
        youtubeTitle: 'Default YouTube Short Title',
        youtubePrivacy: 'unlisted',
        privacyStatus: 'unlisted',
        youtubeMadeForKids: false,
        madeForKids: false,
        youtubeCategory: '22',
        categoryId: '22',
        youtubePlaylistId: 'PL123456789',
        playlistId: 'PL123456789',
        youtubeTags: 'tech, vlogger',
        tags: 'tech, vlogger',
        youtubeThumbnail: 'https://example.com/yt-thumb.jpg'
      });
    });

    it('should ignore missing or undefined preset fields', () => {
      const meta = {};
      const mapped = postService._mapAutoListPresets(meta);
      expect(mapped).toEqual({});
    });
  });
});
