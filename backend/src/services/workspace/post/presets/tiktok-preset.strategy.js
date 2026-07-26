const BasePresetStrategy = require('./base-preset.strategy');
const { TIKTOK_PRIVACY_LEVELS } = require('../../../../constants/preset.constants');

class TikTokPresetStrategy extends BasePresetStrategy {
  mapToOptions(meta) {
    const options = {};
    if (meta.tiktokPrivacy) {
      // Chuẩn hóa privacy value (nếu nhận được alias như PUBLIC_TO_EVERYONE thì map về canonical value)
      const canonicalPrivacy = TIKTOK_PRIVACY_LEVELS[meta.tiktokPrivacy] || meta.tiktokPrivacy;
      options.tiktokPrivacy = canonicalPrivacy;
    }
    if (meta.tiktokAllowComments !== undefined) options.tiktokAllowComments = meta.tiktokAllowComments;
    if (meta.tiktokAllowDuet !== undefined) options.tiktokAllowDuet = meta.tiktokAllowDuet;
    if (meta.tiktokAllowStitch !== undefined) options.tiktokAllowStitch = meta.tiktokAllowStitch;
    if (meta.tiktokAiGenerated !== undefined) options.tiktokAiGenerated = meta.tiktokAiGenerated;
    if (meta.tiktokCommercialContent !== undefined) options.tiktokCommercialContent = meta.tiktokCommercialContent;
    return options;
  }
}

module.exports = new TikTokPresetStrategy();
