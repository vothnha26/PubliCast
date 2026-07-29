const BaseFilterStrategy = require('./base-filter.strategy');
const { FILTER_PRESETS } = require('../../../../constants/video-editor.constants');

/**
 * Strategy for Color Filter Presets (Grayscale, Sepia, Vintage, Warm, Cool, Dramatic)
 */
class PresetFilterStrategy extends BaseFilterStrategy {
  constructor() {
    super();
    this.presetMap = new Map([
      [FILTER_PRESETS.GRAYSCALE, 'hue=s=0'],
      [FILTER_PRESETS.SEPIA, 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'],
      [FILTER_PRESETS.VINTAGE, 'colorbalance=rs=.1:gs=-.05:bs=-.2'],
      [FILTER_PRESETS.WARM, 'colorbalance=rs=.15:gs=.05:bs=-.15'],
      [FILTER_PRESETS.COOL, 'colorbalance=rs=-.15:gs=.05:bs=.15'],
      [FILTER_PRESETS.DRAMATIC, 'eq=contrast=1.3:saturation=1.2']
    ]);
  }

  appliesTo(options) {
    const { filterPreset } = options || {};
    return Boolean(filterPreset && filterPreset !== FILTER_PRESETS.NONE && this.presetMap.has(filterPreset));
  }

  buildFilter(options) {
    const { filterPreset } = options;
    const ffmpegFilter = this.presetMap.get(filterPreset);
    return ffmpegFilter ? [ffmpegFilter] : [];
  }
}

module.exports = PresetFilterStrategy;
