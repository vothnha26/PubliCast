import React, { useState } from 'react';
import { PlayCircle, Image as ImageIcon } from 'lucide-react';
import { buildMediaUrl, isVideoPath } from '@/utils/url';

/**
 * PostMediaThumbnail Component
 *
 * Renders the appropriate preview element (image or video) based on the media path.
 * Adheres to SOLID principles: Single Responsibility & Open/Closed (easily extendable for other formats).
 *
 * @param {Object} props
 * @param {string} props.thumbnail - The direct thumbnail URL
 * @param {Array|string} props.mediaUrls - Fallback media URLs if thumbnail is absent
 * @param {string} props.className - Custom Tailwind styling for container
 */
export function PostMediaThumbnail({ thumbnail, mediaUrls, className = "w-full h-full" }) {
  const [hasError, setHasError] = useState(false);

  // Resolve media source
  const getMediaSource = () => {
    if (thumbnail) return thumbnail;
    if (Array.isArray(mediaUrls) && mediaUrls.length > 0) return mediaUrls[0];
    if (typeof mediaUrls === 'string' && mediaUrls.trim()) {
      const urls = mediaUrls.split(',').filter(Boolean);
      if (urls.length > 0) return urls[0];
    }
    return null;
  };

  const mediaSrc = getMediaSource();

  if (!mediaSrc || hasError) {
    return (
      <div className={`bg-muted flex items-center justify-center text-gray-300 ${className}`}>
        <ImageIcon size={16} className="stroke-[1.5]" />
      </div>
    );
  }

  const fullUrl = buildMediaUrl(mediaSrc);
  const isVideo = isVideoPath(mediaSrc);

  if (isVideo) {
    return (
      <div className={`relative overflow-hidden group/thumb bg-black ${className}`}>
        <video 
          src={fullUrl} 
          className="w-full h-full object-cover" 
          muted 
          playsInline 
          preload="metadata"
          onError={() => setHasError(true)}
        />
        {/* Play icon overlay */}
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center group-hover/thumb:bg-black/30 transition-all duration-300">
          <PlayCircle size={18} className="text-white fill-black/20 stroke-[2] drop-shadow-md transform group-hover/thumb:scale-110 transition-transform" />
        </div>
      </div>
    );
  }

  return (
    <img 
      src={fullUrl} 
      alt="Preview" 
      className={`object-cover ${className}`}
      onError={() => setHasError(true)}
    />
  );
}
