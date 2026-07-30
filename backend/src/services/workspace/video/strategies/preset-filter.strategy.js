const BaseFilterStrategy = require('./base-filter.strategy');
const { FILTER_PRESETS } = require('../../../../constants/video-editor.constants');

/**
 * Strategy for Color Filter Presets.
 * All 13 presets mirror the FE backendPreset keys defined in constants/video-editor.js.
 * Each entry maps to an exact FFmpeg filter string that replicates the CSS preview effect.
 *
 * Preset groups:
 *   Color:  chrome, fade, cold, warm, pastel
 *   Mono:   mono, noir, stark, wash
 *   Tone:   sepia, rust, blues
 */
class PresetFilterStrategy extends BaseFilterStrategy {
  constructor() {
    super();
    this.presetMap = new Map([
      // --- Color Group ---
      // Chrome: high saturation + contrast + slight brightness boost
      [FILTER_PRESETS.CHROME, 'eq=saturation=1.6:contrast=1.25:brightness=0.05'],

      // Fade: low contrast + bright + desaturated
      [FILTER_PRESETS.FADE, 'eq=contrast=0.85:brightness=0.1:saturation=0.8'],

      // Cold: hue shift toward blue + slight desaturation
      [FILTER_PRESETS.COLD, 'hue=h=195:s=0.9,eq=brightness=0.05'],

      // Warm: sepia tint + boosted saturation + negative hue shift
      [FILTER_PRESETS.WARM, 'colorbalance=rs=0.15:gs=0.05:bs=-0.15'],

      // Pastel: desaturated + bright + low contrast
      [FILTER_PRESETS.PASTEL, 'eq=saturation=0.7:brightness=0.15:contrast=0.9'],

      // --- Mono Group ---
      // Mono: full grayscale + slight contrast boost
      [FILTER_PRESETS.MONO, 'hue=s=0,eq=contrast=1.25'],

      // Noir: full grayscale + strong contrast + dark
      [FILTER_PRESETS.NOIR, 'hue=s=0,eq=contrast=1.5:brightness=-0.15'],

      // Stark: full grayscale + ultra contrast (nearly B&W silhouette)
      [FILTER_PRESETS.STARK, 'hue=s=0,eq=contrast=2.0'],

      // Wash: partial grayscale + bright + low contrast
      [FILTER_PRESETS.WASH, 'hue=s=0.2,eq=brightness=0.2:contrast=0.8'],

      // --- Tone Group ---
      // Sepia: classic brown sepia
      [FILTER_PRESETS.SEPIA, 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131'],

      // Rust: sepia + shifted hue + boosted saturation (warm orange-brown)
      [FILTER_PRESETS.RUST, 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,hue=H=-20:s=1.4'],

      // Blues: hue shift toward blue + slight saturation boost
      [FILTER_PRESETS.BLUES, 'hue=h=200:s=1.3'],
    ]);
  }

  appliesTo(options) {
    const { filterPreset } = options || {};
    return Boolean(
      filterPreset &&
      filterPreset !== FILTER_PRESETS.NONE &&
      this.presetMap.has(filterPreset)
    );
  }

  buildFilter(options) {
    const { filterPreset } = options;
    const ffmpegFilter = this.presetMap.get(filterPreset);
    return ffmpegFilter ? [ffmpegFilter] : [];
  }
}

module.exports = PresetFilterStrategy;
