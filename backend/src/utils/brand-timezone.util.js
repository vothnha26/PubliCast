/**
 * Backend counterpart to frontend/src/utils/brandTimezone.js — a JS Date has
 * no timezone of its own, so every Daily-snapshot table (ChannelMetricDaily,
 * PostMetricDaily, PostingUsageDaily) needs an explicit way to answer
 * "what calendar day is this UTC instant, in the brand's own timezone" for
 * its snapshotDate column, rather than always taking the server/UTC day.
 * Uses Intl.DateTimeFormat (built into Node) instead of a timezone library.
 */

/**
 * Returns the calendar day (as a UTC-midnight Date, matching Prisma's
 * @db.Date columns) that `dateInput` falls on when viewed in `timezone`.
 * Falls back to UTC if `timezone` is falsy (brand has none configured yet).
 *
 * @param {Date|string|number} dateInput
 * @param {string|null|undefined} timezone - IANA timezone, e.g. "Asia/Ho_Chi_Minh"
 * @returns {Date} UTC-midnight Date for that calendar day
 */
function getBrandCalendarDate(dateInput, timezone) {
  const d = new Date(dateInput);
  if (!timezone) {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = {};
  for (const { type, value } of formatter.formatToParts(d)) {
    if (type === 'year' || type === 'month' || type === 'day') parts[type] = value;
  }
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

/**
 * Same calendar-day resolution as getBrandCalendarDate, but for "right now"
 * — the common case (stamping today's row while syncing/publishing).
 */
function getBrandToday(timezone) {
  return getBrandCalendarDate(new Date(), timezone);
}

module.exports = {
  getBrandCalendarDate,
  getBrandToday
};
