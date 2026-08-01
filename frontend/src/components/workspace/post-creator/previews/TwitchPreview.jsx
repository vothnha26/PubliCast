import React from 'react';
import { Tv, MessageSquare, Radio, Gamepad2, User } from 'lucide-react';
import { PreviewShell } from './PreviewShell';

export function TwitchPreview({
  caption,
  previewDevice = 'mobile',
  streamTitle = '',
  gameCategory = 'Just Chatting',
  channelName = 'PubliCastStreamer'
}) {
  const displayTitle = streamTitle || caption || 'Live Streaming with PubliCast!';

  return (
    <PreviewShell
      previewDevice={previewDevice}
      layout="chat"
      aspectRatioClass="aspect-video"
      fallbackLabel="Twitch Broadcast & Chat"
    >
      <div className="bg-[#18181b] text-white rounded-2xl p-4 text-left font-sans shadow-lg border border-purple-900/40 space-y-4">
        
        {/* Stream Status Card */}
        <div className="bg-[#1f1f23] rounded-xl p-3 border border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white shadow-md">
                {channelName.charAt(0).toUpperCase()}
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-600 border-2 border-[#1f1f23] rounded-full animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white">{channelName}</h4>
                <span className="px-1.5 py-0.2 bg-red-600 text-[9px] font-black text-white rounded uppercase tracking-wider">LIVE</span>
              </div>
              <p className="text-[11px] font-medium text-purple-400 flex items-center gap-1 mt-0.5">
                <Gamepad2 size={12} />
                <span>{gameCategory}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Title Preview Section */}
        <div className="space-y-1 bg-[#0e0e10] p-3 rounded-xl border border-gray-800/80">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Tv size={11} className="text-purple-400" /> Broadcast Title Preview
          </span>
          <h3 className="text-sm font-bold text-gray-100 leading-snug break-words">{displayTitle}</h3>
        </div>

        {/* Twitch Chat Preview Mock */}
        <div className="space-y-2 pt-2 border-t border-gray-800">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <MessageSquare size={11} className="text-purple-400" /> Chat Message Preview
          </span>
          <div className="bg-[#0e0e10] rounded-xl p-2.5 space-y-2 text-xs font-mono border border-gray-800/80">
            <div className="flex items-start gap-2">
              <span className="font-bold text-purple-400 shrink-0">{channelName}:</span>
              <span className="text-gray-300 break-words leading-tight">{caption || 'Hello Twitch Chat! Welcome to the stream.'}</span>
            </div>
          </div>
        </div>

      </div>
    </PreviewShell>
  );
}
