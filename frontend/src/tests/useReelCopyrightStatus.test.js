/* eslint-disable no-undef */
import { renderHook, act } from '@testing-library/react';
import { useReelCopyrightStatus } from '../hooks/useReelCopyrightStatus';
import apiService from '../services/api';

jest.mock('../services/api');

describe('useReelCopyrightStatus Hook Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start polling and stop when copyright check is complete', async () => {
    // Return incomplete first, then complete
    apiService.get.mockResolvedValueOnce({
      data: { data: { copyright_check_information: { status: { status: 'in_progress' } } } }
    });
    apiService.get.mockResolvedValueOnce({
      data: { data: { copyright_check_information: { status: { status: 'complete', matches_found: false } } } }
    });

    const { result } = renderHook(() => useReelCopyrightStatus('brand_1', 'video_123'));

    expect(result.current.status).toBe('idle');

    act(() => {
      result.current.startPolling();
    });

    expect(result.current.status).toBe('polling');
    expect(apiService.get).toHaveBeenCalledTimes(1);

    // Resolve first poll (still in progress)
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(apiService.get).toHaveBeenCalledTimes(2);

    // Resolve second poll (complete)
    await act(async () => {
      // Allow promise to resolve
    });

    expect(result.current.status).toBe('complete');
    expect(result.current.copyrightResult.matchesFound).toBe(false);
  });

  it('should apply retry-after backoff when receiving a 429 error', async () => {
    const error429 = {
      response: {
        status: 429,
        data: { retryAfterSeconds: 15 }
      }
    };
    apiService.get.mockRejectedValueOnce(error429);

    const { result } = renderHook(() => useReelCopyrightStatus('brand_1', 'video_123'));

    act(() => {
      result.current.startPolling();
    });

    await act(async () => {
      // Resolve request with rejection
    });

    // It should schedule next poll after 15 seconds
    expect(apiService.get).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(5000); // Base was 5s, but 429 backoff should wait 15s
    });
    expect(apiService.get).toHaveBeenCalledTimes(1); // Not called yet

    act(() => {
      jest.advanceTimersByTime(10000); // Total 15s advanced
    });
    expect(apiService.get).toHaveBeenCalledTimes(2); // Called now
  });

  it('should stop polling immediately on a permanent error (404)', async () => {
    const error404 = { response: { status: 404, data: {} } };
    apiService.get.mockRejectedValueOnce(error404);

    const { result } = renderHook(() => useReelCopyrightStatus('brand_1', 'video_123'));

    act(() => {
      result.current.startPolling();
    });

    await act(async () => {
      // Resolve request with rejection
    });

    expect(result.current.status).toBe('failed');
    expect(apiService.get).toHaveBeenCalledTimes(1);

    // No further polls should be scheduled
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(apiService.get).toHaveBeenCalledTimes(1);
  });

  it('should stop polling after exceeding max transient retries on repeated 5xx errors', async () => {
    const error500 = { response: { status: 500, data: {} } };
    apiService.get.mockRejectedValue(error500);

    const { result } = renderHook(() => useReelCopyrightStatus('brand_1', 'video_123'));

    act(() => {
      result.current.startPolling();
    });

    // Initial call + 3 retries = 4 calls total before giving up
    for (let i = 0; i < 4; i += 1) {
      await act(async () => {
        jest.advanceTimersByTime(30000);
      });
    }

    expect(result.current.status).toBe('failed');
    expect(apiService.get).toHaveBeenCalledTimes(4);

    // No further polls after giving up
    await act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(apiService.get).toHaveBeenCalledTimes(4);
  });
});
