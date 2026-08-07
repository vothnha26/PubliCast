import * as React from "react";

/**
 * Small "N/M platforms published" pill shown next to a post's status badge
 * while it's actively publishing (SCHEDULED/PUBLISHING) — the aggregate
 * Post.status alone can't distinguish "just started" from "2 of 3 platforms
 * already done", so this reads the per-target publishProgress the backend
 * now returns instead.
 */
export function PublishProgressBadge({ status, publishProgress, className = "" }) {
  if (!publishProgress || publishProgress.total === 0) return null;
  const isActive = status === "scheduled" || status === "publishing";
  if (!isActive) return null;

  const { published, failed, total } = publishProgress;
  const hasFailure = failed > 0;

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border shadow-sm ${
        hasFailure
          ? "bg-rose-100 text-rose-800 border-rose-200"
          : "bg-blue-50 text-blue-700 border-blue-100"
      } ${className}`}
      title={`${published}/${total} platforms published${hasFailure ? `, ${failed} failed` : ""}`}
    >
      {published}/{total}
    </span>
  );
}
