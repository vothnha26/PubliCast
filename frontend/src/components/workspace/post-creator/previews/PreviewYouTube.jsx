import * as React from "react";
import { 
  ThumbsUp, Share2, Download, Scissors, MoreHorizontal, Play, Pause, SkipBack, SkipForward, Folder
} from "lucide-react";
import { ShortsIcon } from "../ShortsIcon";
import { PreviewShell } from "./PreviewShell";
import { 
  YOUTUBE_PREVIEW_DEFAULTS, 
  YOUTUBE_PREVIEW_LABELS, 
  YOUTUBE_PREVIEW_DEVICES, 
  YOUTUBE_MEDIA_TYPES 
} from "../../../../constants/youtubePreview.constants";

// Icon ThumbsDown chuẩn YouTube
function ThumbsDownIcon({ size = 14, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.99-2.28l.83-8.29A2 2 0 0 1 5.01 2h10.75a2 2 0 0 1 2 2v10.29a2 2 0 0 1-.58 1.41l-3.92 3.92a2.38 2.38 0 0 1-3.26 0z" />
    </svg>
  );
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Component trình phát video YouTube với bộ nút điều khiển Overlay (Play, Pause, Rewind, Fast Forward, Dynamic Time)
 */
function YouTubeVideoPlayer({ videoFileUrl, fallbackLabel = "Video Preview" }) {
  const videoRef = React.useRef(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  const togglePlay = () => {
    if (!videoRef.current || !videoFileUrl) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn("Playback prevented:", err);
      });
    }
  };

  const handleSkip = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="relative aspect-video w-full bg-black overflow-hidden group flex items-center justify-center">
      {videoFileUrl ? (
        <video 
          ref={videoRef}
          src={videoFileUrl} 
          className="w-full h-full object-cover cursor-pointer"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onClick={togglePlay}
          playsInline
        />
      ) : (
        <div className="absolute inset-0 bg-[#0f0f0f] flex items-center justify-center">
          <Play size={40} className="text-white/20" />
        </div>
      )}

      {/* Video Overlay Controls (Rewind | Play/Pause | FastForward) */}
      <div 
        className={`absolute inset-0 bg-black/30 flex items-center justify-center gap-6 text-white transition-opacity duration-200 ${
          isPlaying ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        }`}
      >
        <button 
          type="button" 
          aria-label="Rewind 5s" 
          onClick={() => handleSkip(-5)}
          className="text-white/80 hover:text-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
        >
          <SkipBack size={24} className="fill-white" />
        </button>
        
        <button 
          type="button" 
          aria-label={isPlaying ? "Pause" : "Play"} 
          onClick={togglePlay}
          className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center bg-black/40 hover:bg-black/60 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          {isPlaying ? (
            <Pause size={22} className="fill-white" />
          ) : (
            <Play size={22} className="fill-white ml-0.5" />
          )}
        </button>

        <button 
          type="button" 
          aria-label="Fast Forward 5s" 
          onClick={() => handleSkip(5)}
          className="text-white/80 hover:text-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer"
        >
          <SkipForward size={24} className="fill-white" />
        </button>
      </div>

      {/* Time Bar Indicator */}
      <div className="absolute bottom-2 left-3 text-[11px] font-semibold text-white tracking-wide shadow-sm drop-shadow pointer-events-none bg-black/40 px-2 py-0.5 rounded-md">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
}

/**
 * Strategy View dành cho Desktop / PC (Ảnh 1)
 */
function YouTubeDesktopView({ 
  caption, 
  videoFileUrl, 
  youtubeTitle, 
  channelName,
  youtubePlaylistId,
  playlists = [],
  youtubeTags,
  youtubeFirstComment,
  globalFirstComment
}) {
  const displayTitle = youtubeTitle || (caption ? caption.split('\n')[0] : YOUTUBE_PREVIEW_DEFAULTS.DEFAULT_TITLE);
  const selectedPlaylist = playlists?.find(p => p.id === youtubePlaylistId || p.value === youtubePlaylistId || p.playlistId === youtubePlaylistId);
  const tagList = typeof youtubeTags === 'string' ? youtubeTags.split(',').map(t => t.trim()).filter(Boolean) : (Array.isArray(youtubeTags) ? youtubeTags : []);
  const effectiveFirstComment = youtubeFirstComment || globalFirstComment;

  return (
    <div className="w-full max-w-[680px] mx-auto bg-card rounded-3xl overflow-hidden shadow-2xl border border-border font-sans animate-in fade-in duration-300 text-left">
      {/* 1. Trình phát Video 16:9 */}
      <YouTubeVideoPlayer videoFileUrl={videoFileUrl} />

      {/* Tiêu đề Video YouTube (Hiển thị ngay dưới Video Player) */}
      <div className="px-4 pt-3.5 pb-1">
        <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2">
          {displayTitle}
        </h3>
      </div>

      {/* 2. Dòng Channel Info & Bar tương tác */}
      <div className="p-4 space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          {/* Avatar + Kênh + Join / Subscribe */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#ec4899] text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              {YOUTUBE_PREVIEW_DEFAULTS.CHANNEL_INITIAL}
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground leading-tight">{channelName}</h4>
              <span className="text-[11px] text-muted-foreground font-medium">{YOUTUBE_PREVIEW_DEFAULTS.SUBSCRIBERS_COUNT_TEXT}</span>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <button type="button" className="px-4 py-1.5 bg-muted hover:bg-gray-200 text-foreground rounded-full text-xs font-bold transition-all cursor-pointer">
                {YOUTUBE_PREVIEW_LABELS.JOIN}
              </button>
              <button type="button" className="px-4 py-1.5 bg-black hover:bg-gray-800 text-white rounded-full text-xs font-bold transition-all cursor-pointer">
                {YOUTUBE_PREVIEW_LABELS.SUBSCRIBE}
              </button>
            </div>
          </div>

          {/* Action Bar (Like/Dislike, Share, Download, Clip, More) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Dải Like / Dislike gộp */}
            <div className="flex items-center bg-muted hover:bg-gray-200/80 rounded-full px-3 py-1.5 text-xs font-bold text-foreground gap-2 cursor-pointer transition-all">
              <span className="flex items-center gap-1.5">
                <ThumbsUp size={14} />
                <span>{YOUTUBE_PREVIEW_DEFAULTS.LIKE_COUNT_TEXT}</span>
              </span>
              <span className="w-px h-3.5 bg-gray-300" />
              <ThumbsDownIcon size={14} className="text-foreground" />
            </div>

            {/* Share */}
            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-gray-200 text-foreground rounded-full text-xs font-bold transition-all cursor-pointer">
              <Share2 size={14} />
              <span>{YOUTUBE_PREVIEW_LABELS.SHARE}</span>
            </button>

            {/* Download */}
            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-gray-200 text-foreground rounded-full text-xs font-bold transition-all cursor-pointer">
              <Download size={14} />
              <span>{YOUTUBE_PREVIEW_LABELS.DOWNLOAD}</span>
            </button>

            {/* Clip */}
            <button type="button" className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-gray-200 text-foreground rounded-full text-xs font-bold transition-all cursor-pointer">
              <Scissors size={14} />
              <span>{YOUTUBE_PREVIEW_LABELS.CLIP}</span>
            </button>

            {/* More */}
            <button type="button" aria-label="More" className="w-8 h-8 rounded-full bg-muted hover:bg-gray-200 flex items-center justify-center text-foreground transition-all cursor-pointer">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* 3. Description Box màu xám nhạt (Mô tả video) */}
        <div className="bg-muted/80 rounded-2xl p-3.5 space-y-2 text-xs text-foreground font-medium font-sans">
          <div className="font-bold text-foreground flex items-center justify-between">
            <span>{YOUTUBE_PREVIEW_DEFAULTS.VIEWS_AND_DATE_TEXT}</span>
            {selectedPlaylist && (
              <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                <Folder size={12} /> {selectedPlaylist.title || selectedPlaylist.name || selectedPlaylist.label}
              </span>
            )}
          </div>
          <div className="text-foreground font-medium line-clamp-3 leading-relaxed whitespace-pre-wrap">
            {caption || <span className="text-muted-foreground italic font-normal">Chưa nhập mô tả (Description)...</span>}
          </div>

          {/* Tags */}
          {tagList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tagList.map((tag, idx) => (
                <span key={idx} className="text-[10px] font-semibold text-blue-600 hover:underline cursor-pointer">
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. First Comment Preview Section */}
        {effectiveFirstComment && (
          <div className="bg-muted border border-border rounded-2xl p-3 flex items-start gap-2.5 text-xs text-left">
            <div className="w-7 h-7 rounded-full bg-[#ec4899] text-white flex items-center justify-center font-bold text-xs shrink-0">
              {YOUTUBE_PREVIEW_DEFAULTS.CHANNEL_INITIAL}
            </div>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center gap-2 text-[10px]">
                <span className="font-bold text-foreground">{channelName}</span>
                <span className="bg-gray-200 text-foreground px-1.5 py-0.5 rounded text-[9px] font-bold">Pinned Comment</span>
              </div>
              <p className="text-foreground text-xs font-medium leading-normal">{effectiveFirstComment}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Strategy View dành cho Mobile / Smartphone (Ảnh 2)
 */
function YouTubeMobileView({ 
  caption, 
  videoFileUrl, 
  youtubeTitle, 
  channelName,
  youtubePlaylistId,
  playlists = [],
  youtubeTags,
  youtubeFirstComment,
  globalFirstComment
}) {
  const displayTitle = youtubeTitle || (caption ? caption.split('\n')[0] : YOUTUBE_PREVIEW_DEFAULTS.DEFAULT_TITLE);
  const selectedPlaylist = playlists?.find(p => p.id === youtubePlaylistId || p.value === youtubePlaylistId || p.playlistId === youtubePlaylistId);
  const tagList = typeof youtubeTags === 'string' ? youtubeTags.split(',').map(t => t.trim()).filter(Boolean) : (Array.isArray(youtubeTags) ? youtubeTags : []);
  const effectiveFirstComment = youtubeFirstComment || globalFirstComment;

  return (
    <div className="flex flex-col items-center mx-auto font-sans animate-in fade-in duration-300">
      {/* 1. Thẻ Mobile Phone Container */}
      <div className="w-[320px] bg-card rounded-3xl overflow-hidden shadow-2xl border border-border text-left">
        {/* Trình phát Video */}
        <YouTubeVideoPlayer videoFileUrl={videoFileUrl} />

        <div className="p-3 space-y-3">
          {/* Thống kê & Tiêu đề chính của Video YouTube */}
          <div className="text-xs text-foreground leading-snug space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[11px] text-muted-foreground">{YOUTUBE_PREVIEW_DEFAULTS.VIEWS_AND_DATE_TEXT}</span>
              {selectedPlaylist && (
                <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-[120px]">
                  <Folder size={10} /> {selectedPlaylist.title || selectedPlaylist.name || selectedPlaylist.label}
                </span>
              )}
            </div>
            <h4 className="font-bold text-foreground line-clamp-2 text-xs leading-snug">{displayTitle}</h4>
            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {tagList.map((tag, idx) => (
                  <span key={idx} className="text-[10px] text-blue-600 font-medium">
                    #{tag.replace(/^#/, '')}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Dòng Channel Kênh + Subscribe */}
          <div className="flex items-center justify-between pt-1 border-t border-b border-border py-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#ec4899] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {YOUTUBE_PREVIEW_DEFAULTS.CHANNEL_INITIAL}
              </div>
              <span className="text-xs font-bold text-foreground">{channelName}</span>
            </div>
            <button type="button" className="px-3 py-1 bg-black hover:bg-gray-800 text-white rounded-full text-[11px] font-bold transition-all cursor-pointer">
              {YOUTUBE_PREVIEW_LABELS.SUBSCRIBE}
            </button>
          </div>

          {/* Description Box (Mô tả video từ Caption) */}
          {caption && (
            <div className="bg-muted p-2.5 rounded-xl border border-border space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Description</span>
              <p className="text-[11px] text-foreground font-medium line-clamp-3 leading-relaxed whitespace-pre-wrap">
                {caption}
              </p>
            </div>
          )}

          {/* Action Bar dạng lướt ngang */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            <div className="flex items-center bg-muted rounded-full px-2.5 py-1 text-[11px] font-bold text-foreground gap-1.5">
              <ThumbsUp size={12} />
              <span>{YOUTUBE_PREVIEW_DEFAULTS.LIKE_COUNT_TEXT}</span>
              <span className="w-px h-3 bg-gray-300" />
              <ThumbsDownIcon size={12} />
            </div>

            <button type="button" className="flex items-center gap-1 px-2.5 py-1 bg-muted text-foreground rounded-full text-[11px] font-bold whitespace-nowrap">
              <Share2 size={12} />
              <span>{YOUTUBE_PREVIEW_LABELS.SHARE}</span>
            </button>

            <button type="button" className="flex items-center gap-1 px-2.5 py-1 bg-muted text-foreground rounded-full text-[11px] font-bold whitespace-nowrap">
              <Download size={12} />
              <span>{YOUTUBE_PREVIEW_LABELS.DOWNLOAD}</span>
            </button>

            <button type="button" aria-label="More" className="p-1 bg-muted text-foreground rounded-full shrink-0">
              <MoreHorizontal size={12} />
            </button>
          </div>

          {/* First Comment Preview (Mobile) */}
          {effectiveFirstComment && (
            <div className="bg-muted rounded-xl p-2 flex items-start gap-2 text-[11px] border border-border">
              <div className="w-5 h-5 rounded-full bg-[#ec4899] text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                {YOUTUBE_PREVIEW_DEFAULTS.CHANNEL_INITIAL}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-foreground text-[10px] truncate">{channelName} • <span className="text-muted-foreground font-normal">Pinned</span></div>
                <p className="text-foreground font-medium line-clamp-1">{effectiveFirstComment}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Dòng Ghi chú Footnote nhỏ bên dưới Thẻ Mobile */}
      <p className="text-[10px] text-muted-foreground text-center max-w-[320px] mt-3 leading-normal font-medium">
        {YOUTUBE_PREVIEW_LABELS.FOOTNOTE_MOBILE_NOTE}
      </p>
    </div>
  );
}

/**
 * YouTube Shorts View dành cho Video ngắn
 */
function YouTubeShortsView({ 
  caption, 
  videoFileUrl, 
  youtubeTitle, 
  previewDevice, 
  channelName,
  youtubeTags
}) {
  const displayTitle = youtubeTitle || caption || YOUTUBE_PREVIEW_DEFAULTS.DEFAULT_TITLE;
  const tagList = typeof youtubeTags === 'string' ? youtubeTags.split(',').map(t => t.trim()).filter(Boolean) : (Array.isArray(youtubeTags) ? youtubeTags : []);

  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      previewDevice={previewDevice}
      layout="vertical"
      fallbackLabel="Short Preview"
      fallbackIcon={<ShortsIcon size={40} className="text-red-500 mb-2 animate-bounce" />}
    >
      {/* Action Buttons Col (Right Side) */}
      <div className="absolute right-3 bottom-4 flex flex-col items-center gap-3.5 z-30 text-center text-white drop-shadow-md">
        <div className="flex flex-col items-center group cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all">
            <ThumbsUp size={16}/>
          </div>
          <span className="text-[10px] font-bold mt-1 text-white shadow-sm">{YOUTUBE_PREVIEW_DEFAULTS.LIKE_COUNT_TEXT}</span>
        </div>
        <div className="flex flex-col items-center group cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all">
            <ThumbsDownIcon size={16} />
          </div>
          <span className="text-[10px] font-bold mt-1 text-white shadow-sm">{YOUTUBE_PREVIEW_LABELS.DISLIKE}</span>
        </div>
        <div className="flex flex-col items-center group cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all">
            <Share2 size={16}/>
          </div>
          <span className="text-[10px] font-bold mt-1 text-white shadow-sm">{YOUTUBE_PREVIEW_LABELS.SHARE}</span>
        </div>
      </div>

      {/* Channel Info & Title Overlay (Left Side) */}
      <div className="absolute left-3 bottom-3 right-16 text-left z-30 space-y-2 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 rounded-2xl text-white">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#ec4899] flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
            {YOUTUBE_PREVIEW_DEFAULTS.CHANNEL_INITIAL}
          </div>
          <span className="text-xs font-bold tracking-wide drop-shadow">@{channelName}</span>
          <button type="button" className="px-2.5 py-1 bg-red-600 hover:bg-red-700 rounded-full text-[9px] font-bold uppercase transition-all shadow-sm cursor-pointer ml-1">
            {YOUTUBE_PREVIEW_LABELS.SUBSCRIBE}
          </button>
        </div>
        <p className="text-xs font-bold leading-snug line-clamp-2 text-gray-100 drop-shadow-sm">
          {displayTitle}
          {tagList.length > 0 && ` ${tagList.map(t => `#${t.replace(/^#/, '')}`).join(' ')}`}
        </p>
      </div>
    </PreviewShell>
  );
}

/**
 * Main YouTube Preview Strategy Dispatcher
 */
export function PreviewYouTube({ 
  caption = "", 
  videoFileUrl = null, 
  youtubeType = YOUTUBE_MEDIA_TYPES.VIDEO, 
  youtubeTitle = "", 
  youtubePlaylistId = "",
  playlists = [],
  youtubeTags = "",
  youtubeFirstComment = "",
  globalFirstComment = "",
  previewDevice = YOUTUBE_PREVIEW_DEVICES.MOBILE,
  channelName = YOUTUBE_PREVIEW_DEFAULTS.CHANNEL_NAME 
}) {
  // Strategy 1: YouTube Shorts (Vertical)
  if (youtubeType === YOUTUBE_MEDIA_TYPES.SHORT) {
    return (
      <YouTubeShortsView
        caption={caption}
        videoFileUrl={videoFileUrl}
        youtubeTitle={youtubeTitle}
        previewDevice={previewDevice}
        channelName={channelName}
        youtubeTags={youtubeTags}
      />
    );
  }

  // Strategy 2: Long-Form Video Desktop View
  if (previewDevice === YOUTUBE_PREVIEW_DEVICES.DESKTOP) {
    return (
      <YouTubeDesktopView
        caption={caption}
        videoFileUrl={videoFileUrl}
        youtubeTitle={youtubeTitle}
        channelName={channelName}
        youtubePlaylistId={youtubePlaylistId}
        playlists={playlists}
        youtubeTags={youtubeTags}
        youtubeFirstComment={youtubeFirstComment}
        globalFirstComment={globalFirstComment}
      />
    );
  }

  // Strategy 3: Long-Form Video Mobile View
  return (
    <YouTubeMobileView
      caption={caption}
      videoFileUrl={videoFileUrl}
      youtubeTitle={youtubeTitle}
      channelName={channelName}
      youtubePlaylistId={youtubePlaylistId}
      playlists={playlists}
      youtubeTags={youtubeTags}
      youtubeFirstComment={youtubeFirstComment}
      globalFirstComment={globalFirstComment}
    />
  );
}

