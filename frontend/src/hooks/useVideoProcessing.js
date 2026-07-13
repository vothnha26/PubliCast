import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import apiService from '../services/api';
import socketClient from '../services/socket';
import { VIDEO_SOCKET_EVENTS, VIDEO_API_ROUTES } from '../constants/video-editor';

export function useVideoProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const pollingRef = useRef(null);
  const settingsRef = useRef(null);
  const onSuccessRef = useRef(null);
  const onErrorRef = useRef(null);

  // Hàm kích hoạt tiến trình xử lý video
  const startVideoProcessing = async ({ params, settings, onSuccess, onError }) => {
    setIsProcessing(true);
    settingsRef.current = settings;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;

    toast.loading("Đang đẩy video vào hàng đợi xử lý...", { id: "video-edit-toast" });

    try {
      const res = await apiService.post(VIDEO_API_ROUTES.TRIM, params);
      if (res.status === 202) {
        const { taskId } = res.data;
        setCurrentTaskId(taskId);
        toast.loading("Video đang được xử lý ở chế độ chạy ngầm...", { id: "video-edit-toast" });
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

  return {
    isProcessing,
    currentTaskId,
    startVideoProcessing
  };
}
export default useVideoProcessing;
