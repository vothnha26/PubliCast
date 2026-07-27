import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook managing filter states via URL search parameters.
 * @param {Object} defaultFilters - Default values for filters
 * @returns {{ filters, updateFilters, clearFilters, searchParamsString }}
 */
export function useFilters(defaultFilters = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Convert searchParams entries to object and merge with defaultFilters
  const filters = { ...defaultFilters };
  for (const [key, value] of searchParams.entries()) {
    filters[key] = value;
  }

  // Update one or more filter values
  const updateFilters = useCallback((newFilters) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);

      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === null || value === '' || value === undefined) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      // Always reset back to page 1 when filter changes (unless explicitly setting page)
      if (!('page' in newFilters)) {
        params.set('page', '1');
      }

      return params;
    });
  }, [setSearchParams]);

  // Clear all filters back to empty
  const clearFilters = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

  return {
    filters,
    updateFilters,
    clearFilters,
    searchParamsString: searchParams.toString()
  };
}
