import { useState, useEffect, useCallback } from 'react';
import socialService from '../services/social.service';

/**
 * Hook duy nhất quản lý lifetime analytics data cho 1 video YouTube.
 *
 * Trả về:
 *   - insights: { summary, trafficSource, deviceType, demographics, geography, searchTerms, errors }
 *   - isLoading: boolean
 *   - error: string | null  (lỗi toàn bộ request, khác với errors per-section trong insights)
 *   - refetch: () => void   (gọi lại API — dùng chung cho mọi section khi retry)
 *
 * Ghi chú thiết kế (v4):
 *   - Không có ?force flag — cache TTL 2h là đủ (Analytics trễ 24-48h).
 *   - onRetry ở mọi section đều trỏ về refetch() này, không tạo 6 API riêng.
 *   - Nếu brandId hoặc videoId null/undefined → không fetch, trả về state rỗng.
 */
export function useVideoInsights(brandId, videoId) {
  const [insights, setInsights]   = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const fetchInsights = useCallback(async () => {
    if (!brandId || !videoId) {
      setInsights(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await socialService.getVideoInsights(brandId, videoId);
      setInsights(data);
    } catch (err) {
      console.error('[useVideoInsights] Failed to fetch:', err);
      setError(err?.response?.data?.message || 'Không thể tải dữ liệu phân tích video.');
      setInsights(null);
    } finally {
      setIsLoading(false);
    }
  }, [brandId, videoId]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { insights, isLoading, error, refetch: fetchInsights };
}
