import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import videoEditorService from '../services/videoEditor.service';
import socketClient from '../services/socket';
import { VIDEO_SOCKET_EVENTS } from '../constants/video-editor';
import logger from '../utils/logger';

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
      const res = await videoEditorService.trim(params);
      if (Array.isArray(res?.segments) && res.segments.length > 0) {
        const segments = res.segments;
        segmentResultsRef.current = new Map(
          segments.map((s) => [s.taskId, { status: 'PROCESSING', videoUrl: null, error: null }])
        );
        setSegmentTasks(segments);
        toast.loading(`Đang tách video thành ${segments.length} đoạn và xử lý ở chế độ chạy ngầm...`, { id: "video-edit-toast" });
      } else if (res?.taskId) {
        const { taskId } = res;
        setCurrentTaskId(taskId);
        toast.loading("Video đang được xử lý ở chế độ chạy ngầm...", { id: "video-edit-toast" });
      } else {
        console.warn("[useVideoProcessing] Unexpected response format:", res);
        setIsProcessing(false);
        toast.error("Phản hồi không hợp lệ từ máy chủ khi xử lý video.", { id: "video-edit-toast" });
        if (onError) onError(new Error("Unexpected response format"));
      }
    } catch (err) {
      console.error("[useVideoProcessing] ❌ Error triggering processing:", err.message);
      setIsProcessing(false);
      toast.error(err.message || "Lỗi gửi yêu cầu xử lý video.", { id: "video-edit-toast" });
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
        logger.debug("⚡ [Socket] Received success event for task:", currentTaskId);
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
        const data = await videoEditorService.getStatus(currentTaskId);
        const taskStatus = data?.status || data?.data?.status;
        const videoUrl = data?.videoUrl || data?.data?.videoUrl;
        const error = data?.error || data?.data?.error;
        if (taskStatus === "SUCCESS") {
          logger.debug("⚡ [Polling] Task completed successfully via status check");
          cleanup();
          setIsProcessing(false);
          setCurrentTaskId(null);
          if (onSuccessRef.current) {
            onSuccessRef.current(videoUrl, settingsRef.current);
          }
        } else if (taskStatus === "FAILED") {
          console.error("⚡ [Polling] Task failed via status check:", error);
          cleanup();
          setIsProcessing(false);
          setCurrentTaskId(null);
          toast.error(`Lỗi xử lý video: ${error}`, { id: "video-edit-toast" });
          if (onErrorRef.current) {
            onErrorRef.current(new Error(error));
          }
        }
      } catch (err) {
        console.warn("⚠️ [useVideoProcessing] Error checking status:", err.message);
      }
    };

    const handleSocketReconnect = () => {
      logger.debug("⚡ [Socket Reconnect] Checking task status immediately...");
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
            const data = await videoEditorService.getStatus(s.taskId);
            const status = data?.status || data?.data?.status;
            const videoUrl = data?.videoUrl || data?.data?.videoUrl;
            const error = data?.error || data?.data?.error;
            if (status === 'SUCCESS' || status === 'FAILED') {
              results.set(s.taskId, {
                status,
                videoUrl: videoUrl || null,
                error: error || null
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
