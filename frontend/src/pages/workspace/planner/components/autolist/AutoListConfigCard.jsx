import * as React from "react";
import { useState } from "react";
import { 
  Settings, ChevronDown, ChevronUp, Facebook, Youtube, Instagram,
  HelpCircle, Grid, Video, ShieldAlert, AlertCircle 
} from "lucide-react";
import { Switch } from "../../../../../components/ui/switch";

export function AutoListConfigCard({
  selectedPlatforms = [],
  autoPublish,
  setAutoPublish,
  repeat,
  setRepeat,
  useUrlShortener,
  setUseUrlShortener,
  facebookContentType,
  setFacebookContentType,
  instagramContentType,
  setInstagramContentType,
  threadsContentType,
  setThreadsContentType,
  youtubeVideoType,
  setYoutubeVideoType,
  youtubePrivacy,
  setYoutubePrivacy,
  youtubeMadeForKids,
  setYoutubeMadeForKids
}) {
  const [globalExpanded, setGlobalExpanded] = useState(true);
  const [facebookExpanded, setFacebookExpanded] = useState(true);
  const [youtubeExpanded, setYoutubeExpanded] = useState(true);
  const [instagramExpanded, setInstagramExpanded] = useState(true);
  const [threadsExpanded, setThreadsExpanded] = useState(true);

  const hasFacebook = selectedPlatforms.some(p => p.toUpperCase() === 'FACEBOOK');
  const hasYoutube = selectedPlatforms.some(p => p.toUpperCase() === 'YOUTUBE');
  const hasInstagram = selectedPlatforms.some(p => p.toUpperCase() === 'INSTAGRAM');
  const hasThreads = selectedPlatforms.some(p => p.toUpperCase() === 'THREADS');

  return (
    <div className="space-y-4 text-left">
      <div className="space-y-4">
        {/* 1. Global Presets */}
        <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <Settings size={15} className="text-gray-500" />
              <span>Global presets</span>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Auto publish toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                  Auto publish
                  <HelpCircle size={12} className="text-gray-400 cursor-help" title="Automatically publish posts in the queue when their scheduled time arrives" />
                </span>
                <Switch 
                  checked={autoPublish} 
                  onCheckedChange={setAutoPublish} 
                  className="scale-90"
                />
              </div>

              {/* Repeat toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500">Repeat</span>
                <Switch 
                  checked={!!repeat} 
                  onCheckedChange={setRepeat} 
                  className="scale-90"
                />
              </div>

              {/* Accordion Arrow toggle */}
              <button 
                onClick={() => setGlobalExpanded(!globalExpanded)}
                className="text-gray-400 hover:text-black cursor-pointer ml-2"
              >
                {globalExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>
          
          {/* Body */}
          {globalExpanded && (
            <div className="p-5 border-t border-gray-50/50 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1">
                  Use URL shortener
                  <HelpCircle size={12} className="text-gray-400 cursor-help" title="Automatically shorten links in your posts" />
                </span>
                <Switch 
                  checked={useUrlShortener} 
                  onCheckedChange={setUseUrlShortener} 
                  className="scale-90"
                />
              </div>
            </div>
          )}
        </div>

        {/* 2. Facebook Presets */}
        {hasFacebook && (
          <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <Facebook size={15} className="text-[#1877F2] fill-[#1877F2]" />
                <span>Facebook presets</span>
              </div>
              
              <button 
                onClick={() => setFacebookExpanded(!facebookExpanded)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                {facebookExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            
            {/* Body */}
            {facebookExpanded && (
              <div className="p-5 border-t border-gray-50/50 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                <label className="block text-[11px] font-semibold text-gray-500">Content type</label>
                <div className="relative max-w-md">
                  <select 
                    value={facebookContentType}
                    onChange={(e) => setFacebookContentType(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black appearance-none bg-white cursor-pointer shadow-sm"
                  >
                    <option value="post">Post</option>
                    <option value="reel">Reel</option>
                    <option value="story">Story</option>
                  </select>
                  <Grid size={14} className="absolute left-3 top-3 text-gray-400" />
                  <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. YouTube Presets */}
        {hasYoutube && (
          <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <Youtube size={16} className="text-[#FF0000] fill-[#FF0000]" />
                <span>YouTube presets</span>
              </div>
              
              <button 
                onClick={() => setYoutubeExpanded(!youtubeExpanded)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                {youtubeExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            
            {/* Body */}
            {youtubeExpanded && (
              <div className="p-5 border-t border-gray-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                {/* Blue Alert Banner */}
                <div className="bg-[#eff6ff] border border-[#dbeafe] text-[#1e40af] text-xs rounded-xl p-3 flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-[#3b82f6] shrink-0 mt-0.5" />
                  <span className="leading-relaxed text-[11px] font-medium">
                    The titles will be extracted from the first sentence of the content of each post. To add a description to your video, separate it from the first sentence in a different paragraph.
                  </span>
                </div>

                {/* Grid selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-500">Video type</label>
                    <div className="relative">
                      <select 
                        value={youtubeVideoType}
                        onChange={(e) => setYoutubeVideoType(e.target.value)}
                        className="w-full pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black appearance-none bg-white cursor-pointer shadow-sm"
                      >
                        <option value="video">Video</option>
                        <option value="short">Short</option>
                      </select>
                      <Video size={14} className="absolute left-3 top-3 text-gray-400" />
                      <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold text-gray-500">Privacy configuration</label>
                    <div className="relative">
                      <select 
                        value={youtubePrivacy}
                        onChange={(e) => setYoutubePrivacy(e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black appearance-none bg-white cursor-pointer shadow-sm"
                      >
                        <option value="public">Public</option>
                        <option value="unlisted">Unlisted</option>
                        <option value="private">Private</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Radio Group: Made for kids */}
                <div className="space-y-2.5">
                  <label className="block text-[11px] font-semibold text-gray-500">Audience configuration</label>
                  <div className="space-y-2 text-xs text-gray-700 font-medium">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="kids" 
                        checked={youtubeMadeForKids} 
                        onChange={() => setYoutubeMadeForKids(true)}
                        className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black" 
                      />
                      <span>Yes, it's a video made for kids</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="kids" 
                        checked={!youtubeMadeForKids} 
                        onChange={() => setYoutubeMadeForKids(false)}
                        className="w-4 h-4 text-black border-gray-300 focus:ring-black accent-black" 
                      />
                      <span>No, it's not a video made for kids</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Instagram Presets */}
        {hasInstagram && (
          <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <Instagram size={15} className="text-[#E1306C]" />
                <span>Instagram presets</span>
              </div>
              
              <button 
                onClick={() => setInstagramExpanded(!instagramExpanded)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                {instagramExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            
            {/* Body */}
            {instagramExpanded && (
              <div className="p-5 border-t border-gray-50/50 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                <label className="block text-[11px] font-semibold text-gray-500">Content type</label>
                <div className="relative max-w-md">
                  <select 
                    value={instagramContentType}
                    onChange={(e) => setInstagramContentType(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black appearance-none bg-white cursor-pointer shadow-sm"
                  >
                    <option value="post">Post</option>
                    <option value="reel">Reel</option>
                    <option value="story">Story</option>
                  </select>
                  <Grid size={14} className="absolute left-3 top-3 text-gray-400" />
                  <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Threads Presets */}
        {hasThreads && (
          <div className="border border-gray-200/80 rounded-2xl overflow-hidden bg-white shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                <span className="text-[14px] font-black text-gray-800">@</span>
                <span>Threads presets</span>
              </div>
              
              <button 
                onClick={() => setThreadsExpanded(!threadsExpanded)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                {threadsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            
            {/* Body */}
            {threadsExpanded && (
              <div className="p-5 border-t border-gray-50/50 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                <label className="block text-[11px] font-semibold text-gray-500">Content type</label>
                <div className="relative max-w-md">
                  <select 
                    value={threadsContentType}
                    onChange={(e) => setThreadsContentType(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-xs font-bold outline-none focus:border-black appearance-none bg-white cursor-pointer shadow-sm"
                  >
                    <option value="post">Thread Post</option>
                  </select>
                  <Grid size={14} className="absolute left-3 top-3 text-gray-400" />
                  <ChevronDown size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
