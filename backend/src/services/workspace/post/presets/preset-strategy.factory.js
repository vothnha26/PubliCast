const { PRESET_KEYS } = require('../../../../constants/preset.constants');
const globalPresetStrategy = require('./global-preset.strategy');
const facebookPresetStrategy = require('./facebook-preset.strategy');
const instagramPresetStrategy = require('./instagram-preset.strategy');
const threadsPresetStrategy = require('./threads-preset.strategy');
const youtubePresetStrategy = require('./youtube-preset.strategy');
const tiktokPresetStrategy = require('./tiktok-preset.strategy');

/**
 * Factory / Registry điều phối tất cả các Preset Strategies (Open/Closed Principle & Dependency Inversion)
 */
class PresetStrategyFactory {
  constructor() {
    this.strategies = new Map();
    this._registerDefaultStrategies();
  }

  _registerDefaultStrategies() {
    this.strategies.set(PRESET_KEYS.GLOBAL, globalPresetStrategy);
    this.strategies.set(PRESET_KEYS.FACEBOOK, facebookPresetStrategy);
    this.strategies.set(PRESET_KEYS.INSTAGRAM, instagramPresetStrategy);
    this.strategies.set(PRESET_KEYS.THREADS, threadsPresetStrategy);
    this.strategies.set(PRESET_KEYS.YOUTUBE, youtubePresetStrategy);
    this.strategies.set(PRESET_KEYS.TIKTOK, tiktokPresetStrategy);
  }

  /**
   * Đăng ký một Preset Strategy mới cho platform mở rộng sau này (OCP)
   * @param {string} platformKey Key định danh platform
   * @param {BasePresetStrategy} strategy Strategy instance
   */
  registerStrategy(platformKey, strategy) {
    this.strategies.set(platformKey.toLowerCase(), strategy);
  }

  /**
   * Lấy tất cả options đã được map từ metadata
   * @param {Object} metadata JSON metadata của AutoList
   * @returns {Object} Combined options
   */
  mapAllPresets(metadata) {
    if (!metadata) return {};
    const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
    
    let combinedOptions = {};
    for (const strategy of this.strategies.values()) {
      const mapped = strategy.mapToOptions(meta);
      combinedOptions = { ...combinedOptions, ...mapped };
    }
    return combinedOptions;
  }
}

module.exports = new PresetStrategyFactory();
