const CropScaleFilterStrategy = require('./strategies/crop-scale-filter.strategy');
const AdjustmentFilterStrategy = require('./strategies/adjustment-filter.strategy');
const PresetFilterStrategy = require('./strategies/preset-filter.strategy');
const TextOverlayFilterStrategy = require('./strategies/text-overlay-filter.strategy');
const SubtitleFilterStrategy = require('./strategies/subtitle-filter.strategy');
const ResizeFilterStrategy = require('./strategies/resize-filter.strategy');

/**
 * Composite Pipeline for FFmpeg Video Filters using Strategy Pattern
 * Combines all applicable filter strategies into a unified filter_complex string.
 */
class VideoFilterPipeline {
  constructor() {
    // Thứ tự xử lý bộ lọc tối ưu cho FFmpeg (Crop/Scale -> Resize -> Eq Adjust -> Color Preset -> Text/Subtitles)
    this.strategies = [
      new CropScaleFilterStrategy(),
      new ResizeFilterStrategy(),
      new AdjustmentFilterStrategy(),
      new PresetFilterStrategy(),
      new TextOverlayFilterStrategy(),
      new SubtitleFilterStrategy()
    ];
  }

  /**
   * Register a new filter strategy (Enables OCP extension)
   */
  registerStrategy(strategy) {
    this.strategies.push(strategy);
  }

  /**
   * Build complete filter_complex string from all registered strategies
   * @param {Object} options 
   * @returns {string} Combined FFmpeg filter string (comma-separated)
   */
  buildPipeline(options) {
    const activeFilters = [];

    for (const strategy of this.strategies) {
      if (strategy.appliesTo(options)) {
        const filters = strategy.buildFilter(options);
        if (Array.isArray(filters) && filters.length > 0) {
          activeFilters.push(...filters);
        }
      }
    }

    return activeFilters.join(',');
  }
}

module.exports = new VideoFilterPipeline();
