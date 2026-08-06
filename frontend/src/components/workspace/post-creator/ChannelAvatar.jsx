import React from "react";
import { PlatformIcon } from "../../shared/PlatformIcon";

/**
 * Channel avatar (square by default, or circular via `shape="circle"`) with
 * a small circular platform-logo badge overlapping the bottom-right corner,
 * poking outside the avatar's bounds with a ring. Purely presentational —
 * click handling, selection state, and any extra corner badge (checkmark,
 * "!" error, customized dot) are the caller's concern via
 * `onClick`/`className`/`badge`, since ComposerHeader (select/deselect a
 * channel), NetworkCustomizeScreen (switch which channel tab is active),
 * ChannelsList (leftbar) and ChannelPickerDropdown all render this same
 * avatar+badge shape but attach different click behavior, sizes, and status
 * badges to it.
 */
export function ChannelAvatar({
  account,
  platform,
  size = 40,
  badgeSize = 18,
  fallbackText,
  className = "",
  shape = "square",
}) {
  const avatarUrl = account?.avatarUrl || account?.profilePictureUrl;
  const initial = (fallbackText || account?.displayName || account?.username || account?.accountName || "?")
    .charAt(0)
    .toUpperCase();
  const roundedClass = shape === "circle" ? "rounded-full" : "rounded-xl";

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <div className={`w-full h-full ${roundedClass} overflow-hidden border border-border bg-muted flex items-center justify-center`}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xs font-black text-muted-foreground">{initial}</span>
        )}
      </div>
      <span
        className="absolute bottom-0 right-0 rounded-full bg-card border-2 border-card flex items-center justify-center overflow-hidden shadow-sm z-10"
        style={{ width: badgeSize, height: badgeSize, transform: "translate(20%, 20%)" }}
      >
        <PlatformIcon platform={platform} size={Math.round(badgeSize * 0.7)} variant="flat" />
      </span>
    </div>
  );
}
