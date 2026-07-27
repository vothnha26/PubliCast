export function openNotificationStream() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
  const base = apiBaseUrl.replace(/\/$/, "");

  // Auth is via the HttpOnly accessToken cookie (withCredentials below sends
  // it automatically) — the backend's verifyAuth middleware checks the
  // cookie first. Previously a JWT was appended as a ?token= query param as
  // well, which EventSource requires since it can't set custom headers, but
  // that leaked the token into server/proxy access logs and browser history
  // for no benefit once the cookie alone is sufficient (#113 K11).
  return new EventSource(`${base}/notifications/stream`, {
    withCredentials: true
  });
}
