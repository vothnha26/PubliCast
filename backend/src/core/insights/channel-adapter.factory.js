/**
 * ChannelAdapterFactory
 * Registry Factory (OCP): Quản lý đăng ký và tra cứu Adapter của từng Platform cho Channel Snapshots.
 */
class ChannelAdapterFactory {
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
      throw new Error(`No ChannelAdapter registered for platform: '${platform}'`);
    }
    return adapter;
  }

  isSupported(platform) {
    if (!platform) return false;
    return this._registry.has(platform.toUpperCase());
  }

  getAllAdapters() {
    return Array.from(this._registry.values());
  }
}

module.exports = ChannelAdapterFactory;
