import React from 'react';
import { Heart, Repeat2, MessageSquare, MoreHorizontal, Image as ImageIcon } from 'lucide-react';
import { PreviewShell } from './PreviewShell';

export function BlueskyPreview({
  caption,
  videoFileUrl,
  previewDevice = 'mobile',
  pageName = 'PubliCast Creator',
  imageTransform = null,
  postMedia = []
}) {
  const displayCaption = caption || 'What is happening?';
  const handle = '@publicast.bsky.social';

  // Compute grapheme count using Intl.Segmenter
  const graphemeCount = React.useMemo(() => {
    if (!caption) return 0;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(caption)).length;
    }
    return caption.length;
  }, [caption]);

  // Helper to parse text facets (links, mentions, hashtags)
  const renderFormattedText = (text) => {
    if (!text) return null;
    const parts = text.split(/(\s+)/);
    return parts.map((part, idx) => {
      if (part.startsWith('@') && part.length > 1) {
        return <span key={idx} className="text-[#1185fe] font-medium hover:underline cursor-pointer">{part}</span>;
      }
      if (part.startsWith('#') && part.length > 1) {
        return <span key={idx} className="text-[#1185fe] font-medium hover:underline cursor-pointer">{part}</span>;
      }
      if (/^https?:\/\//i.test(part)) {
        return <span key={idx} className="text-[#1185fe] font-medium hover:underline cursor-pointer">{part}</span>;
      }
      return part;
    });
  };

  const mediaList = postMedia && postMedia.length > 0 ? postMedia : (videoFileUrl ? [videoFileUrl] : []);

  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      previewDevice={previewDevice}
      imageTransform={imageTransform}
      layout="feed"
      aspectRatioClass="aspect-square"
      fallbackLabel="Bluesky Post"
    >
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-left font-sans shadow-sm">
        {/* Author Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
              {pageName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">{pageName}</h4>
              <p className="text-[11px] text-gray-500 truncate leading-tight">{handle}</p>
            </div>
          </div>
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <MoreHorizontal size={16} />
          </button>
        </div>

        {/* Post Content */}
        <div className="space-y-3">
          <p className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {renderFormattedText(displayCaption)}
          </p>

          {/* Media Attachments Grid */}
          {mediaList.length > 0 && (
            <div className={`grid gap-1.5 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 ${
              mediaList.length === 1 ? 'grid-cols-1' : mediaList.length === 2 ? 'grid-cols-2' : 'grid-cols-2'
            }`}>
              {mediaList.slice(0, 4).map((url, idx) => (
                <div key={idx} className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden group">
                  <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-semibold rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition">
                    ALT
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Metadata Footer */}
          <div className="flex items-center justify-between pt-2 text-[11px] text-gray-400 border-t border-gray-50 dark:border-gray-800/60">
            <span>Just now</span>
            <div className="flex items-center gap-1 font-mono text-[10px]">
              <span className={graphemeCount > 300 ? 'text-red-500 font-bold' : 'text-gray-400'}>
                {graphemeCount}
              </span>
              <span>/ 300 graphemes</span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between text-gray-400 pt-1 text-xs">
            <button className="flex items-center gap-1.5 hover:text-blue-500 transition">
              <MessageSquare size={15} />
              <span className="text-[10px]">0</span>
            </button>
            <button className="flex items-center gap-1.5 hover:text-green-500 transition">
              <Repeat2 size={15} />
              <span className="text-[10px]">0</span>
            </button>
            <button className="flex items-center gap-1.5 hover:text-pink-500 transition">
              <Heart size={15} />
              <span className="text-[10px]">0</span>
            </button>
          </div>
        </div>
      </div>
    </PreviewShell>
  );
}
