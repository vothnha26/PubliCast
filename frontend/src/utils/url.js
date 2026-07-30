/**
 * buildServerBaseUrl — Lấy base URL server từ VITE_API_BASE_URL.
 * Loại bỏ '/api' suffix nếu có để build URL media/static.
 *
 * @example
 * // VITE_API_BASE_URL = 'http://localhost:3000/api'
 * buildServerBaseUrl() // → 'http://localhost:3000'
 */
export function buildServerBaseUrl() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  return apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
}

/**
 * buildMediaUrl — Tạo full URL từ đường dẫn media tương đối trả về từ backend.
 * Dùng thay cho đoạn code lặp lại 4 lần trong usePostCreatorForm.js
 *
 * @param {string} path - Đường dẫn từ backend (có thể relative hoặc full URL)
 * @returns {string} Full URL có thể dùng trong <video src>
 *
 * @example
 * buildMediaUrl('/uploads/video/abc.mp4')  // → 'http://localhost:3000/uploads/video/abc.mp4'
 * buildMediaUrl('https://cdn.example.com/video.mp4')  // → 'https://cdn.example.com/video.mp4'
 */
export function buildMediaUrl(path) {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  const serverBase = buildServerBaseUrl();
  const cleanPath = path.replace(/\\/g, '/');
  const separator = cleanPath.startsWith('/') ? '' : '/';
  return `${serverBase}${separator}${cleanPath}`;
}

/**
 * isVideoPath — Kiểm tra xem đường dẫn/URL có phải là file video không.
 * Dùng thay cho `.endsWith(".mp4") || .endsWith(".mov")...` lặp lại.
 *
 * @param {string} url - URL hoặc path cần kiểm tra
 * @param {File|null} file - File object (nếu có, kiểm tra MIME type)
 */
export function isVideoPath(url, file = null) {
  if (file?.type?.startsWith('video/')) return true;
  if (!url || typeof url !== 'string') return false;

  const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm'];
  const lowerUrl = url.toLowerCase().split('?')[0]; // bỏ query string
  if (VIDEO_EXTENSIONS.some((ext) => lowerUrl.endsWith(ext))) return true;
  if (url.includes('/video/upload/')) return true; // Cloudinary

  return false;
}
