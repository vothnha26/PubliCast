const BasePresetStrategy = require('./base-preset.strategy');

class FacebookPresetStrategy extends BasePresetStrategy {
  mapToOptions(meta) {
    const options = {};
    if (meta.facebookContentType) options.facebookType = meta.facebookContentType;
    if (meta.facebookTitle) options.facebookTitle = meta.facebookTitle;
    if (meta.facebookReelThumbnail) options.facebookReelThumbnail = meta.facebookReelThumbnail;
    if (meta.facebookReelCollaboratorId) options.facebookReelCollaboratorId = meta.facebookReelCollaboratorId;
    if (meta.facebookReelPlaceId) {
      options.facebookReelPlaceId = meta.facebookReelPlaceId;
      options.placeId = meta.facebookReelPlaceId;
    }
    return options;
  }
}

module.exports = new FacebookPresetStrategy();
