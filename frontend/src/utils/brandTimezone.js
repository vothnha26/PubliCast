// Converts between a brand's configured timezone (Brand.timezone, e.g.
// "Asia/Ho_Chi_Minh") and the UTC Date values scheduledAt/publishedAt are
// stored as — using Intl.DateTimeFormat (built into every supported
// browser) instead of pulling in a timezone library. A JS Date object has
// no timezone of its own; its getHours()/getFullYear()/etc. always read the
// browser's local timezone, which previously meant the post-scheduling
// datetime picker showed/accepted times in whichever timezone the user's
// device happened to be in, not the brand's.

const PART_TYPES = ['year', 'month', 'day', 'hour', 'minute', 'second'];

function getPartsInTimezone(date, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = {};
  for (const { type, value } of formatter.formatToParts(date)) {
    if (PART_TYPES.includes(type)) parts[type] = value === '24' ? '00' : value;
  }
  return parts;
}

/**
 * Returns { year, month, day, hour, minute } (numbers, month/day/hour/minute
 * zero-padded-free) for a UTC Date/ISO-string/timestamp as seen in the given
 * IANA timezone — for calendar-grid grouping keys (e.g. "which day/hour cell
 * does this post belong in") that need numeric parts, not a formatted
 * string. Falls back to the browser's local timezone if `timezone` is falsy.
 */
export function getBrandDateParts(dateInput, timezone) {
  const d = new Date(dateInput);
  if (!timezone) {
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes()
    };
  }
  const p = getPartsInTimezone(d, timezone);
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute)
  };
}

/**
 * Formats a UTC Date/ISO-string/timestamp as a "YYYY-MM-DDTHH:mm" string in
 * the given IANA timezone — the shape `<input type="datetime-local">`
 * expects. Falls back to the browser's local timezone if `timezone` is
 * falsy (unknown brand / not yet loaded) so callers don't need their own
 * fallback branch.
 */
export function toBrandDatetimeString(dateInput, timezone) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  if (!timezone) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
  const p = getPartsInTimezone(d, timezone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * Returns a Date object constructed so that its LOCAL getters
 * (getHours/getDate/getMonth/etc, which is all `date-fns`'s `format()`
 * reads) report the wall-clock time the given instant has in `timezone` —
 * lets existing `format(d, "HH:mm - dd/MM/yyyy")` call sites become
 * timezone-aware by swapping their `new Date(x)` input for
 * `toBrandWallClockDate(x, timezone)`, without switching them to
 * Intl.DateTimeFormat's option-object API. The returned Date's own instant
 * (its getTime()) is NOT the original UTC instant — only its local-getter
 * output is meaningful; never serialize this value back to an API.
 */
export function toBrandWallClockDate(dateInput, timezone) {
  const d = new Date(dateInput);
  if (!timezone || isNaN(d.getTime())) return d;
  const p = getPartsInTimezone(d, timezone);
  return new Date(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
}

/**
 * Formats a UTC Date/ISO-string/timestamp for display (e.g. in a calendar
 * card or post list) in the given IANA timezone, using Intl's locale-aware
 * formatting. Falls back to the browser's local timezone if `timezone` is
 * falsy.
 */
export function formatInBrandTimezone(dateInput, timezone, options = {}) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const { locale = 'vi-VN', ...formatOptions } = options;
  return new Intl.DateTimeFormat(locale, {
    ...(timezone ? { timeZone: timezone } : {}),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...formatOptions
  }).format(d);
}

/**
 * The inverse of toBrandDatetimeString: takes a "YYYY-MM-DDTHH:mm" string
 * that represents wall-clock time IN the given timezone (what the
 * datetime-local input holds) and returns the equivalent UTC Date — i.e.
 * "what UTC instant is 2026-08-10T08:00 in Asia/Ho_Chi_Minh".
 *
 * Works by an offset-correction pass: interpret the string as if it were
 * browser-local (cheap, native `new Date(string)` parsing), check what
 * wall-clock time that instant actually renders as in the target timezone,
 * then shift by the difference. Two passes handle the rare case where the
 * first shift crosses a DST boundary in the target zone.
 */
export function brandDatetimeStringToUTC(dateTimeLocalString, timezone) {
  if (!dateTimeLocalString) return null;
  if (!timezone) {
    const d = new Date(dateTimeLocalString);
    return isNaN(d.getTime()) ? null : d;
  }

  let guess = new Date(dateTimeLocalString);
  if (isNaN(guess.getTime())) return null;

  for (let i = 0; i < 2; i++) {
    const p = getPartsInTimezone(guess, timezone);
    const renderedAsLocal = new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`);
    const targetAsLocal = new Date(dateTimeLocalString);
    const diffMs = targetAsLocal.getTime() - renderedAsLocal.getTime();
    if (diffMs === 0) break;
    guess = new Date(guess.getTime() + diffMs);
  }

  return guess;
}
