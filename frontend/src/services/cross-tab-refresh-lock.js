/**
 * Coordinates the 401 -> POST /auth/refresh -> retry flow across browser
 * tabs. Auth uses refresh-token rotation (each successful refresh replaces
 * the stored token) — with multiple tabs open, each tab's own in-memory
 * `isRefreshing` flag only prevents duplicate refresh calls WITHIN that tab.
 * If two tabs independently hit a 401 around the same time (e.g. the access
 * token just expired), they'd both call /auth/refresh; the second one sends
 * a refresh token the first has already rotated away, gets a 401 back, and
 * that tab force-logs-out the user even though the first tab's refresh
 * succeeded fine. BroadcastChannel makes every tab agree on a single
 * in-flight refresh instead of racing.
 */
const CHANNEL_NAME = 'publicast-auth-refresh';
const LOCK_STALE_MS = 10000; // Guards against a crashed/closed tab holding the lock forever.

const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

let isLeader = false; // This tab currently owns the in-flight refresh call.
let pendingResolvers = []; // Callbacks waiting on the CURRENT refresh (leader or follower).
let lockTimeout = null;

const settleAll = (result) => {
  const resolvers = pendingResolvers;
  pendingResolvers = [];
  resolvers.forEach((resolve) => resolve(result));
};

if (channel) {
  channel.onmessage = (event) => {
    const { type } = event.data || {};
    if (type === 'refreshed') {
      settleAll({ ok: true });
    } else if (type === 'refresh-failed') {
      settleAll({ ok: false });
    }
    // 'refreshing' from another tab needs no action here — a follower only
    // needs to know when the leader's refresh has resolved, not that it started.
  };
}

/**
 * Runs `performRefresh` at most once across all tabs for the current wave
 * of 401s. Callers awaiting a refresh another tab already owns get the same
 * { ok } result once it resolves, without issuing their own request.
 *
 * @param {() => Promise<void>} performRefresh - Calls POST /auth/refresh.
 * @returns {Promise<{ ok: boolean }>}
 */
export function withCrossTabRefreshLock(performRefresh) {
  if (isLeader) {
    // Already refreshing in this tab (e.g. two requests 401'd back-to-back
    // before the first refresh resolved) — just queue behind it.
    return new Promise((resolve) => pendingResolvers.push(resolve));
  }

  if (!channel) {
    // BroadcastChannel unsupported — fall back to single-tab-only locking,
    // same as the old isRefreshing flag.
    return runAsLeader(performRefresh);
  }

  return runAsLeader(performRefresh);
}

async function runAsLeader(performRefresh) {
  isLeader = true;
  channel?.postMessage({ type: 'refreshing' });

  // Safety net: if this tab is closed/crashes mid-refresh, followers in
  // other tabs would otherwise wait forever for a 'refreshed'/'refresh-failed'
  // message that never comes. Not currently reachable (no cross-tab wait
  // exceeds this), but keeps the lock from wedging if that ever changes.
  lockTimeout = setTimeout(() => {
    settleAll({ ok: false });
  }, LOCK_STALE_MS);

  try {
    await performRefresh();
    clearTimeout(lockTimeout);
    isLeader = false;
    channel?.postMessage({ type: 'refreshed' });
    settleAll({ ok: true });
    return { ok: true };
  } catch (err) {
    clearTimeout(lockTimeout);
    isLeader = false;
    channel?.postMessage({ type: 'refresh-failed' });
    settleAll({ ok: false });
    return { ok: false };
  }
}
