/**
 * PubliCast - CSV Import/Export Helper
 * Separates CSV processing logic from the UI components.
 */

// PubliCast Native CSV Headers (18 columns)
export const PUBLICAST_CSV_HEADERS = [
  'Caption', 'Scheduled At', 'Status', 'Platforms', 'Post Type',
  'Media URLs', 'Alt Text', 'Title', 'First Comment',
  'Instagram Post Type', 'YouTube Privacy', 'YouTube Tags', 'YouTube Playlist',
  'TikTok Privacy', 'TikTok Disable Comments', 'Facebook Post Type',
  'Brand', 'Post ID'
];

/**
 * Escapes a single value for CSV inclusion.
 */
export const csvCell = (val) => {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Parse a single CSV row, correctly handling quoted fields.
 */
export const parseCSVRow = (text) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

/**
 * Detect CSV format by fingerprinting the header row.
 */
export const detectCSVFormat = (headers) => {
  const lower = headers.map(h => h.toLowerCase().trim());
  if (lower.includes('text') && lower.includes('date') && lower.includes('time') && lower.includes('draft')) {
    return 'metricool';
  }
  if (lower.includes('caption') && lower.some(h => h === 'scheduled at')) {
    return 'publicast';
  }
  return 'unknown';
};

/**
 * Map a parsed Metricool row to PubliCast post payload.
 */
export const mapMetricoolRow = (row, headers) => {
  const get = (name) => {
    const idx = headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase().trim());
    return idx !== -1 ? (row[idx] || '').trim() : '';
  };

  const dateStr = get('Date');
  const timeStr = get('Time') || '12:00:00';
  const scheduledAt = dateStr ? `${dateStr}T${timeStr}` : null;
  const status = get('Draft').toLowerCase() === 'true' ? 'DRAFT' : 'SCHEDULED';

  const PLAT_MAP = {
    facebook: 'FACEBOOK',
    instagram: 'INSTAGRAM',
    youtube: 'YOUTUBE',
    tiktok: 'TIKTOK',
    threads: 'THREADS'
  };

  const targetPlatforms = Object.entries(PLAT_MAP)
    .filter(([col]) => get(col).toLowerCase() === 'true')
    .map(([, key]) => key);

  const mediaUrls = [];
  for (let i = 1; i <= 10; i++) {
    const u = get(`Picture Url ${i}`);
    if (u) mediaUrls.push(u);
  }

  const opts = {};
  const fc = get('First Comment Text'); if (fc) opts.firstComment = fc;
  const ig = get('Instagram Post Type'); if (ig) opts.instagramPostType = ig;
  const yp = get('Youtube Video Privacy'); if (yp) opts.youtubePrivacy = yp;
  const yt = get('Youtube Video Type'); if (yt) opts.youtubeVideoType = yt;
  const ytags = get('Youtube Video Tags'); if (ytags) opts.youtubeTags = ytags;
  const ypl = get('Youtube playlist'); if (ypl) opts.youtubePlaylist = ypl;
  const tp = get('TikTok Post Privacy'); if (tp) opts.tiktokPrivacy = tp;
  const tdc = get('TikTok disable comments'); if (tdc) opts.tiktokDisableComments = tdc === 'true';
  const fb = get('Facebook Post Type'); if (fb) opts.facebookPostType = fb;
  const thumb = get('Video Thumbnail Url'); if (thumb) opts.youtubeThumbnail = thumb;

  return {
    caption: get('Text'),
    title: get('Youtube Video Title') || get('Facebook Title') || '',
    altText: get('Alt text picture 1'),
    scheduledAt,
    status,
    targetPlatforms,
    mediaUrls,
    options: opts
  };
};

/**
 * Map a parsed PubliCast row to PubliCast post payload.
 */
export const mapPublicastRow = (row, headers) => {
  const get = (name) => {
    const idx = headers.findIndex(h => h.toLowerCase().trim() === name.toLowerCase().trim());
    return idx !== -1 ? (row[idx] || '').trim() : '';
  };

  const targetPlatforms = get('Platforms').split(',').map(p => p.trim().toUpperCase()).filter(Boolean);
  const rawUrls = get('Media URLs');
  let mediaUrls = [];
  if (rawUrls.includes('|')) {
    mediaUrls = rawUrls.split('|').map(u => u.trim()).filter(Boolean);
  } else {
    mediaUrls = rawUrls.split(/,(?=\s*https?:\/\/|\s*\/uploads|\s*\/media|\s*\/temp|\s*[a-zA-Z]:\\|\s*\\|\s*\/)/i).map(u => u.trim()).filter(Boolean);
  }

  const opts = {};
  const fc = get('First Comment'); if (fc) opts.firstComment = fc;
  const ig = get('Instagram Post Type'); if (ig) opts.instagramPostType = ig;
  const yp = get('YouTube Privacy'); if (yp) opts.youtubePrivacy = yp;
  const ytags = get('YouTube Tags'); if (ytags) opts.youtubeTags = ytags;
  const ypl = get('YouTube Playlist'); if (ypl) opts.youtubePlaylist = ypl;
  const tp = get('TikTok Privacy'); if (tp) opts.tiktokPrivacy = tp;
  const tdc = get('TikTok Disable Comments'); if (tdc !== '') opts.tiktokDisableComments = tdc.toLowerCase() === 'true';
  const fb = get('Facebook Post Type'); if (fb) opts.facebookPostType = fb;

  return {
    caption: get('Caption'),
    title: get('Title'),
    altText: get('Alt Text'),
    scheduledAt: get('Scheduled At') || null,
    status: get('Status').toUpperCase() || 'DRAFT',
    type: get('Post Type').toUpperCase() || 'IMAGE',
    targetPlatforms,
    mediaUrls,
    options: opts
  };
};
