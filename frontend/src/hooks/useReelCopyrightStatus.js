import { useState, useEffect, useRef, useCallback } from 'react';
import socialService from '../services/social.service';

const INITIAL_INTERVAL_MS = 5000;
const MAX_INTERVAL_MS = 30000;
const BACKOFF_FACTOR = 1.5;
const MAX_TRANSIENT_RETRIES = 3;
const PERMANENT_ERROR_STATUSES = [400, 401, 403, 404];

/**
 * useReelCopyrightStatus
 * Hook hỗ trợ poll trạng thái kiểm tra bản quyền (copyright check) cho Facebook Reels.
 * Áp dụng cơ chế Backoff để giảm tần suất gửi request khi gặp lỗi hoặc Rate Limit (429).
 */
export function useReelCopyrightStatus(brandId, videoId, socialAccountId = null) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'polling' | 'complete' | 'failed'
  const [copyrightResult, setCopyrightResult] = useState(null);
  const [error, setError] = useState(null);
  
  const timerRef = useRef(null);
  const currentIntervalRef = useRef(INITIAL_INTERVAL_MS);
  const transientRetryCountRef = useRef(0);
  
  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setStatus(current => current === 'polling' ? 'idle' : current);
  }, []);

  const poll = useCallback(async () => {
    if (!brandId || !videoId) {
      setStatus('failed');
      setError('brandId and videoId are required for copyright polling');
      return;
    }

    try {
      setError(null);
      const data = await socialService.getReelCopyrightStatus(brandId, videoId, socialAccountId);
      const checkInfo = data?.copyright_check_information || data?.data?.copyright_check_information || {};
      const statusInfo = checkInfo.status || {};

      if (statusInfo.status === 'complete') {
        setStatus('complete');
        setCopyrightResult({
          matchesFound: statusInfo.matches_found ?? false,
          details: checkInfo
        });
        stopPolling();
      } else {
        // Nếu chưa hoàn thành, tiếp tục poll sau khoảng thời gian chỉ định
        transientRetryCountRef.current = 0;
        timerRef.current = setTimeout(poll, currentIntervalRef.current);
      }
    } catch (err) {
      console.warn('[useReelCopyrightStatus] Poll request failed:', err);

      const httpStatus = err.response?.status;

      if (httpStatus === 429) {
        // Recovery path: Giãn cách theo header Retry-After từ backend, không tính vào transient retry
        const retryAfter = err.response.data?.retryAfterSeconds || 10;
        console.warn(`[useReelCopyrightStatus] Rate limited (429). Retrying after ${retryAfter}s`);
        currentIntervalRef.current = retryAfter * 1000;
        timerRef.current = setTimeout(poll, currentIntervalRef.current);
      } else if (PERMANENT_ERROR_STATUSES.includes(httpStatus)) {
        // Lỗi vĩnh viễn: dừng polling ngay lập tức
        console.warn(`[useReelCopyrightStatus] Permanent error (${httpStatus}). Stopping polling.`);
        setStatus('failed');
        setError(err);
        stopPolling();
      } else {
        // Lỗi mạng tạm thời (5xx, timeout, network error): retry tối đa MAX_TRANSIENT_RETRIES lần
        transientRetryCountRef.current += 1;
        if (transientRetryCountRef.current > MAX_TRANSIENT_RETRIES) {
          console.warn('[useReelCopyrightStatus] Max transient retries exceeded. Stopping polling.');
          setStatus('failed');
          setError(err);
          stopPolling();
          return;
        }
        currentIntervalRef.current = Math.min(currentIntervalRef.current * BACKOFF_FACTOR, MAX_INTERVAL_MS);
        console.warn(`[useReelCopyrightStatus] Transient error (attempt ${transientRetryCountRef.current}/${MAX_TRANSIENT_RETRIES}). Backing off to ${currentIntervalRef.current}ms`);
        timerRef.current = setTimeout(poll, currentIntervalRef.current);
      }
    }
  }, [brandId, videoId, socialAccountId, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    setStatus('polling');
    currentIntervalRef.current = INITIAL_INTERVAL_MS;
    setError(null);
    setCopyrightResult(null);
    poll();
  }, [stopPolling, poll]);

  // Clean up timer khi component unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    copyrightResult,
    error,
    startPolling,
    stopPolling,
    isPolling: status === 'polling',
    isComplete: status === 'complete'
  };
}
