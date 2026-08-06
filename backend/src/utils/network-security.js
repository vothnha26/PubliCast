const dns = require('dns');
const http = require('http');
const https = require('https');
const axios = require('axios');
const { URL } = require('url');

/**
 * isPrivateIp
 * Kiểm tra xem địa chỉ IP có phải là IP nội bộ, loopback, private hoặc reserved hay không.
 * Hỗ trợ tự động unwrap địa chỉ IPv4-mapped IPv6 (::ffff:x.y.z.w).
 *
 * @param {string} ip Địa chỉ IP cần kiểm tra
 * @returns {boolean} True nếu là IP private/reserved, ngược lại False
 */
function isPrivateIp(ip) {
  if (!ip) return true;
  // dns.lookup() normally calls back with a string, but callers that pass
  // { all: true } get an array of { address, family } objects instead —
  // treat anything that isn't a plain string as unsafe rather than crashing.
  if (typeof ip !== 'string') return true;
  let normalized = ip.trim().toLowerCase();

  // Unwrap IPv4-mapped IPv6: ::ffff:127.0.0.1 hoặc ::ffff:a.b.c.d
  if (normalized.startsWith('::ffff:')) {
    normalized = normalized.substring(7);
  }

  // Kiểm tra dải IPv4
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(normalized)) {
    const parts = normalized.split('.').map(Number);
    if (parts.some(p => p < 0 || p > 255)) return true; // IP không hợp lệ coi như private

    const [p0, p1] = parts;
    // 127.0.0.0/8 (Loopback)
    if (p0 === 127) return true;
    // 10.0.0.0/8 (Class A private)
    if (p0 === 10) return true;
    // 172.16.0.0/12 (Class B private)
    if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;
    // 192.168.0.0/16 (Class C private)
    if (p0 === 192 && p1 === 168) return true;
    // 169.254.0.0/16 (Link-local)
    if (p0 === 169 && p1 === 254) return true;
    // 0.0.0.0/8 (Broadcast/Local)
    if (p0 === 0) return true;
    // Multicast & Reserved (224.0.0.0/4, 240.0.0.0/4)
    if (p0 >= 224) return true;

    return false;
  }

  // Kiểm tra dải IPv6
  // Loopback (::1)
  if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
  // Unspecified (::)
  if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;
  // Unique Local Address (ULA) - fc00::/7 (Bắt đầu bằng fc hoặc fd)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  // Link-Local Address - fe80::/10 (Bắt đầu bằng fe8, fe9, fea, feb)
  if (/^fe[89ab]/.test(normalized)) return true;

  return false;
}

/**
 * Custom DNS lookup agent function
 * Thực hiện DNS lookup và kiểm tra IP ngay lập tức ở socket level (chống DNS Rebinding).
 */
const safeLookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  dns.lookup(hostname, options, (err, address, family) => {
    if (err) return callback(err);

    // net.Socket's autoSelectFamily (default since Node 18.13, confirmed via
    // this project's Node 23 runtime) calls custom lookup functions with
    // { all: true } for happy-eyeballs — dns.lookup() then calls back with
    // an array of {address, family} instead of a single string. Passing
    // that array straight to isPrivateIp always failed it (non-string →
    // unsafe), which silently SSRF-blocked every public hostname resolved
    // this way (e.g. res.cloudinary.com) instead of only actually-private
    // ones. Filter to the public entries instead of rejecting the whole batch.
    if (Array.isArray(address)) {
      const safeEntries = address.filter((entry) => !isPrivateIp(entry?.address));
      if (safeEntries.length === 0) {
        return callback(new Error(`SSRF Blocked: All destination IPs resolved from ${hostname} are private or reserved.`));
      }
      // net.Socket's autoSelectFamily lookup expects the same
      // {address, family}[] shape dns.lookup(..., {all:true}) itself
      // returns — passing back a flat string[] here breaks happy-eyeballs.
      return callback(null, safeEntries);
    }

    if (isPrivateIp(address)) {
      return callback(new Error(`SSRF Blocked: Destination IP ${address} resolved from ${hostname} is private or reserved.`));
    }
    callback(null, address, family);
  });
};

const safeHttpAgent = new http.Agent({ lookup: safeLookup, keepAlive: false });
const safeHttpsAgent = new https.Agent({ lookup: safeLookup, keepAlive: false });

/**
 * downloadImageSafely
 * Tải ảnh an toàn từ một URL từ xa, áp dụng cơ chế bảo vệ SSRF, DNS Rebinding và DoS (kích thước tối đa 5MB).
 *
 * @param {string} url URL ảnh cần tải
 * @returns {Promise<Buffer>} Buffer dữ liệu ảnh tải về
 */
async function downloadImageSafely(url) {
  if (!url) throw new Error('URL is required.');
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('SSRF Blocked: Invalid URL protocol. Only HTTP and HTTPS are allowed.');
  }

  // Sử dụng custom agents để chặn cả request gốc và các redirects (3xx) ở socket level
  const response = await axios({
    method: 'get',
    url: url,
    responseType: 'stream',
    httpAgent: safeHttpAgent,
    httpsAgent: safeHttpsAgent,
    timeout: 5000,
    maxRedirects: 3
  });

  // Kiểm tra Content-Length header trước tiên
  const contentLength = parseInt(response.headers['content-length'], 10);
  if (!isNaN(contentLength) && contentLength > 5 * 1024 * 1024) {
    response.data.destroy();
    throw new Error('File size limit exceeded: Content-Length is larger than 5MB.');
  }

  // Nhận dữ liệu stream và kiểm soát tích lũy kích thước thực tế (chống DoS stream vô hạn)
  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    response.data.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > 5 * 1024 * 1024) {
        response.data.destroy();
        reject(new Error('File size limit exceeded: Downloaded stream exceeded 5MB.'));
        return;
      }
      chunks.push(chunk);
    });

    response.data.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    response.data.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * downloadBufferSafely
 * Generic SSRF-safe download that returns a Buffer, with a caller-supplied
 * max size (images and videos have very different acceptable sizes — see
 * downloadImageSafely for the 5MB image-specific wrapper).
 *
 * @param {string} url
 * @param {number} maxBytes
 * @returns {Promise<Buffer>}
 */
async function downloadBufferSafely(url, maxBytes) {
  if (!url) throw new Error('URL is required.');
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('SSRF Blocked: Invalid URL protocol. Only HTTP and HTTPS are allowed.');
  }

  const response = await axios({
    method: 'get',
    url,
    responseType: 'stream',
    httpAgent: safeHttpAgent,
    httpsAgent: safeHttpsAgent,
    timeout: 30000,
    maxRedirects: 3
  });

  const contentLength = parseInt(response.headers['content-length'], 10);
  if (!isNaN(contentLength) && contentLength > maxBytes) {
    response.data.destroy();
    throw new Error(`File size limit exceeded: Content-Length is larger than ${maxBytes} bytes.`);
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    let totalBytes = 0;

    response.data.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        response.data.destroy();
        reject(new Error(`File size limit exceeded: Downloaded stream exceeded ${maxBytes} bytes.`));
        return;
      }
      chunks.push(chunk);
    });

    response.data.on('end', () => resolve(Buffer.concat(chunks)));
    response.data.on('error', (err) => reject(err));
  });
}

module.exports = {
  isPrivateIp,
  safeLookup,
  safeHttpAgent,
  safeHttpsAgent,
  downloadImageSafely,
  downloadBufferSafely
};
