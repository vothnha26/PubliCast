import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import apiService from '../services/api';
import socketClient from '../services/socket';
import { VIDEO_SOCKET_EVENTS, VIDEO_API_ROUTES } from '../constants/video-editor';

export function useVideoProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  // Split-into-clips mode: multiple segments, each its own BullMQ task.
  // Tracked separately from currentTaskId (single-clip mode) since the two
  // paths have different completion criteria (1 task vs N tasks all done).
  const [segmentTasks, setSegmentTasks] = useState(null); // [{taskId, startTime, endTime}] | null
  const pollingRef = useRef(null);
  const settingsRef = useRef(null);
  const onSuccessRef = useRef(null);
  const onErrorRef = useRef(null);
  const segmentResultsRef = useRef(null); // Map<taskId, {status, videoUrl, error}>

  // Hàm kích hoạt tiến trình xử lý video
  const startVideoProcessing = async ({ params, settings, onSuccess, onError }) => {
    setIsProcessing(true);
    settingsRef.current = settings;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;

    toast.loading("Đang đẩy video vào hàng đợi xử lý...", { id: "video-edit-toast" });

    try {
      const res = await apiService.post(VIDEO_API_ROUTES.TRIM, params);
      if (res.status === 202 && Array.isArray(res.data.segments) && res.data.segments.length > 0) {
        const segments = res.data.segments;
        segmentResultsRef.current = new Map(
          segments.map((s) => [s.taskId, { status: 'PROCESSING', videoUrl: null, error: null }])
        );
        setSegmentTasks(segments);
        toast.loading(`Đang tách video thành ${segments.length} đoạn và xử lý ở chế độ chạy ngầm...`, { id: "video-edit-toast" });
      } else if (res.status === 202) {
        const { taskId } = res.data;
        setCurrentTaskId(taskId);
        toast.loading("Video đang được xử lý ở chế độ chạy ngầm...", { id: "video-edit-toast" });
      } else {
        // Phòng trường hợp backend trả về status khác 202 (không rơi vào nhánh
        // catch vì không phải lỗi HTTP) — tránh isProcessing bị kẹt mãi ở true
        // mà không có taskId để polling/socket theo dõi.
        console.warn("[useVideoProcessing] Unexpected response status:", res.status, res.data);
        setIsProcessing(false);
        toast.error("Phản hồi không hợp lệ từ máy chủ khi xử lý video.", { id: "video-edit-toast" });
        if (onError) onError(new Error(`Unexpected response status: ${res.status}`));
      }
    } catch (err) {
      console.error("[useVideoProcessing] ❌ Error triggering processing:", err.message);
      setIsProcessing(false);
      toast.error(err.response?.data?.message || "Lỗi gửi yêu cầu xử lý video.", { id: "video-edit-toast" });
      if (onError) onError(err);
    }
  };

  useEffect(() => {
    if (!currentTaskId) return;

    const cleanup = () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      socketClient.off(VIDEO_SOCKET_EVENTS.SUCCESS, handleSocketSuccess);
      socketClient.off(VIDEO_SOCKET_EVENTS.FAILED, handleSocketFailed);
      if (socketClient.socket) {
        socketClient.socket.off('connect', handleSocketReconnect);
      }
    };

    const handleSocketSuccess = (data) => {
      if (data.taskId === currentTaskId) {
        console.log("⚡ [Socket] Received success event for task:", currentTaskId);
        cleanup();
        setIsProcessing(false);
        setCurrentTaskId(null);
        if (onSuccessRef.current) {
          onSuccessRef.current(data.videoUrl, settingsRef.current);
        }
      }
    };

    const handleSocketFailed = (data) => {
      if (data.taskId === currentTaskId) {
        console.error("⚡ [Socket] Received failed event for task:", currentTaskId);
        cleanup();
        setIsProcessing(false);
        setCurrentTaskId(null);
        toast.error(`Lỗi xử lý video: ${data.error}`, { id: "video-edit-toast" });
        if (onErrorRef.current) {
          onErrorRef.current(new Error(data.error));
        }
      }
    };

    const checkStatus = async () => {
      try {
        const res = await apiService.get(VIDEO_API_ROUTES.STATUS(currentTaskId));
        if (res.data.status === "SUCCESS") {
          console.log("⚡ [Polling] Task completed successfully via status check");
          cleanup();
          setIsProcessing(false);
          setCurrentTaskId(null);
          if (onSuccessRef.current) {
            onSuccessRef.current(res.data.videoUrl, settingsRef.current);
          }
        } else if (res.data.status === "FAILED") {
          console.error("⚡ [Polling] Task failed via status check:", res.data.error);
          cleanup();
          setIsProcessing(false);
          setCurrentTaskId(null);
          toast.error(`Lỗi xử lý video: ${res.data.error}`, { id: "video-edit-toast" });
          if (onErrorRef.current) {
            onErrorRef.current(new Error(res.data.error));
          }
        }
      } catch (err) {
        console.warn("⚠️ [useVideoProcessing] Error checking status:", err.message);
      }
    };

    const handleSocketReconnect = () => {
      console.log("⚡ [Socket Reconnect] Checking task status immediately...");
      checkStatus();
    };

    // Đăng ký các event listeners qua socketClient
    socketClient.on(VIDEO_SOCKET_EVENTS.SUCCESS, handleSocketSuccess);
    socketClient.on(VIDEO_SOCKET_EVENTS.FAILED, handleSocketFailed);
    if (socketClient.socket) {
      socketClient.socket.on('connect', handleSocketReconnect);
    }

    // Polling dự phòng mỗi 2 giây
    pollingRef.current = setInterval(checkStatus, 2000);

    return cleanup;
  }, [currentTaskId]);

  // Split-into-clips mode: poll every segment's taskId independently (no
  // dedicated socket wiring for a set of task ids, so this path is
  // poll-only). Only resolves once every segment reaches a terminal state,
  // so a slow segment doesn't get silently dropped from the ordered list.
  useEffect(() => {
    if (!segmentTasks) return;

    const segmentPollRef = { current: null };

    const checkAllSegments = async () => {
      const results = segmentResultsRef.current;
      const pending = segmentTasks.filter((s) => results.get(s.taskId).status === 'PROCESSING');

      try {
        await Promise.all(
          pending.map(async (s) => {
            const res = await apiService.get(VIDEO_API_ROUTES.STATUS(s.taskId));
            if (res.data.status === 'SUCCESS' || res.data.status === 'FAILED') {
              results.set(s.taskId, {
                status: res.data.status,
                videoUrl: res.data.videoUrl || null,
                error: res.data.error || null
              });
            }
          })
        );
      } catch (err) {
        console.warn('⚠️ [useVideoProcessing] Error checking segment status:', err.message);
        return;
      }

      const allDone = segmentTasks.every((s) => results.get(s.taskId).status !== 'PROCESSING');
      if (!allDone) return;

      clearInterval(segmentPollRef.current);
      setIsProcessing(false);
      setSegmentTasks(null);

      const failed = segmentTasks.find((s) => results.get(s.taskId).status === 'FAILED');
      if (failed) {
        toast.error(`Lỗi xử lý một trong các đoạn video: ${results.get(failed.taskId).error}`, { id: "video-edit-toast" });
        if (onErrorRef.current) onErrorRef.current(new Error(results.get(failed.taskId).error));
        return;
      }

      const orderedUrls = segmentTasks.map((s) => results.get(s.taskId).videoUrl).filter(Boolean);
      if (onSuccessRef.current) {
        onSuccessRef.current(orderedUrls, settingsRef.current);
      }
    };

    segmentPollRef.current = setInterval(checkAllSegments, 2000);
    return () => clearInterval(segmentPollRef.current);
  }, [segmentTasks]);

  return {
    isProcessing,
    currentTaskId,
    startVideoProcessing
  };
}
export default useVideoProcessing;
