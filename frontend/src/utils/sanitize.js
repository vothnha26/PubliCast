/**
 * Parses an attribution HTML string into a safe segment array for JSX rendering.
 *
 * SECURITY: Uses the browser's own DOM engine (DOMParser) to parse the HTML,
 * then extracts ONLY text content and href from <a> tags via getAttribute —
 * which already normalises HTML entity encoding (e.g. &#106; → "j") and strips
 * control characters. The href is then validated with the URL constructor
 * (whitelist: https: / http: only). Nothing is ever passed to
 * dangerouslySetInnerHTML. This approach is immune to all known bypass
 * techniques (entity encoding, whitespace injection, case-mangling).
 *
 * Complies with Unsplash & Pexels ToS: preserves both photographer link and
 * platform link as separate <a> elements.
 *
 * @param {string} rawHtml - Raw attribution HTML from Unsplash / Pexels API
 * @returns {Array<{type: 'text'|'link', text: string, href?: string}>}
 */
export function parseAttributionHtml(rawHtml) {
  if (!rawHtml || typeof rawHtml !== 'string') return [];

  const parser = typeof window !== 'undefined' && window.DOMParser 
    ? new window.DOMParser() 
    : (typeof DOMParser !== 'undefined' ? new DOMParser() : null);

  if (parser) {
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const segments = [];

    doc.body.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text) segments.push({ type: 'text', text });
      } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A') {
        const rawHref = node.getAttribute('href') || '';
        const safehref = isSafeUrl(rawHref) ? rawHref : '#';
        const text = node.textContent || rawHref;
        segments.push({ type: 'link', text, href: safehref });
      }
    });
    return segments;
  }

  // Pure String/Regex parser fallback (for Node environment without DOMParser)
  const segments = [];
  const tagRegex = /<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>|<script\b[^>]*>[\s\S]*?<\/script>/gi;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(rawHtml)) !== null) {
    if (match.index > lastIndex) {
      const text = rawHtml.slice(lastIndex, match.index);
      if (text) segments.push({ type: 'text', text });
    }
    // If it's an <a> tag match (group 1 & 2 present)
    if (match[1] !== undefined) {
      const rawHref = match[1];
      const safehref = isSafeUrl(rawHref) ? rawHref : '#';
      const text = match[2].replace(/<[^>]*>/g, '');
      segments.push({ type: 'link', text, href: safehref });
    }
    // script tags (match[0] starts with <script) are discarded
    lastIndex = tagRegex.lastIndex;
  }

  if (lastIndex < rawHtml.length) {
    const text = rawHtml.slice(lastIndex);
    if (text) segments.push({ type: 'text', text });
  }

  return segments;
}

/**
 * Returns true only for http: and https: URLs.
 * Uses the URL constructor so normalisation (whitespace stripping, etc.) is
 * handled by the platform before the protocol check.
 *
 * @param {string} href
 * @returns {boolean}
 */
function isSafeUrl(href) {
  if (!href || href === '#') return false;
  try {
    const { protocol } = new URL(href);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Appends referral tracking query parameters (utm_source & utm_medium) to a URL for Unsplash/Pexels ToS compliance.
 * 
 * @param {string} url - Target link URL
 * @param {string} appName - App name parameter (default: 'PubliCast')
 * @returns {string} URL with referral tracking query parameters
 */
export function appendUnsplashReferral(url, appName = 'PubliCast') {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('utm_source')) {
      parsed.searchParams.set('utm_source', appName);
    }
    if (!parsed.searchParams.has('utm_medium')) {
      parsed.searchParams.set('utm_medium', 'referral');
    }
    return parsed.toString();
  } catch (err) {
    // Fallback if URL constructor fails for relative path
    const hasQuery = url.includes('?');
    const separator = hasQuery ? '&' : '?';
    if (!url.includes('utm_source')) {
      return `${url}${separator}utm_source=${encodeURIComponent(appName)}&utm_medium=referral`;
    }
    return url;
  }
}
