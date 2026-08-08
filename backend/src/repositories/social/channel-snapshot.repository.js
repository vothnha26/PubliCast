/**
 * Shared append-only daily channel-snapshot upsert, used by all 6 platforms'
 * *ChannelSnapshot Prisma models (YouTube/Facebook/Instagram/Threads/
 * Bluesky/TikTok). One row per socialAccountId per calendar day, upserted so
 * re-syncing the same day updates that row instead of duplicating it.
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
 */
class ChannelSnapshotRepository {
  /**
   * @param {object} prismaModel - e.g. client.youTubeChannelSnapshot
   * @param {string} brandId
   * @param {string} socialAccountId
   * @param {{
   *   staticColumns: Record<string, number>,
   *   reconstructible: Array<{ column: string, currentValue: number, gainedKey: string, lostKey: string }>
   * }} current
   *   `staticColumns` are cumulative counters with no real per-day delta at
   *   all (e.g. totalVideosCount/mediaCount/postsCount) — passed through
   *   unchanged on every row, past or present.
   *   `reconstructible` lists every cumulative counter that DOES have a real
   *   per-day delta backing it (e.g. followers: column 'subscribersCount',
   *   currentValue 1000, gainedKey/lostKey pointing at dailyRows fields,
   *   emitDeltaColumns true since subscribersGained/Lost are real DB
   *   columns; or YouTube's views: column 'totalViewsCount', gainedKey
   *   'views', no lostKey, emitDeltaColumns FALSE since there is no
   *   standalone `views` column on the model — only the reconstructed
   *   cumulative totalViewsCount is stored). Each one gets its own
   *   independent backward-reconstruction walk when supportsHistoricalBackfill
   *   is true.
   * @param {Array<{ date: string, [deltaKey: string]: number|null, columns: Record<string, number|null> }>} dailyRows
   *   Oldest → newest or any order; sorted internally. Delta keys referenced
   *   by `reconstructible` live directly on the row; `columns` holds every
   *   other real per-day metric already named to match the Prisma model
   *   (e.g. { reach: 120, impressions: 500 } for Facebook) — null means "no
   *   real data source for this platform/metric", written through as null,
   *   never coerced to 0.
   * @param {boolean} supportsHistoricalBackfill
   */
  async upsertChannelSnapshots(prismaModel, brandId, socialAccountId, current, dailyRows, supportsHistoricalBackfill) {
    if (!Array.isArray(dailyRows) || dailyRows.length === 0) return [];

    const { staticColumns = {}, reconstructible = [] } = current;
    const todayStr = new Date().toISOString().split('T')[0];

    const rowsToProcess = supportsHistoricalBackfill
      ? [...dailyRows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      : dailyRows.filter((row) => row.date === todayStr);

    const running = new Map(reconstructible.map((r) => [r.column, r.currentValue]));
    const results = [];

    for (const row of rowsToProcess) {
      const isToday = row.date === todayStr;
      const snapshotDate = new Date(row.date);

      const data = { ...staticColumns, ...row.columns };
      for (const r of reconstructible) {
        data[r.column] = isToday ? r.currentValue : running.get(r.column);
        if (r.emitDeltaColumns) {
          data[r.gainedKey] = row[r.gainedKey] ?? null;
          if (r.lostKey) data[r.lostKey] = row[r.lostKey] ?? null;
        }
      }

      results.push(await prismaModel.upsert({
        where: { socialAccountId_snapshotDate: { socialAccountId, snapshotDate } },
        update: { ...data, fetchedAt: new Date() },
        create: { brandId, socialAccountId, snapshotDate, ...data }
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
