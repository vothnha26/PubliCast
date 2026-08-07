/**
 * Merges multiple `Analytics` rows (from GET /social/metrics's `analytics[]`,
 * newest first) into one de-duplicated `raw` blob shaped like a single row's
 * parsed `audienceDemographicsJson`.
 *
 * Each row already embeds its own overlapping ~31-day window (see
 * social.service.js's comment on payload size) rather than one incremental
 * day — so naively concatenating rows would produce duplicate/conflicting
 * entries for the same date. Instead, for every date-keyed array
 * (growth/balance/clicks/postsPeriod), the newest row's entry for a given
 * date wins; a date present in an older row but not the newest one still
 * gets filled in from that older row, extending real coverage beyond a
 * single sync's window.
 *
 * `interactions`/`summary` (aggregate totals, not per-day) come from the
 * single newest row only, matching prior single-row behavior.
 */
export function mergeAnalyticsRows(analyticsRows) {
  if (!Array.isArray(analyticsRows) || analyticsRows.length === 0) return null;

  const rawRows = analyticsRows
    .map((row) => {
      const json = row?.socialAnalytics?.audienceDemographicsJson;
      if (!json) return null;
      try {
        return JSON.parse(json);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (rawRows.length === 0) return null;
  if (rawRows.length === 1) return rawRows[0];

  const mergeDateArray = (key) => {
    const byDate = new Map();
    // Iterate oldest → newest so a newer row's entry for the same date
    // overwrites an older row's — Map.set on an existing key keeps insertion
    // order but replaces the value, achieving "newest wins" without a sort.
    for (let i = rawRows.length - 1; i >= 0; i--) {
      const arr = rawRows[i]?.[key];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        const date = entry?.date;
        if (!date) continue;
        byDate.set(date, entry);
      }
    }
    return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  };

  return {
    ...rawRows[0],
    growth: mergeDateArray('growth'),
    balance: mergeDateArray('balance'),
    clicks: mergeDateArray('clicks'),
    postsPeriod: mergeDateArray('postsPeriod'),
  };
}
