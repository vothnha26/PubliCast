import { describe, it, expect } from 'vitest';
import { parseAttributionHtml, appendUnsplashReferral } from '../utils/sanitize';

describe('Sanitization & Referral Helper Suite', () => {
  describe('parseAttributionHtml', () => {
    it('should return empty array for null, undefined or non-string inputs', () => {
      expect(parseAttributionHtml(null)).toEqual([]);
      expect(parseAttributionHtml(undefined)).toEqual([]);
      expect(parseAttributionHtml(123)).toEqual([]);
    });

    it('should correctly parse plain text and safe <a> tags', () => {
      const input = 'Photo by <a href="https://unsplash.com/@john">John Doe</a> on <a href="https://unsplash.com">Unsplash</a>';
      const result = parseAttributionHtml(input);

      expect(result).toEqual([
        { type: 'text', text: 'Photo by ' },
        { type: 'link', text: 'John Doe', href: 'https://unsplash.com/@john' },
        { type: 'text', text: ' on ' },
        { type: 'link', text: 'Unsplash', href: 'https://unsplash.com' }
      ]);
    });

    it('should strip malicious <script> tags entirely', () => {
      const malicious = 'Photo by <script>alert("XSS")</script><a href="https://unsplash.com">Author</a>';
      const result = parseAttributionHtml(malicious);

      expect(result).toEqual([
        { type: 'text', text: 'Photo by ' },
        { type: 'link', text: 'Author', href: 'https://unsplash.com' }
      ]);
    });

    it('should block javascript: URLs and fallback to "#"', () => {
      const malicious = '<a href="javascript:alert(1)">Click Me</a>';
      const result = parseAttributionHtml(malicious);

      expect(result).toEqual([
        { type: 'link', text: 'Click Me', href: '#' }
      ]);
    });

    it('should block HTML entity encoded javascript: URLs', () => {
      const malicious = '<a href="&#106;avascript:alert(1)">Click Me</a>';
      const result = parseAttributionHtml(malicious);

      expect(result).toEqual([
        { type: 'link', text: 'Click Me', href: '#' }
      ]);
    });

    it('should block whitespace-injected javascript: URLs', () => {
      const malicious = '<a href="java\tscript:alert(1)">Click Me</a>';
      const result = parseAttributionHtml(malicious);

      expect(result).toEqual([
        { type: 'link', text: 'Click Me', href: '#' }
      ]);
    });
  });

  describe('appendUnsplashReferral', () => {
    it('should return empty string for invalid inputs', () => {
      expect(appendUnsplashReferral(null)).toBe('');
      expect(appendUnsplashReferral('')).toBe('');
    });

    it('should append utm_source=PubliCast and utm_medium=referral to a plain URL', () => {
      const url = 'https://unsplash.com/@photographer';
      const result = appendUnsplashReferral(url, 'PubliCast');

      expect(result).toContain('utm_source=PubliCast');
      expect(result).toContain('utm_medium=referral');
    });

    it('should preserve existing query parameters when appending referral parameters', () => {
      const url = 'https://unsplash.com/@photographer?category=nature';
      const result = appendUnsplashReferral(url, 'PubliCast');

      expect(result).toContain('category=nature');
      expect(result).toContain('utm_source=PubliCast');
      expect(result).toContain('utm_medium=referral');
    });

    it('should not duplicate utm_source if it already exists in the URL', () => {
      const url = 'https://unsplash.com/@photographer?utm_source=PubliCast&utm_medium=referral';
      const result = appendUnsplashReferral(url, 'PubliCast');

      const occurrences = (result.match(/utm_source/g) || []).length;
      expect(occurrences).toBe(1);
    });
  });
});
