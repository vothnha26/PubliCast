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
   * @param {Object} [selectedAccountIds] { [platform]: string[] } — dùng để chọn
   *   account "chính" (đầu tiên trong danh sách) của mỗi platform khi metadata
   *   có networkCustom (per-channel presets, cùng shape với Post Composer:
   *   networkCustom[platform].perAccount[accountId].settings), làm flat
   *   fallback cho postData.options — tương tự cách Post.options vẫn là 1
   *   object phẳng dù post nhắm tới nhiều account (per-account customization
   *   thật sự nằm ở PostNetworkOverride.settings, không phải ở đây).
   * @returns {Object} Combined options
   */
  mapAllPresets(metadata, selectedAccountIds) {
    if (!metadata) return {};
    const meta = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;

    let combinedOptions = {};
    for (const [platformKey, strategy] of this.strategies.entries()) {
      const flatMeta = this._resolveFlatMetaForPlatform(meta, platformKey, selectedAccountIds);
      const mapped = strategy.mapToOptions(flatMeta);
      combinedOptions = { ...combinedOptions, ...mapped };
    }
    return combinedOptions;
  }

  /**
   * Nếu metadata có networkCustom (per-channel presets — cùng shape với Post
   * Composer's networkCustom, xem frontend/src/utils/networkEntrySlot.js),
   * lấy settings của account ĐẦU TIÊN trong selectedAccountIds[platform] làm
   * bộ giá trị phẳng đại diện cho platform đó, ghi đè lên `meta` gốc (cho các
   * field global như GLOBAL strategy vẫn đọc thẳng `meta`, không bị mất do
   * merge). Không có networkCustom (dữ liệu cũ / autolist chưa re-save) thì
   * trả nguyên `meta` — giữ đúng hành vi cũ cho preset-mapping.test.js.
   */
  _resolveFlatMetaForPlatform(meta, platformKey, selectedAccountIds) {
    if (!meta.networkCustom || platformKey === PRESET_KEYS.GLOBAL) return meta;

    const platformUpper = platformKey.toUpperCase();
    const entry = meta.networkCustom[platformUpper];
    if (!entry) return meta;

    const accountIds = Array.isArray(selectedAccountIds?.[platformUpper])
      ? selectedAccountIds[platformUpper]
      : [];
    const primaryAccountId = accountIds[0];
    const settings = primaryAccountId
      ? entry.perAccount?.[primaryAccountId]?.settings
      : entry.settings;
    if (!settings) return meta;

    return { ...meta, ...settings };
  }
}

module.exports = new PresetStrategyFactory();
