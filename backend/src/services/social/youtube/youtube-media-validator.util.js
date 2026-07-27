const path = require('path');
const fs = require('fs');

/**
 * Validates image size and format constraints for YouTube custom thumbnail or other images.
 * Supports both local files and remote URLs.
 * 
 * @param {string|string[]} imageUrl - The image URL or local path.
 * @param {Object} options - Validation options.
 * @param {number} options.maxSizeBytes - Maximum allowed size in bytes.
 * @param {readonly string[]} options.allowedMimeTypes - Allowed MIME types.
 * @param {string} [options.resourceLabel='Image'] - Label used in error messages.
 * @returns {Promise<{ok: boolean, error: string|null, mimeType: string|null}>}
 */
async function validateImageConstraints(imageUrl, { maxSizeBytes, allowedMimeTypes, resourceLabel = 'Image' }) {
  const resolvedUrl = Array.isArray(imageUrl) ? imageUrl[0] : imageUrl;
  if (!resolvedUrl) {
    return { ok: true, error: null, mimeType: null };
  }

  // 1. Format check based on file extension (fail-fast)
  // Strip query parameters and hash fragments if present to prevent incorrect validation
  let cleanPath = resolvedUrl;
  if (resolvedUrl.startsWith('http')) {
    try {
      cleanPath = new URL(resolvedUrl).pathname;
    } catch (err) {
      cleanPath = resolvedUrl.split('?')[0].split('#')[0];
    }
  } else {
    cleanPath = resolvedUrl.split('?')[0].split('#')[0];
  }
  const ext = path.extname(cleanPath).toLowerCase();
  let mimeType = null;
  if (ext === '.jpg' || ext === '.jpeg') {
    mimeType = 'image/jpeg';
  } else if (ext === '.png') {
    mimeType = 'image/png';
  }

  // If MIME type is not resolved, or not allowed, fail fast
  if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
    return {
      ok: false,
      error: `Invalid ${resourceLabel} format. Allowed formats are JPEG and PNG.`,
      mimeType: null
    };
  }

  // 2. Size check
  if (resolvedUrl.startsWith('http')) {
    try {
      // Fetch with timeout to avoid hanging the validation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(resolvedUrl, { 
        method: 'HEAD',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[YouTube Image Validation] HEAD request failed with status ${response.status} for URL: ${resolvedUrl}. Gracefully passing.`);
        return { ok: true, error: null, mimeType };
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      if (contentLength > 0 && contentLength > maxSizeBytes) {
        const sizeMB = (contentLength / (1024 * 1024)).toFixed(2);
        const limitMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
        return {
          ok: false,
          error: `${resourceLabel} size (${sizeMB}MB) exceeds YouTube API limit of ${limitMB}MB.`,
          mimeType
        };
      }
    } catch (err) {
      console.warn(`[YouTube Image Validation] HEAD request error or timeout for URL ${resolvedUrl}: ${err.message}. Gracefully passing.`);
      return { ok: true, error: null, mimeType };
    }
  } else {
    try {
      const localPath = path.join(process.cwd(), resolvedUrl.replace(/^\//, ''));
      if (fs.existsSync(localPath)) {
        const { size } = fs.statSync(localPath);
        if (size > maxSizeBytes) {
          const sizeMB = (size / (1024 * 1024)).toFixed(2);
          const limitMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
          return {
            ok: false,
            error: `${resourceLabel} size (${sizeMB}MB) exceeds YouTube API limit of ${limitMB}MB.`,
            mimeType
          };
        }
      }
    } catch (err) {
      console.warn(`[YouTube Image Validation] Local file check failed: ${err.message}. Gracefully passing.`);
    }
  }

  return { ok: true, error: null, mimeType };
}

module.exports = {
  validateImageConstraints
};
