import { toBrandDatetimeString, brandDatetimeStringToUTC, formatInBrandTimezone } from './brandTimezone';

describe('brandTimezone', () => {
  const TZ = 'Asia/Ho_Chi_Minh'; // fixed UTC+7, no DST — easy to hand-verify

  describe('toBrandDatetimeString', () => {
    it('renders a UTC instant as the brand timezone wall-clock time', () => {
      // 2026-08-10T01:00:00Z == 08:00 in Asia/Ho_Chi_Minh (UTC+7)
      expect(toBrandDatetimeString('2026-08-10T01:00:00.000Z', TZ)).toBe('2026-08-10T08:00');
    });

    it('rolls over to the next day when the UTC+7 shift crosses midnight', () => {
      // 2026-08-10T23:00:00Z + 7h = 2026-08-11T06:00 local
      expect(toBrandDatetimeString('2026-08-10T23:00:00.000Z', TZ)).toBe('2026-08-11T06:00');
    });

    it('falls back to browser-local formatting when timezone is falsy', () => {
      const d = new Date(2026, 7, 10, 8, 30); // local Aug 10 2026, 08:30
      expect(toBrandDatetimeString(d, null)).toBe('2026-08-10T08:30');
    });

    it('returns empty string for invalid/empty input', () => {
      expect(toBrandDatetimeString('', TZ)).toBe('');
      expect(toBrandDatetimeString('not-a-date', TZ)).toBe('');
    });
  });

  describe('brandDatetimeStringToUTC', () => {
    it('is the exact inverse of toBrandDatetimeString', () => {
      const utcIso = '2026-08-10T01:00:00.000Z';
      const brandLocalString = toBrandDatetimeString(utcIso, TZ);
      const roundTripped = brandDatetimeStringToUTC(brandLocalString, TZ);
      expect(roundTripped.toISOString()).toBe(utcIso);
    });

    it('converts an 08:00 brand-timezone entry to the correct UTC instant', () => {
      const utc = brandDatetimeStringToUTC('2026-08-10T08:00', TZ);
      expect(utc.toISOString()).toBe('2026-08-10T01:00:00.000Z');
    });

    it('falls back to native Date parsing when timezone is falsy', () => {
      const utc = brandDatetimeStringToUTC('2026-08-10T08:00', null);
      expect(utc.getTime()).toBe(new Date('2026-08-10T08:00').getTime());
    });

    it('returns null for empty input', () => {
      expect(brandDatetimeStringToUTC('', TZ)).toBeNull();
    });
  });

  describe('formatInBrandTimezone', () => {
    it('formats a UTC instant using the brand timezone', () => {
      const result = formatInBrandTimezone('2026-08-10T01:00:00.000Z', TZ);
      expect(result).toContain('10/08/2026');
      expect(result).toContain('08:00');
    });

    it('returns empty string for empty input', () => {
      expect(formatInBrandTimezone(null, TZ)).toBe('');
    });
  });
});
