import * as React from "react";
import { 
  Heart, MessageCircle, Repeat2, Send, 
  MoreHorizontal, Plus, Play
} from "lucide-react";
import { isVideoPath } from "../../../../utils/url";

export function PreviewThreads({ 
  caption, 
  videoFileUrl, 
  videoFile = null,
  previewDevice = "mobile",
  pageName = "satnut.bongda",
  imageTransform = null
}) {
  const displayCaption = caption || "What's on your mind?";
  const isVideo = isVideoPath(videoFileUrl, videoFile);

  const containerWidth = previewDevice === 'mobile' ? 'w-[320px]' : 'w-full max-w-[500px]';

  const getImageStyle = (transform) => {
    if (!transform) return {};
    const { rotation = 0, flipH = false, flipV = false } = transform;
    return {
      transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
      transition: 'transform 0.3s ease'
    };
  };

  const getImageFilterClass = (filterId) => {
    switch (filterId) {
      case 'grayscale': return 'grayscale';
      case 'sepia': return 'sepia';
      case 'invert': return 'invert';
      case 'blur': return 'blur-[2px]';
      case 'warm': return 'sepia-[0.3] saturate-[1.3] hue-rotate-[-10deg]';
      case 'cool': return 'saturate-[0.9] hue-rotate-[10deg] brightness-[1.05]';
      case 'dramatic': return 'contrast-[1.2] brightness-[0.9]';
      default: return '';
    }
  };

  return (
    <div className={`${containerWidth} bg-white rounded-2xl overflow-hidden shadow-xl border border-gray-100 text-gray-900 font-sans mx-auto animate-in fade-in duration-300 text-left p-4`}>
      {/* Desktop Web Header Branding */}
      {previewDevice === "desktop" && (
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 text-xs font-semibold text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center font-extrabold text-[11px]">
              @
            </div>
            <span className="font-bold text-gray-900">Threads</span>
          </div>
          <span className="text-[11px] text-gray-400">For you</span>
        </div>
      )}

      {/* Main Threads Post Layout with Thread Line */}
      <div className="flex gap-3">
        {/* Left Column: Avatar + Thread Line */}
        <div className="flex flex-col items-center shrink-0">
          {/* Avatar with Plus Badge */}
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {pageName.substring(0, 2).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black border-2 border-white text-white flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
              <Plus size={10} strokeWidth={3} />
            </div>
          </div>
          {/* Connecting Vertical Thread Line */}
          <div className="w-[2px] bg-gray-200 grow my-2 rounded-full min-h-[40px]" />
          {/* Bottom Mini Avatar Group Preview */}
          <div className="w-4 h-4 rounded-full bg-gray-300 border border-white shrink-0 mb-1" />
        </div>

        {/* Right Column: Content Body & Actions */}
        <div className="grow min-w-0 space-y-2.5">
          {/* User Meta Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-bold text-gray-950 hover:underline cursor-pointer truncate">
                {pageName}
              </span>
              <span className="text-[11px] text-gray-400 font-normal">· 1h</span>
            </div>
            <button className="text-gray-400 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100 transition-colors">
              <MoreHorizontal size={16} />
            </button>
          </div>

          {/* Text Caption */}
          <p className="text-[12px] text-gray-900 leading-relaxed font-normal whitespace-pre-wrap">
            {displayCaption}
          </p>

          {/* Media Attachment Container */}
          {videoFileUrl ? (
            <div className="rounded-xl overflow-hidden bg-black border border-gray-200 max-h-[360px] relative flex items-center justify-center">
              {isVideo ? (
                <video src={videoFileUrl} controls className="w-full h-full max-h-[360px] object-cover" />
              ) : (
                <img 
                  src={videoFileUrl} 
                  style={getImageStyle(imageTransform)}
                  className={`w-full h-full max-h-[360px] object-cover ${getImageFilterClass(imageTransform?.filter)}`}
                  alt="Threads media" 
                />
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 h-32 flex flex-col items-center justify-center text-gray-400">
              <Play size={18} className="text-gray-300 mb-1" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Threads Media</span>
            </div>
          )}

          {/* Action Bar (Heart, Comment, Repost, Share) */}
          <div className="flex items-center gap-4 text-gray-700 pt-1">
            <button className="hover:text-red-500 transition-colors p-1 -ml-1 rounded-full hover:bg-gray-100">
              <Heart size={18} />
            </button>
            <button className="hover:text-gray-950 transition-colors p-1 rounded-full hover:bg-gray-100">
              <MessageCircle size={18} />
            </button>
            <button className="hover:text-green-600 transition-colors p-1 rounded-full hover:bg-gray-100">
              <Repeat2 size={18} />
            </button>
            <button className="hover:text-gray-950 transition-colors p-1 rounded-full hover:bg-gray-100 -rotate-12">
              <Send size={17} />
            </button>
          </div>

          {/* Counts Info */}
          <div className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5 pt-0.5">
            <span>0 replies</span>
            <span>·</span>
            <span>0 likes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
