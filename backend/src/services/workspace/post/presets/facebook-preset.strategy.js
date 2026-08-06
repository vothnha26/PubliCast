const BasePresetStrategy = require('./base-preset.strategy');

class FacebookPresetStrategy extends BasePresetStrategy {
  mapToOptions(meta) {
    const options = {};
    if (meta.facebookContentType) options.facebookType = meta.facebookContentType;
    if (meta.facebookTitle) options.facebookTitle = meta.facebookTitle;
    if (meta.facebookReelThumbnail) options.facebookReelThumbnail = meta.facebookReelThumbnail;
    return options;
  }
}

module.exports = new FacebookPresetStrategy();
