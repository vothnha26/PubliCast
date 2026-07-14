import { STORAGE_KEYS } from '../constants/storageKeys';

export function openNotificationStream() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const base = apiBaseUrl.replace(/\/$/, "");
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

  const url = token 
    ? `${base}/notifications/stream?token=${encodeURIComponent(token)}` 
    : `${base}/notifications/stream`;

  return new EventSource(url, {
    withCredentials: true
  });
}
