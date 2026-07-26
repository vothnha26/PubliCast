const BasePresetStrategy = require('./base-preset.strategy');

class YouTubePresetStrategy extends BasePresetStrategy {
  mapToOptions(meta) {
    const options = {};
    
    // Type & Title
    if (meta.youtubeVideoType) options.youtubeType = meta.youtubeVideoType;
    if (meta.youtubeTitle) options.youtubeTitle = meta.youtubeTitle;
    
    // Privacy & Audience
    if (meta.youtubePrivacy) {
      options.youtubePrivacy = meta.youtubePrivacy;
      options.privacyStatus = meta.youtubePrivacy; // Canonical key read by youtube-publish.service.js
    }
    if (meta.youtubeMadeForKids !== undefined) {
      options.youtubeMadeForKids = meta.youtubeMadeForKids;
      options.madeForKids = meta.youtubeMadeForKids;
    }
    
    // Category, Playlist & Tags (Map alias keys for publisher compatibility)
    if (meta.youtubeCategory || meta.categoryId) {
      const cat = meta.youtubeCategory || meta.categoryId;
      options.youtubeCategory = cat;
      options.categoryId = cat;
    }
    if (meta.youtubePlaylistId || meta.playlistId) {
      const pl = meta.youtubePlaylistId || meta.playlistId;
      options.youtubePlaylistId = pl;
      options.playlistId = pl;
    }
    if (meta.youtubeTags || meta.tags) {
      const tg = meta.youtubeTags || meta.tags;
      options.youtubeTags = tg;
      options.tags = tg;
    }
    
    // Thumbnail & First Comment
    if (meta.youtubeThumbnail) options.youtubeThumbnail = meta.youtubeThumbnail;
    if (meta.youtubeFirstComment || meta.firstComment) {
      options.youtubeFirstComment = meta.youtubeFirstComment || meta.firstComment;
    }

    return options;
  }
}

module.exports = new YouTubePresetStrategy();
