/**
 * InboxSyncFactory
 * Registry Factory (OCP): Quản lý đăng ký và tra cứu Adapter đồng bộ/phản hồi tin nhắn theo Platform.
 */
class InboxSyncFactory {
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
      throw new Error(`No InboxSyncAdapter registered for platform: '${platform}'`);
    }
    return adapter;
  }

  getAllAdapters() {
    return Array.from(this._registry.values());
  }

  isSupported(platform) {
    if (!platform) return false;
    return this._registry.has(platform.toUpperCase());
  }
}

module.exports = InboxSyncFactory;
