const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '../../../cache');
const CACHE_FILE = path.join(CACHE_DIR, 'youtube-playlists.json');

class YouTubePlaylistCache {
  constructor() {
    this._ensureCacheDirectory();
  }

  _ensureCacheDirectory() {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }
      if (!fs.existsSync(CACHE_FILE)) {
        fs.writeFileSync(CACHE_FILE, JSON.stringify({}), 'utf8');
      }
    } catch (err) {
      console.error('Failed to initialize playlist cache directory:', err.message);
    }
  }

  _readCache() {
    try {
      this._ensureCacheDirectory();
      const content = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(content || '{}');
    } catch (err) {
      console.error('Failed to read playlist cache:', err.message);
      return {};
    }
  }

  _writeCache(data) {
    try {
      this._ensureCacheDirectory();
      fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Failed to write playlist cache:', err.message);
      return false;
    }
  }

  /**
   * Lấy playlists từ cache
   * @param {string} brandId 
   * @returns {Array|null} danh sách playlists hoặc null nếu cache miss
   */
  get(brandId) {
    const cache = this._readCache();
    return cache[brandId] || null;
  }

  /**
   * Lưu playlists vào cache
   * @param {string} brandId 
   * @param {Array} playlists 
   */
  set(brandId, playlists) {
    const cache = this._readCache();
    cache[brandId] = playlists;
    this._writeCache(cache);
  }
}

module.exports = new YouTubePlaylistCache();
