const BasePresetStrategy = require('./base-preset.strategy');

class InstagramPresetStrategy extends BasePresetStrategy {
  mapToOptions(meta) {
    const options = {};
    if (meta.instagramContentType) options.instagramType = meta.instagramContentType;
    if (meta.instagramCollaborators) options.instagramCollaborators = meta.instagramCollaborators;
    if (meta.instagramAudio) options.instagramAudio = meta.instagramAudio;
    if (meta.instagramShowOnFeed !== undefined) options.instagramShowOnFeed = meta.instagramShowOnFeed;
    return options;
  }
}

module.exports = new InstagramPresetStrategy();
