import { useRef, useCallback } from "react";

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

  return { start, isLatest };
}

export default useLatestRequestId;
