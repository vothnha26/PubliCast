import { useRef, useCallback, useMemo } from "react";

/**
 * Shared request-id guard for fetch-race bugs: a slow, older request that
 * resolves after a newer one has already started must not overwrite the
 * newer request's state (#78).
 *
 * Usage:
 *   const { start, isLatest } = useLatestRequestId();
 *   const fetchThing = async () => {
 *     const requestId = start();
 *     const res = await apiService.get(...);
 *     if (!isLatest(requestId)) return; // stale, discard
 *     setThing(res.data);
 *   };
 */
export function useLatestRequestId() {
  const ref = useRef(0);

  const start = useCallback(() => {
    ref.current += 1;
    return ref.current;
  }, []);

  const isLatest = useCallback((requestId) => requestId === ref.current, []);

  // start/isLatest are already stable refs, but without memoizing this
  // wrapper object itself, every call site got a new object identity on
  // every render. Consumers that put the returned object in a useCallback/
  // useEffect dependency array (e.g. usePlatformDashboard's loadMetrics)
  // would then recreate that callback every render, retriggering any effect
  // depending on it — an infinite render-fetch-render loop.
  return useMemo(() => ({ start, isLatest }), [start, isLatest]);
}

export default useLatestRequestId;
