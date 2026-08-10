/**
 * Shared append-only daily channel-snapshot upsert, backing the single
 * `ChannelMetricDaily` table used by all 6 platforms (YouTube/Facebook/
 * Instagram/Threads/Bluesky/TikTok) — consolidated 2026-08-09 from 6
 * near-identical per-platform tables. One row per (socialAccountId,
 * snapshotDate, platform), upserted so re-syncing the same day updates that
 * row instead of duplicating it.
 *
 * Only YouTube's API reports real historical daily follower deltas — the
 * other 5 platforms only ever expose a *current* point-in-time follower
 * total, so for them there is nothing to backfill; snapshots simply
 * accumulate one real row per day going forward from whenever this first
 * runs. `supportsHistoricalBackfill` selects between the two strategies:
 *
 *  - true (YouTube only): dailyRows spans the whole requested window with
 *    real per-day followersGained/Lost. Walk newest → oldest, reconstructing
 *    the cumulative followersCount for past days by subtracting each day's
 *    delta from today's real cumulative total — an approximation (assumes
 *    reported deltas are accurate), not a value the platform actually
 *    returned for that day.
 *  - false (everyone else): only ever upsert *today's* row with the real
 *    current cumulative total; past days are never touched here (they were
 *    already committed, if at all, by a prior day's own sync).
 *
 * `null` on any dailyRows field (reach/impressions/engagements/
 * followersGained/followersLost) means "this platform has no real data
 * source for this metric" and must stay null through to the DB column —
 * never coerced to 0, which would misrepresent "not measured" as "measured
 * as zero" (e.g. TikTok has no real daily reach API; Bluesky has no
 * reach/impressions concept at all in AT Protocol).
 *
 * `followersCount`/`followersGained`/`followersLost` are the only fields
 * kept as real typed columns on `ChannelMetricDaily` — every other
 * platform-specific counter (views, likes, reach, impressions, mediaCount,
 * YouTube's totalViewsCount, etc.) is written into the `metrics` JSON
 * column instead, since the table is now shared across platforms with
 * different metric shapes. This repository routes each field to the right
 * place automatically based on whether its column name is one of the 3
 * typed follower fields.
 */
const prisma = require('../../config/prisma');
const { getBrandToday } = require('../../utils/brand-timezone.util');

const FOLLOWER_COLUMNS = new Set(['followersCount', 'followersGained', 'followersLost']);

class ChannelSnapshotRepository {
  /**
   * @param {object} prismaModel - client.channelMetricDaily
   * @param {string} brandId
   * @param {string} socialAccountId
   * @param {string} platform - PLATFORMS constant, part of the unique key alongside socialAccountId+snapshotDate
   * @param {{
   *   staticColumns: Record<string, number>,
   *   reconstructible: Array<{ column: string, currentValue: number, gainedKey: string, lostKey: string, emitDeltaColumns: boolean }>
   * }} current
   *   `staticColumns` are cumulative counters with no real per-day delta at
   *   all (e.g. totalVideosCount/mediaCount/postsCount) — passed through
   *   unchanged on every row, past or present. Written into `metrics` JSON
   *   unless the key is `followersCount`.
   *   `reconstructible` lists every cumulative counter that DOES have a real
   *   per-day delta backing it. `column: 'followersCount'` is written to the
   *   typed column; any other column name (e.g. Instagram's `reachCount`,
   *   YouTube's `totalViewsCount`) is written into `metrics` JSON instead.
   *   Each entry gets its own independent backward-reconstruction walk when
   *   supportsHistoricalBackfill is true.
   * @param {Array<{ date: string, [deltaKey: string]: number|null, columns: Record<string, number|null> }>} dailyRows
   *   Oldest → newest or any order; sorted internally. Delta keys referenced
   *   by `reconstructible` live directly on the row; `columns` holds every
   *   other real per-day metric (e.g. { reach: 120, impressions: 500 } for
   *   Facebook) — null means "no real data source for this platform/metric",
   *   written through as null inside `metrics`, never coerced to 0.
   * @param {boolean} supportsHistoricalBackfill
   */
  async upsertChannelSnapshots(prismaModel, brandId, socialAccountId, platform, current, dailyRows, supportsHistoricalBackfill) {
    if (!Array.isArray(dailyRows) || dailyRows.length === 0) return [];

    const { staticColumns = {}, reconstructible = [] } = current;
    // "Today" is resolved in the brand's own timezone, not the server's —
    // dailyRows' own row.date strings come from each platform's analytics
    // API (already calendar dates in whatever timezone that API reports
    // them in) and are compared against this as plain strings, so only the
    // "what day is it right now" reference point needs the brand's
    // timezone; the per-row dates themselves are left as-is.
    const brand = await prisma.brand.findUnique({ where: { id: brandId }, select: { timezone: true } });
    const todayStr = getBrandToday(brand?.timezone).toISOString().split('T')[0];

    const rowsToProcess = supportsHistoricalBackfill
      ? [...dailyRows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      : dailyRows.filter((row) => row.date === todayStr);

    const running = new Map(reconstructible.map((r) => [r.column, r.currentValue]));
    const results = [];

    for (const row of rowsToProcess) {
      const isToday = row.date === todayStr;
      const snapshotDate = new Date(row.date);

      const typedData = {};
      const metrics = { ...staticColumns, ...row.columns };

      for (const r of reconstructible) {
        const value = isToday ? r.currentValue : running.get(r.column);
        if (FOLLOWER_COLUMNS.has(r.column)) {
          typedData[r.column] = value;
        } else {
          metrics[r.column] = value;
        }
        if (r.emitDeltaColumns) {
          const gained = row[r.gainedKey] ?? null;
          const lost = r.lostKey ? (row[r.lostKey] ?? null) : null;
          if (FOLLOWER_COLUMNS.has(r.gainedKey)) {
            typedData[r.gainedKey] = gained;
          } else {
            metrics[r.gainedKey] = gained;
          }
          if (r.lostKey) {
            if (FOLLOWER_COLUMNS.has(r.lostKey)) {
              typedData[r.lostKey] = lost;
            } else {
              metrics[r.lostKey] = lost;
            }
          }
        }
      }

      // staticColumns/row.columns keys that happen to be follower-column
      // names would be unusual (no current adapter does this) but route
      // correctly if it ever happens.
      for (const key of Object.keys(metrics)) {
        if (FOLLOWER_COLUMNS.has(key)) {
          typedData[key] = metrics[key];
          delete metrics[key];
        }
      }

      const data = { ...typedData, metrics };

      results.push(await prismaModel.upsert({
        where: { socialAccountId_snapshotDate_platform: { socialAccountId, snapshotDate, platform } },
        update: { ...data, fetchedAt: new Date() },
        create: { brandId, socialAccountId, platform, snapshotDate, ...data }
      }));

      if (supportsHistoricalBackfill) {
        for (const r of reconstructible) {
          const gained = row[r.gainedKey] || 0;
          const lost = r.lostKey ? (row[r.lostKey] || 0) : 0;
          running.set(r.column, running.get(r.column) - gained + lost);
        }
      }
    }

    return results;
  }
}

module.exports = new ChannelSnapshotRepository();
