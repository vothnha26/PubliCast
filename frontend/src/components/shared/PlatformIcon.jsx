import React from "react";

const PLATFORM_COLORS = {
  YouTube: "#FF0000",
  Facebook: "#1877F2",
  TikTok: "#000000",
  Instagram: "#E1306C",
  Twitch: "#9146FF",
  X: "#000000",
  Threads: "#000000",
  Bluesky: "#0085FF",
  GoogleDrive: "#4285F4"
};

const SVG_PATHS = {
  Bluesky: (size) => (
    <svg viewBox="0 0 568 501" width={size} height={size} fill="currentColor">
      <path d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.209C491.866-1.611 568-28.906 568 57.076c0 17.162-9.838 144.185-15.613 164.815-20.096 71.782-93.242 90.158-158.49 79.034 114.156 19.434 143.252 83.696 80.49 148.064-119.26 122.316-177.34-30.686-189.704-92.427C272.314 418.302 214.234 570.696 94.974 448.38 32.212 384.012 61.308 319.75 175.464 300.316 110.216 311.44 37.07 293.064 16.974 221.282 11.199 200.652 1.361 73.629 1.361 57.076c0-85.982 76.134-58.687 121.76-23.412z"/>
    </svg>
  ),
  Threads: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M15.42 12.63c-.88-.47-1.74-.75-2.73-.83-.44-.04-.88-.06-1.34-.06-.71 0-1.4.06-2.07.19v-.11c0-1.3.49-2.31 1.4-2.88.58-.37 1.3-.57 2.05-.57.8 0 1.54.21 2.12.59l.74-.95c-.81-.54-1.84-.85-3-.85-1.12 0-2.12.31-2.92.89-1.29.93-1.99 2.45-1.99 4.38v.82c-.88.66-1.44 1.63-1.44 2.82 0 1.95 1.48 3.32 3.4 3.32 1.46 0 2.58-.78 3.19-2.01.62 1.13 1.72 2.01 3.2 2.01 2.46 0 4.19-1.84 4.19-4.73 0-4.08-3.08-6.95-7.79-6.95-5.18 0-8.91 3.42-8.91 8.87 0 5.43 3.65 8.92 8.79 8.92 2.65 0 4.95-.87 6.47-2.45l-.83-.88c-1.25 1.3-3.13 2.02-5.46 2.02-4.42 0-7.46-2.94-7.46-7.61 0-4.66 3.13-7.56 7.6-7.56 4.01 0 6.49 2.37 6.49 5.67 0 2.21-1.21 3.45-2.72 3.45-1.13 0-1.75-.68-1.99-1.57zm-5.08 1.18c0-.76.35-1.36.93-1.71.4-.24.9-.36 1.45-.36.3 0 .59.02.87.05.77.1 1.41.35 1.97.77l.08.06c-.34.69-1.01 1.19-1.85 1.19-.89 0-1.54-.51-1.93-1.19v1.19c0 1.09-.79 1.9-1.9 1.9-1.11 0-1.91-.81-1.91-1.9 0-1.07.8-1.9 1.9-1.9.17 0 .34.02.5.06l-.1-.96z"/>
    </svg>
  ),
  YouTube: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  Facebook: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  ),
  TikTok: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.6-4.12-1.43-.22-.15-.45-.32-.65-.51v6.5c-.02 3.11-1.4 6.27-4.51 7.2-2.91.95-6.35-.1-8.08-2.61-2-2.88-1.07-7.26 2.05-8.83 1.12-.59 2.4-.75 3.65-.67v3.91c-1.12-.22-2.38-.07-3.26.71-.97.83-1.11 2.27-.61 3.4.67 1.57 2.63 2.37 4.21 1.71 1.4-.53 2.14-2.02 2.12-3.51-.01-3.66 0-7.32-.01-10.98.01-1.63-.02-3.26.01-4.89z"/>
    </svg>
  ),
  Instagram: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  Twitch: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
    </svg>
  ),
  X: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  GoogleDrive: (size) => (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M7.71 3.5L1.15 15l3.44 6L11.15 9.5zm8.58 0l-3.44 6L19.41 21l3.44-6zM8.85 21h10.3l-3.44-6H5.41z"/>
    </svg>
  )
};

export function PlatformIcon({ platform, size = 18, variant = "color", className = "" }) {
  // Strip non-alphanumerics so "google_drive"/"Google Drive"/"GOOGLE-DRIVE"
  // all match the "GoogleDrive" key — previously an unmatched platform name
  // (e.g. "google_drive", which never matched "GoogleDrive" case-insensitively
  // since the literal underscore differs) silently fell back to "YouTube",
  // rendering the YouTube logo for Google Drive connections.
  const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normPlatform = Object.keys(SVG_PATHS).find(
    (k) => normalize(k) === normalize(platform)
  );

  if (!normPlatform) return null;

  const renderSvg = SVG_PATHS[normPlatform];
  const bg = PLATFORM_COLORS[normPlatform] || "#888";

  if (variant === "flat") {
    const hasColorClass = className?.includes('text-');
    return (
      <div 
        className={`flex items-center justify-center shrink-0 ${className}`} 
        style={{ width: size, height: size, ...(hasColorClass ? {} : { color: bg }) }}
      >
        {renderSvg(size)}
      </div>
    );
  }

  const innerSize = Math.max(size * 0.55, 10);

  return (
    <div
      className={`flex items-center justify-center rounded-full shrink-0 shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: "#FFF"
      }}
    >
      {renderSvg(innerSize)}
    </div>
  );
}
