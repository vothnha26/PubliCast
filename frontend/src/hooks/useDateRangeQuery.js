import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { subDays, parseISO, isValid } from "date-fns";

const QUERY_KEY_FROM = "from";
const QUERY_KEY_TO = "to";

/**
 * Date-range state synced to the URL's ?from=&to= query params (ISO
 * yyyy-MM-dd), so a filtered insights/analytics view is shareable/
 * bookmarkable and survives a refresh instead of silently resetting to the
 * default 30-day window. Falls back to the given defaults when the URL has
 * no range or an unparseable one.
 */
export function useDateRangeQuery(defaultDays = 29) {
  const [searchParams, setSearchParams] = useSearchParams();

  const dateRange = useMemo(() => {
    const fromParam = searchParams.get(QUERY_KEY_FROM);
    const toParam = searchParams.get(QUERY_KEY_TO);
    const from = fromParam ? parseISO(fromParam) : null;
    const to = toParam ? parseISO(toParam) : null;

    return {
      from: from && isValid(from) ? from : subDays(new Date(), defaultDays),
      to: to && isValid(to) ? to : new Date(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get(QUERY_KEY_FROM), searchParams.get(QUERY_KEY_TO)]);

  const setDateRange = useCallback((next) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      const resolved = typeof next === "function" ? next(dateRange) : next;

      if (resolved?.from && isValid(resolved.from)) {
        params.set(QUERY_KEY_FROM, resolved.from.toISOString().slice(0, 10));
      } else {
        params.delete(QUERY_KEY_FROM);
      }

      if (resolved?.to && isValid(resolved.to)) {
        params.set(QUERY_KEY_TO, resolved.to.toISOString().slice(0, 10));
      } else {
        params.delete(QUERY_KEY_TO);
      }

      return params;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSearchParams, dateRange]);

  return [dateRange, setDateRange];
}
