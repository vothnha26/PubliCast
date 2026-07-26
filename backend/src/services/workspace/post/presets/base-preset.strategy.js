/**
 * Interface / Base Strategy cho Preset Mapping (Liskov Substitution Principle)
 */
class BasePresetStrategy {
  /**
   * Extractor/Mapper từ AutoList metadata sang options object của Post
   * @param {Object} meta AutoList metadata JSON
   * @returns {Object} Target options subset
   */
  mapToOptions(meta) {
    throw new Error('Method mapToOptions() must be implemented by concrete strategy');
  }
}

module.exports = BasePresetStrategy;
