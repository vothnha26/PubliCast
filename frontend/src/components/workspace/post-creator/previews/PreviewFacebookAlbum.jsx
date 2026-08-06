import * as React from "react";
import { useState } from "react";
import { PreviewShell } from "./PreviewShell";
import { Globe, MoreHorizontal, ThumbsUp, MessageSquare, Share2, ChevronLeft, ChevronRight, X } from "lucide-react";

export function PreviewFacebookAlbum({
  caption,
  albumMedia = [],
  previewDevice = "mobile",
  pageName = "PubliCast Fanpage"
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const displayCaption = caption || "What's on your mind?";

  const handlePrev = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? albumMedia.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === albumMedia.length - 1 ? 0 : prev + 1));
  };

  // Full-height vertical list — every photo shown at full size with its own
  // alt text directly underneath, instead of Facebook's real compact grid.
  // The composer's job here is showing what will actually publish (which
  // photo pairs with which alt text) at a glance, not mimicking Facebook's
  // space-constrained feed layout — the lightbox below still exists for a
  // closer, one-at-a-time look.
  const renderAlbumList = () => {
    if (albumMedia.length === 0) {
      return (
        <div className="aspect-video bg-muted flex items-center justify-center text-center p-6 text-muted-foreground border-y border-border">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">No photos added yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {albumMedia.map((media, idx) => (
          <div key={idx} className="rounded-xl overflow-hidden border border-border bg-muted">
            <div
              className="aspect-video bg-black relative overflow-hidden cursor-pointer"
              onClick={() => { setActiveIndex(idx); setLightboxOpen(true); }}
            >
              <img src={media.previewUrl || media.path} alt={media.caption || ""} className="w-full h-full object-cover" />
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[9px] font-bold">
                {idx + 1}/{albumMedia.length}
              </span>
            </div>
            <div className="px-3 py-2 bg-card">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Alt text</p>
              <p className={`text-[11px] leading-relaxed whitespace-pre-wrap ${media.caption ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}>
                {media.caption || "No alt text for this photo."}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <PreviewShell
        videoFileUrl=""
        previewDevice={previewDevice}
        layout="card"
        fallbackLabel="Facebook Album"
      >
        {/* Header Slot */}
        <div slot="header" className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-inner">
              {pageName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-foreground leading-tight hover:underline cursor-pointer">
                {pageName}
              </span>
              <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase tracking-tight mt-0.5">
                <span>Just now</span>
                <span>·</span>
                <Globe size={10} className="text-muted-foreground" />
              </div>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-muted-foreground p-1.5 hover:bg-muted rounded-full transition-all">
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* Body Details Slot */}
        <div className="px-4 pb-4 space-y-3.5 text-left">
          <p className="text-[11px] font-medium leading-relaxed text-foreground whitespace-pre-wrap px-0.5">
            {displayCaption}
          </p>

          {/* Rendering custom album layout */}
          <div className="overflow-hidden">
            {renderAlbumList()}
          </div>

          {/* Analytics Action Counts Bar */}
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold border-b border-border pb-2.5 px-0.5">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white ring-1 ring-white">
                <ThumbsUp size={8} className="fill-current text-white" />
              </div>
              <span>0</span>
            </div>
            <div className="flex items-center gap-2">
              <span>0 comments</span>
              <span>·</span>
              <span>0 shares</span>
            </div>
          </div>

          {/* Interactivity Buttons */}
          <div className="flex items-center justify-between pt-0.5 px-1 text-muted-foreground">
            <button className="flex items-center gap-1.5 hover:bg-muted px-3 py-2 rounded-xl transition-all cursor-pointer group text-[10px] font-black uppercase tracking-wider">
              <ThumbsUp size={14} className="group-hover:scale-110 transition-transform group-hover:text-[#1877F2]" />
              <span>Like</span>
            </button>
            <button className="flex items-center gap-1.5 hover:bg-muted px-3 py-2 rounded-xl transition-all cursor-pointer group text-[10px] font-black uppercase tracking-wider">
              <MessageSquare size={14} className="group-hover:scale-110 transition-transform" />
              <span>Comment</span>
            </button>
            <button className="flex items-center gap-1.5 hover:bg-muted px-3 py-2 rounded-xl transition-all cursor-pointer group text-[10px] font-black uppercase tracking-wider">
              <Share2 size={14} className="group-hover:scale-110 transition-transform" />
              <span>Share</span>
            </button>
          </div>
        </div>
      </PreviewShell>

      {/* Lightbox / Slideshow Simulator */}
      {lightboxOpen && albumMedia.length > 0 && (
        <div className="fixed inset-0 z-[4000] flex bg-black/95 animate-in fade-in duration-200">
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 text-white/80 hover:text-white hover:bg-card/10 rounded-full transition-all cursor-pointer"
          >
            <X size={24} />
          </button>

          {/* Left / Photo slide area */}
          <div className="flex-1 flex items-center justify-center relative p-8">
            <button
              onClick={handlePrev}
              className="absolute left-4 p-3 bg-black/40 hover:bg-black/80 border border-white/10 text-white rounded-full transition-all cursor-pointer"
            >
              <ChevronLeft size={24} />
            </button>

            <img
              src={albumMedia[activeIndex].previewUrl || albumMedia[activeIndex].path}
              alt=""
              className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
            />

            <button
              onClick={handleNext}
              className="absolute right-4 p-3 bg-black/40 hover:bg-black/80 border border-white/10 text-white rounded-full transition-all cursor-pointer"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Right / Caption sidebar info (Standard Facebook Desktop Lightbox Layout) */}
          <div className="w-[360px] bg-card text-foreground border-l border-border flex flex-col justify-between text-left p-6 font-sans">
            <div className="space-y-6 flex-1 overflow-y-auto pr-1 scrollbar-thin">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
                  {pageName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="block text-sm font-black hover:underline cursor-pointer">{pageName}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Photo {activeIndex + 1} of {albumMedia.length}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-muted border border-border rounded-2xl p-4">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">Photo caption</p>
                  <p className="text-xs font-semibold leading-relaxed text-foreground whitespace-pre-wrap">
                    {albumMedia[activeIndex].caption || <span className="italic text-muted-foreground font-medium">No caption for this photo.</span>}
                  </p>
                </div>

                {albumMedia[activeIndex].caption && (
                  <p className="text-[10px] text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-xl w-fit flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Hiển thị trên FB post caption của ảnh này!
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-4 text-center">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">PubliCast Lightbox Preview</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
