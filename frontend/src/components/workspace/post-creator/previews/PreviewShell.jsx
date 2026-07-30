import * as React from "react";
import { Play } from "lucide-react";
import { isVideoPath } from "../../../../utils/url";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";

// Safe wrapper - returns null nếu không có context
function useOptionalPostCreatorContext() {
  try {
    return usePostCreatorFormContext();
  } catch {
    return null;
  }
}

export function PreviewShell({
  children,
  videoFileUrl,
  videoFile: videoFileProp = null,
  previewDevice = "mobile",
  imageTransform = null,
  layout = "card", // "card" | "vertical"
  aspectRatioClass = "aspect-video",
  fallbackLabel = "Preview not available",
  fallbackIcon,
  dark = false
}) {
  const ctx = useOptionalPostCreatorContext();
  // Dùng videoFile từ context để isVideoPath detect đúng (check file.type)
  const videoFile = videoFileProp || ctx?.videoFile || null;
  const isVideo = isVideoPath(videoFileUrl, videoFile);

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

  // Determine wrapper classes based on device/layout
  if (layout === "vertical") {
    return (
      <div className="w-[300px] h-[533px] bg-black rounded-3xl overflow-hidden shadow-2xl relative flex flex-col justify-between font-sans text-white mx-auto animate-in fade-in duration-300 border border-gray-800">
        {/* Background Media */}
        {videoFileUrl ? (
          <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
            {isVideo ? (
              <video src={videoFileUrl} muted autoPlay loop className="w-full h-full object-cover" />
            ) : (
              <img 
                src={videoFileUrl} 
                style={getImageStyle(imageTransform)}
                className={`w-full h-full object-cover ${getImageFilterClass(imageTransform?.filter)}`}
                alt="Vertical preview media" 
              />
            )}
          </div>
        ) : (
          <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#111827] via-[#1F2937] to-[#030712] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/40 mb-3 animate-pulse border border-white/10">
              {fallbackIcon || <Play size={28} className="fill-current ml-1 text-white/60" />}
            </div>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">{fallbackLabel}</p>
            <p className="text-[9px] text-white/40 mt-1 max-w-[180px] leading-normal font-medium">Upload a video or photo to preview your post.</p>
          </div>
        )}

        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10 pointer-events-none" />

        {/* Platform-specific content overlay injected as children */}
        <div className="relative z-20 flex flex-col justify-between h-full w-full pointer-events-none">
          {children}
        </div>
      </div>
    );
  }

  // Card layout (Standard feeds)
  const cardWidth = previewDevice === 'mobile' ? 'w-[300px]' : 'w-full max-w-[460px]';
  const cardBg = dark ? 'bg-[#0f0f0f] text-white' : 'bg-white text-gray-900';
  const borderColor = dark ? 'border-gray-800' : 'border-gray-100';

  return (
    <div className={`${cardWidth} ${cardBg} rounded-3xl overflow-hidden shadow-2xl font-sans border ${borderColor} flex flex-col mx-auto animate-in fade-in duration-300 text-left`}>
      {/* Header and top info injected by parent */}
      {React.Children.map(children, child => {
        if (child?.props?.slot === "header") return child;
        return null;
      })}

      {/* Media area */}
      {videoFileUrl ? (
        <div className={`${aspectRatioClass} bg-black flex items-center justify-center relative overflow-hidden`}>
          {isVideo ? (
            <video src={videoFileUrl} controls className="w-full h-full object-cover" />
          ) : (
            <img 
              src={videoFileUrl} 
              style={getImageStyle(imageTransform)}
              className={`w-full h-full object-cover ${getImageFilterClass(imageTransform?.filter)}`}
              alt="Feed card media" 
            />
          )}
        </div>
      ) : (
        <div className={`${aspectRatioClass} bg-gray-50 flex flex-col items-center justify-center text-center p-6 text-gray-400 border-y ${borderColor}`}>
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2.5 border border-gray-200">
            {fallbackIcon || <Play size={20} className="text-gray-400" />}
          </div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{fallbackLabel}</p>
          <p className="text-[8px] text-gray-400/80 mt-0.5 max-w-[170px] leading-normal font-medium">Select photo or video to preview your post.</p>
        </div>
      )}

      {/* Body details and actions injected by parent */}
      {React.Children.map(children, child => {
        if (child?.props?.slot !== "header") return child;
        return null;
      })}
    </div>
  );
}
