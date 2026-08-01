import * as React from "react";
import { 
  Heart, MessageCircle, Send, Bookmark, 
  MoreHorizontal, Volume2, User, Grid, 
  ChevronLeft, UserPlus, Film, Tag, LayoutGrid
} from "lucide-react";
import { PreviewShell } from "./PreviewShell";
import { isVideoPath } from "../../../../utils/url";

export function PreviewInstagram({ 
  caption, 
  videoFileUrl, 
  videoFile = null,
  previewDevice = "mobile",
  pageName = "satnut.bongda",
  instagramType = "post", // 'post' | 'reel' | 'story'
  imageTransform = null
}) {
  const [viewMode, setViewMode] = React.useState("post"); // "post" | "grid"
  const displayCaption = caption || "What's on your mind?";
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

  // 1. REEL PREVIEW DESIGN
  if (instagramType === "reel") {
    return (
      <PreviewShell
        videoFileUrl={videoFileUrl}
        videoFile={videoFile}
        previewDevice={previewDevice}
        imageTransform={imageTransform}
        layout="vertical"
        fallbackLabel="Instagram Reels"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 pt-4 w-full pointer-events-auto">
          <span className="text-sm font-bold tracking-tight">Reels</span>
          <button className="text-white hover:text-gray-200 transition-colors">
            <Volume2 size={18} />
          </button>
        </div>

        {/* Right Action Icons Overlay */}
        <div className="absolute right-3 bottom-14 flex flex-col items-center gap-5 pointer-events-auto text-center">
          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <Heart size={22} className="text-white group-hover:scale-110 transition-transform hover:text-red-500" />
            <span className="text-[9px] font-semibold">0</span>
          </button>

          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <MessageCircle size={22} className="text-white group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-semibold">0</span>
          </button>

          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <Send size={20} className="text-white -rotate-12 group-hover:scale-110 transition-transform" />
          </button>

          <button className="flex flex-col items-center gap-1 cursor-pointer group">
            <Bookmark size={20} className="text-white group-hover:scale-110 transition-transform" />
          </button>

          <button className="text-white">
            <MoreHorizontal size={18} />
          </button>

          <div className="w-6 h-6 rounded-lg border border-white overflow-hidden bg-gray-800 flex items-center justify-center font-bold text-[8px]">
            {pageName.substring(0, 2).toUpperCase()}
          </div>
        </div>

        {/* Bottom Details */}
        <div className="p-4 space-y-2 text-left max-w-[210px] mt-auto pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-0.5">
              <div className="w-full h-full rounded-full bg-black border border-black flex items-center justify-center font-bold text-[8px] text-white">
                {pageName.substring(0, 2).toUpperCase()}
              </div>
            </div>
            <span className="text-xs font-bold hover:underline cursor-pointer">
              {pageName}
            </span>
          </div>

          <p className="text-[10px] font-medium leading-normal text-white/95 whitespace-pre-wrap max-h-[60px] overflow-hidden text-ellipsis line-clamp-2">
            {displayCaption}
          </p>
        </div>
      </PreviewShell>
    );
  }

  // 2. STORY PREVIEW DESIGN
  if (instagramType === "story") {
    return (
      <PreviewShell
        videoFileUrl={videoFileUrl}
        videoFile={videoFile}
        previewDevice={previewDevice}
        imageTransform={imageTransform}
        layout="vertical"
        fallbackLabel="Instagram Story"
      >
        <div className="px-3 pt-3 space-y-2 w-full pointer-events-auto">
          <div className="w-full h-[2px] bg-card/30 rounded-full overflow-hidden">
            <div className="w-1/3 h-full bg-card rounded-full animate-pulse" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6.5 h-6.5 rounded-full bg-card/20 p-0.5">
                <div className="w-full h-full rounded-full bg-black border border-white/20 flex items-center justify-center font-bold text-[8px] text-white">
                  {pageName.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <span className="text-[10px] font-extrabold hover:underline cursor-pointer">{pageName}</span>
              <span className="text-[9px] text-white/60 font-semibold">1h</span>
            </div>
            <button className="text-white">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        <div className="p-3 flex items-center gap-3 bg-gradient-to-t from-black/50 to-transparent w-full mt-auto pointer-events-auto">
          <div className="flex-1 px-4 py-2 border border-white/40 rounded-full bg-black/20 text-[10px] text-white/80 placeholder-white/60 text-left font-medium">
            Send message...
          </div>
          <button className="text-white hover:text-gray-200 transition-colors">
            <Heart size={20} />
          </button>
          <button className="text-white hover:text-gray-200 transition-colors -rotate-12">
            <Send size={18} />
          </button>
        </div>
      </PreviewShell>
    );
  }

  // 3. PROFILE GRID PREVIEW DESIGN (Instagram Profile Page View)
  if (viewMode === "grid") {
    const cardWidth = previewDevice === 'mobile' ? 'w-[320px]' : 'w-full max-w-[460px]';

    return (
      <div className={`${cardWidth} bg-card rounded-3xl overflow-hidden shadow-2xl font-sans border border-border flex flex-col mx-auto animate-in fade-in duration-300 text-left`}>
        {/* Header Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <ChevronLeft 
            size={20} 
            className="text-foreground cursor-pointer hover:opacity-75 transition-opacity" 
            onClick={() => setViewMode("post")}
          />
          <span className="text-xs font-bold text-foreground">{pageName}</span>
          
          <div className="flex items-center gap-2">
            {/* Grid/Post View Switcher Button */}
            <button
              onClick={() => setViewMode("post")}
              title="Switch to post view"
              className="p-1 rounded-md bg-muted hover:bg-gray-200 text-foreground transition-colors cursor-pointer"
            >
              <LayoutGrid size={15} />
            </button>
            <MoreHorizontal size={18} className="text-foreground cursor-pointer" />
          </div>
        </div>

        {/* Profile Details Header */}
        <div className="p-4 space-y-3 border-b border-border">
          <div className="flex items-center justify-between">
            {/* Profile Avatar with Gradient Border */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px] shrink-0">
              <div className="w-full h-full rounded-full bg-card flex items-center justify-center font-bold text-sm text-foreground border border-white">
                {pageName.substring(0, 2).toUpperCase()}
              </div>
            </div>

            {/* Stats Column */}
            <div className="flex items-center gap-6 text-center pr-2">
              <div>
                <span className="text-xs font-bold block text-gray-950">7</span>
                <span className="text-[10px] text-muted-foreground">posts</span>
              </div>
              <div>
                <span className="text-xs font-bold block text-gray-950">0</span>
                <span className="text-[10px] text-muted-foreground">followers</span>
              </div>
              <div>
                <span className="text-xs font-bold block text-gray-950">0</span>
                <span className="text-[10px] text-muted-foreground">following</span>
              </div>
            </div>
          </div>

          {/* Profile Bio */}
          <div className="space-y-0.5 text-left">
            <span className="text-xs font-bold text-gray-950 block">{pageName}</span>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-foreground">
              <span className="w-3.5 h-3.5 rounded-full bg-black text-white flex items-center justify-center font-extrabold text-[8px]">@</span>
              <span>{pageName}</span>
            </div>
          </div>

          {/* Action Buttons (Following / Message / Add Person) */}
          <div className="flex items-center gap-2 pt-1">
            <button className="flex-1 py-1.5 bg-muted hover:bg-gray-200 rounded-lg text-xs font-bold text-foreground transition-colors">
              Following v
            </button>
            <button className="flex-1 py-1.5 bg-muted hover:bg-gray-200 rounded-lg text-xs font-bold text-foreground transition-colors">
              Message
            </button>
            <button className="p-1.5 bg-muted hover:bg-gray-200 rounded-lg text-foreground transition-colors">
              <UserPlus size={16} />
            </button>
          </div>
        </div>

        {/* Profile Tab Navigation Bar */}
        <div className="flex items-center justify-around border-b border-border text-muted-foreground">
          <button className="py-2.5 border-b-2 border-black text-black flex-1 flex justify-center">
            <Grid size={18} />
          </button>
          <button className="py-2.5 flex-1 flex justify-center hover:text-foreground">
            <Film size={18} />
          </button>
          <button className="py-2.5 flex-1 flex justify-center hover:text-foreground">
            <Tag size={18} />
          </button>
        </div>

        {/* 3x3 Profile Media Grid */}
        <div className="grid grid-cols-3 gap-0.5 bg-card p-0.5">
          {/* Cell 1: Current Post Being Created */}
          <div className="aspect-square bg-gray-900 relative overflow-hidden group">
            {videoFileUrl ? (
              isVideo ? (
                <video src={videoFileUrl} className="w-full h-full object-cover" />
              ) : (
                <img 
                  src={videoFileUrl} 
                  style={getImageStyle(imageTransform)}
                  className={`w-full h-full object-cover ${getImageFilterClass(imageTransform?.filter)}`}
                  alt="Grid media preview" 
                />
              )
            ) : (
              <div className="w-full h-full bg-gradient-to-tr from-gray-800 to-gray-900 flex items-center justify-center text-white/50 text-[9px] font-bold">
                New Post
              </div>
            )}
            {/* Active New Post Badge */}
            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-extrabold shadow-sm">
              !
            </div>
          </div>

          {/* Placeholder Grid Items */}
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="aspect-square bg-neutral-100 flex items-center justify-center relative">
              <span className="text-[10px] font-medium text-neutral-400">#{i}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. FEED POST PREVIEW DESIGN (Instagram Feed Card View)
  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      videoFile={videoFile}
      previewDevice={previewDevice}
      imageTransform={imageTransform}
      layout="card"
      aspectRatioClass="aspect-square"
      fallbackLabel="Feed Post Preview"
      fallbackIcon={<User size={22} className="text-muted-foreground" />}
    >
      {/* Header Slot */}
      <div slot="header" className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[1.5px]">
            <div className="w-full h-full rounded-full bg-card border border-white flex items-center justify-center font-bold text-[9px] text-foreground">
              {pageName.substring(0, 2).toUpperCase()}
            </div>
          </div>
          <div className="text-left">
            <div className="text-xs font-bold hover:underline cursor-pointer leading-tight text-gray-950">{pageName}</div>
            <div className="text-[8px] text-muted-foreground font-semibold leading-tight">Sponsored</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Embedded Switcher Button to Grid View inside Header */}
          <button
            onClick={() => setViewMode("grid")}
            title="Switch to profile grid view"
            className="p-1 rounded-md bg-muted hover:bg-gray-200 text-foreground transition-colors cursor-pointer"
          >
            <LayoutGrid size={15} />
          </button>
          <button className="text-foreground hover:text-black">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Footer Content */}
      <div className="px-3 pt-3 pb-4 space-y-2 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <button className="text-foreground hover:text-red-500 hover:scale-110 transition-transform">
              <Heart size={20} />
            </button>
            <button className="text-foreground hover:scale-110 transition-transform">
              <MessageCircle size={20} />
            </button>
            <button className="text-foreground hover:scale-110 transition-transform -rotate-12">
              <Send size={18} />
            </button>
          </div>
          <button className="text-foreground hover:scale-110 transition-transform">
            <Bookmark size={20} />
          </button>
        </div>

        <div className="text-[10.5px] font-bold text-foreground leading-tight">
          Liked by <b>you</b> and <b>others</b>
        </div>

        <div className="text-[10.5px] leading-relaxed text-foreground font-medium">
          <span className="font-bold hover:underline cursor-pointer mr-1.5">{pageName}</span>
          <span className="whitespace-pre-wrap">{displayCaption}</span>
        </div>

        <div className="text-[8.5px] text-muted-foreground font-bold uppercase tracking-wider mt-1">
          1 minute ago
        </div>
      </div>
    </PreviewShell>
  );
}
