import React from "react";
import { Youtube, ChevronDown, RotateCw, Copy, Upload } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";
import { buildMediaUrl } from "../../../../utils/url";
import { toast } from "sonner";

export function YouTubePresets() {
  const {
    youtubeOpen,
    setYoutubeOpen,
    youtubeTitle,
    setYoutubeTitle,
    youtubeMadeForKids,
    setYoutubeMadeForKids,
    youtubePrivacy,
    setYoutubePrivacy,
    youtubeCategory,
    setYoutubeCategory,
    youtubePlaylistId,
    setYoutubePlaylistId,
    youtubeTags,
    setYoutubeTags,
    youtubeType,
    youtubeThumbnail,
    setYoutubeThumbnail,
    youtubeFirstComment,
    setYoutubeFirstComment,
    globalFirstComment,
    playlists,
    isLoadingPlaylists,
    fetchPlaylists,
    setIsUploadingThumbnail,
    setUploadModalTab,
    setShowUploadModal
  } = usePostCreatorFormContext();

  return (
    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
      <div 
        onClick={() => setYoutubeOpen(!youtubeOpen)}
        className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <Youtube size={18} className="text-[#FF0000]" />
          <span className="text-[12px] font-bold text-gray-700 font-sans">YouTube presets</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${youtubeOpen ? 'rotate-180 text-black' : ''}`} />
      </div>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${youtubeOpen ? 'max-h-[800px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-left">
          
          {/* Video or Short Title */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">Video or short title</label>
            <div className="relative">
              <input 
                type="text"
                maxLength={100}
                value={youtubeTitle}
                onChange={(e) => setYoutubeTitle(e.target.value)}
                placeholder="Enter video title..."
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
              />
              <span className="block text-right text-[9px] font-bold text-gray-300 mt-1.5 uppercase tracking-widest font-sans">
                {youtubeTitle.length} / 100
              </span>
            </div>
          </div>

          {/* Audience configuration */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">Audience configuration</label>
            <div className="relative">
              <select 
                value={youtubeMadeForKids ? "true" : "false"}
                onChange={(e) => setYoutubeMadeForKids(e.target.value === "true")}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
              >
                <option value="false">No, it's not made for kids</option>
                <option value="true">Yes, it's made for kids</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Privacy configuration */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">Privacy configuration</label>
            <div className="relative">
              <select 
                value={youtubePrivacy}
                onChange={(e) => setYoutubePrivacy(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <p className="text-[10px] text-gray-400 mt-2 font-medium leading-normal font-sans">
              Privacy status configuration can be modified in YouTube after publishing the video or short.
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">Category</label>
            <div className="relative">
              <select 
                value={youtubeCategory}
                onChange={(e) => setYoutubeCategory(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
              >
                <option value="22">People & Blogs</option>
                <option value="20">Gaming</option>
                <option value="27">Education</option>
                <option value="24">Entertainment</option>
                <option value="28">Science & Technology</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Add to playlist */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">Add to playlist</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select 
                  value={youtubePlaylistId}
                  onChange={(e) => setYoutubePlaylistId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none appearance-none cursor-pointer font-sans"
                >
                  <option value="">Select playlist...</option>
                  {playlists.map(pl => (
                    <option key={pl.id} value={pl.id}>{pl.title}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <button 
                type="button"
                onClick={() => fetchPlaylists(true)}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 text-gray-500 hover:text-black transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                <RotateCw size={14} className={isLoadingPlaylists ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">Tags</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={youtubeTags}
                onChange={(e) => setYoutubeTags(e.target.value)}
                placeholder="Enter tags (comma separated)..."
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none font-sans"
              />
              <button 
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(youtubeTags);
                  toast.success("Tags copied to clipboard");
                }}
                className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-200 text-gray-500 hover:text-black transition-all flex items-center justify-center shrink-0 cursor-pointer"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>

          {/* Custom Thumbnail */}
          {youtubeType.toLowerCase() === 'short' ? (
            <div className="col-span-2 p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-center gap-2">
              <span className="text-amber-600 text-xs">💡</span>
              <span className="text-[11px] text-amber-700 font-semibold leading-normal font-sans">
                Custom Thumbnails are not supported for YouTube Shorts by the YouTube API.
              </span>
            </div>
          ) : (
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">Custom Thumbnail</label>
              <div className="flex items-center gap-4">
                {youtubeThumbnail ? (
                  <div className="relative w-28 h-20 rounded-2xl overflow-hidden border border-gray-200 shadow-sm group">
                    <img src={buildMediaUrl(youtubeThumbnail)} alt="YT Thumbnail" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={() => setYoutubeThumbnail("")}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={() => {
                      setIsUploadingThumbnail(true);
                      setUploadModalTab("computer");
                      setShowUploadModal(true);
                    }}
                    className="w-full max-w-xs h-20 border-2 border-dashed border-gray-200 hover:border-gray-400 rounded-2xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-600 transition-all cursor-pointer bg-gray-50/50"
                  >
                    <Upload size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-wider font-sans">Upload Thumbnail</span>
                  </button>
                )}
                <div className="flex-1 text-[10px] text-gray-400 font-medium leading-normal text-left font-sans">
                  Select an image from your computer or media library to use as the thumbnail for this YouTube video. Max size 2MB. Recommended resolution: 1280x720.
                </div>
              </div>
            </div>
          )}

          {/* First Comment inside YT presets */}
          <div className="col-span-2 text-left">
            <label className="block text-[11px] font-bold text-gray-500 uppercase mb-2 font-sans">First Comment (Auto post after publishing)</label>
            <textarea 
              value={youtubeFirstComment}
              onChange={(e) => setYoutubeFirstComment(e.target.value)}
              placeholder="Write a comment to be posted automatically right after publishing..."
              className="w-full p-4 border border-gray-200 rounded-2xl text-xs font-semibold focus:border-black outline-none resize-none h-16 font-sans"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
