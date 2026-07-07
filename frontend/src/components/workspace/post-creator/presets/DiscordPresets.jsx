import React from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import { usePostCreatorFormContext } from "../../../../context/PostCreatorFormContext";

export function DiscordPresets() {
  const {
    discordOpen,
    setDiscordOpen,
    activeBrand,
    selectedDiscordChannels,
    setSelectedDiscordChannels
  } = usePostCreatorFormContext();

  const discordAccounts = activeBrand?.socialAccounts?.filter(sa => sa.platform === 'DISCORD' && sa.isConnected) || [];

  return (
    <div className="border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-sm transition-all duration-300">
      <div 
        onClick={() => setDiscordOpen(!discordOpen)}
        className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <MessageSquare size={18} className="text-[#5865F2]" />
          <span className="text-[12px] font-bold text-gray-700 font-sans">Discord presets</span>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${discordOpen ? 'rotate-180 text-black' : ''}`} />
      </div>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${discordOpen ? 'max-h-[400px] border-t border-gray-50 p-6' : 'max-h-0'}`}>
        <div className="space-y-4 text-left">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest font-sans">Chọn Kênh Đăng Bài</label>
          <p className="text-[11px] text-gray-400 font-medium leading-normal mb-3 font-sans">
            Chọn máy chủ và kênh chat Discord bạn muốn xuất bản bài viết này:
          </p>
          {discordAccounts.length === 0 ? (
            <p className="text-xs text-amber-600 font-semibold font-sans">Chưa có kênh Discord nào được liên kết. Vui lòng liên kết kênh tại trang Quản lý kết nối.</p>
          ) : (
            <div className="space-y-2 border border-gray-150 rounded-2xl p-4 bg-gray-50/30 max-h-48 overflow-y-auto">
              {discordAccounts.map((acc) => (
                <label key={acc.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    checked={selectedDiscordChannels.includes(acc.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDiscordChannels([...selectedDiscordChannels, acc.id]);
                      } else {
                        setSelectedDiscordChannels(selectedDiscordChannels.filter(id => id !== acc.id));
                      }
                    }}
                    className="rounded border-gray-300 text-[#5865F2] focus:ring-[#5865F2]"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-gray-800 font-sans">{acc.discordAccount?.guildName || 'Discord Server'}</div>
                    <div className="text-gray-400 font-semibold font-sans">#{acc.discordAccount?.channelName || acc.displayName}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
