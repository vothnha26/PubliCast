import React from 'react';
import { ArrowBigUp, ArrowBigDown, MessageSquare, Share2, MoreHorizontal, ExternalLink, ShieldAlert } from 'lucide-react';
import { PreviewShell } from './PreviewShell';

export function RedditPreview({
  caption,
  videoFileUrl,
  previewDevice = 'mobile',
  title = '',
  subreddit = 'r/publicast',
  flair = '',
  isNsfw = false,
  isSpoiler = false,
  postType = 'self', // 'self' | 'link' | 'image' | 'video'
  linkUrl = '',
  imageTransform = null
}) {
  const displayTitle = title || 'Your Reddit Post Title Here';
  const displayCaption = caption || 'Write your Reddit post body content...';

  return (
    <PreviewShell
      videoFileUrl={videoFileUrl}
      previewDevice={previewDevice}
      imageTransform={imageTransform}
      layout="feed"
      aspectRatioClass="aspect-auto"
      fallbackLabel="Reddit Post"
    >
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 flex text-left font-sans shadow-sm">
        
        {/* Upvote Bar (Left Column) */}
        <div className="flex flex-col items-center pr-3 border-r border-gray-100 dark:border-gray-800 text-gray-400">
          <button className="hover:text-orange-500 transition p-1">
            <ArrowBigUp size={20} />
          </button>
          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 my-0.5">1</span>
          <button className="hover:text-blue-500 transition p-1">
            <ArrowBigDown size={20} />
          </button>
        </div>

        {/* Post Main Body (Right Column) */}
        <div className="flex-1 pl-3 space-y-2">
          {/* Header Info */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-gray-900 dark:text-white hover:underline cursor-pointer">{subreddit}</span>
              <span className="text-gray-400">• Posted by u/PubliCastDev</span>
              <span className="text-gray-400">Just now</span>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal size={14} />
            </button>
          </div>

          {/* Title & Badges */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">{displayTitle}</h3>
              {flair && (
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-[10px] font-semibold rounded-full border border-blue-200 dark:border-blue-800">
                  {flair}
                </span>
              )}
              {isNsfw && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded uppercase">
                  NSFW
                </span>
              )}
              {isSpoiler && (
                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-800 text-[9px] font-bold rounded uppercase">
                  Spoiler
                </span>
              )}
            </div>

            {/* Post Content Switcher */}
            {postType === 'link' && linkUrl ? (
              <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                <ExternalLink size={14} />
                <span className="truncate">{linkUrl}</span>
              </a>
            ) : postType === 'image' && videoFileUrl ? (
              <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 max-h-72 bg-gray-100">
                <img src={videoFileUrl} alt="Reddit Media" className="w-full h-full object-cover" />
              </div>
            ) : postType === 'video' && videoFileUrl ? (
              <div className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-black aspect-video flex items-center justify-center">
                <video src={videoFileUrl} controls className="w-full h-full" />
              </div>
            ) : (
              <p className="text-[12px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {displayCaption}
              </p>
            )}
          </div>

          {/* Reddit Action Bar */}
          <div className="flex items-center gap-4 text-[11px] font-semibold text-gray-400 pt-2 border-t border-gray-50 dark:border-gray-800/60">
            <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded-lg transition">
              <MessageSquare size={14} />
              <span>0 Comments</span>
            </button>
            <button className="flex items-center gap-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1 rounded-lg transition">
              <Share2 size={14} />
              <span>Share</span>
            </button>
          </div>
        </div>

      </div>
    </PreviewShell>
  );
}
