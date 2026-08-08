/**
 * AudienceAdapterFactory
 * Registry Factory (OCP): Quản lý đăng ký và truy xuất Audience Insight Adapters.
 */
class AudienceAdapterFactory {
  constructor() {
    this._registry = new Map();
  }

  register(platform, adapterInstance) {
    if (!platform) throw new Error('Platform is required for registration');
    this._registry.set(platform.toUpperCase(), adapterInstance);
  }

  getAdapter(platform) {
    if (!platform) throw new Error('Platform is required');
    const adapter = this._registry.get(platform.toUpperCase());
    if (!adapter) {
      throw new Error(`No AudienceInsightAdapter registered for platform: '${platform}'`);
    }
    return adapter;
  }

  isSupported(platform) {
    if (!platform) return false;
    return this._registry.has(platform.toUpperCase());
  }
}

module.exports = AudienceAdapterFactory;
