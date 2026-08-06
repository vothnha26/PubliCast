import React from "react";
import { ImageIcon, Plus, Smile, Link2, Search } from "lucide-react";
import { MediaDropdown } from "./MediaDropdown";
import { EmojiPickerPopover } from "./popovers/EmojiPickerPopover";
import { HashtagPickerPopover } from "./popovers/HashtagPickerPopover";
import { UTMGeneratorPopover } from "./popovers/UTMGeneratorPopover";

/**
 * The 4 caption-toolbar buttons common to both ComposerBody (full composer)
 * and NetworkCustomizeScreen (per-network editing): Media / Emoji / Hashtag
 * / UTM link, each with its popover. ComposerBody has additional buttons
 * (First Comment, Location, Template toggle, AI Sparkles) that don't apply
 * in the per-network context — pass them as `children`, rendered after
 * these 4, rather than baking composer-only features into this shared
 * component. `rightSlot` renders trailing content (character count,
 * platform badge, etc.) which also differs enough between the two callers
 * that it isn't worth forcing into one shape here.
 */
export function CaptionToolbar({
  activePopover,
  setActivePopover,
  onSelectMediaImage,
  onSelectMediaVideo,
  onSelectMediaLibrary,
  onSelectMediaStock,
  onSelectMediaDrive,
  onSelectEmoji,
  onInsertHashtag,
  onAddUtmUrl,
  iconSize = 18,
  className = "",
  children,
  rightSlot,
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="relative">
        <button
          type="button"
          onClick={() => setActivePopover(activePopover === "media" ? null : "media")}
          className={`text-muted-foreground hover:text-foreground transition-colors relative p-1.5 rounded-lg cursor-pointer ${activePopover === "media" ? "bg-muted text-foreground" : ""}`}
        >
          <ImageIcon size={iconSize} />
          <Plus size={iconSize * 0.4} className="absolute -top-0.5 -right-0.5 bg-card rounded-full border border-border" strokeWidth={4} />
        </button>
        {activePopover === "media" && (
          <MediaDropdown
            onClose={() => setActivePopover(null)}
            onSelectImage={() => { onSelectMediaImage?.(); setActivePopover(null); }}
            onSelectVideo={() => { onSelectMediaVideo?.(); setActivePopover(null); }}
            onSelectLibrary={() => { onSelectMediaLibrary?.(); setActivePopover(null); }}
            onSelectStock={onSelectMediaStock ? () => { onSelectMediaStock(); setActivePopover(null); } : undefined}
            onSelectDrive={onSelectMediaDrive ? () => { onSelectMediaDrive(); setActivePopover(null); } : undefined}
          />
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setActivePopover(activePopover === "emoji" ? null : "emoji")}
          className={`text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg cursor-pointer ${activePopover === "emoji" ? "bg-muted text-foreground" : ""}`}
        >
          <Smile size={iconSize} />
        </button>
        {activePopover === "emoji" && (
          <EmojiPickerPopover
            onSelectEmoji={(emoji) => { onSelectEmoji?.(emoji); setActivePopover(null); }}
            onClose={() => setActivePopover(null)}
          />
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setActivePopover(activePopover === "hashtag" ? null : "hashtag")}
          className={`text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg cursor-pointer ${activePopover === "hashtag" ? "bg-muted text-foreground" : ""}`}
        >
          <Search size={iconSize} />
        </button>
        {activePopover === "hashtag" && (
          <HashtagPickerPopover
            onInsert={(text) => onInsertHashtag?.(text)}
            onClose={() => setActivePopover(null)}
          />
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setActivePopover(activePopover === "utm" ? null : "utm")}
          className={`text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg cursor-pointer ${activePopover === "utm" ? "bg-muted text-foreground" : ""}`}
        >
          <Link2 size={iconSize} />
        </button>
        {activePopover === "utm" && (
          <UTMGeneratorPopover
            onAddUrl={(utmUrl) => { onAddUtmUrl?.(utmUrl); setActivePopover(null); }}
            onClose={() => setActivePopover(null)}
          />
        )}
      </div>

      {children}

      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </div>
  );
}
