import React from 'react';
import { Image as ImageIcon, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';
import { useDragScroll } from '../../hooks/useDragScroll';
import { toast } from 'sonner';
import mediaService from '../../services/media.service';
import { getFullImageUrl } from '../workspace/post-creator/image-editor/utils';
import { usePostCreatorStore } from '../../store/usePostCreatorStore';

// Social & Brand Logos SVG Icons
const LOGO_ITEMS = [
  { id: 'threads',   name: 'Threads',   bgColor: '#000000', svg: (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.879 12.355c-.295.845-.884 1.545-1.667 1.982-1.002.56-2.29.68-3.483.32-1.428-.43-2.52-1.57-2.88-2.99-.4-1.58.07-3.23 1.22-4.32 1.09-1.03 2.65-1.48 4.14-1.2 1.25.24 2.3.99 2.92 2.08.31.54.49 1.15.54 1.78h-2.15c-.04-.33-.14-.65-.31-.94-.34-.59-.92-.99-1.59-1.12-.81-.15-1.65.1-2.24.66-.62.59-.88 1.48-.67 2.33.2.82.83 1.47 1.66 1.7 1.06.3 2.12-.13 2.7-.93.18-.25.32-.54.41-.85h2.15c-.15.93-.57 1.79-1.22 2.47z"/></svg>) },
  { id: 'facebook',  name: 'Facebook',  bgColor: '#1877F2', svg: (<svg className="w-5 h-5 fill-[#1877F2]" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>) },
  { id: 'instagram', name: 'Instagram', bgColor: '#E4405F', svg: (<svg className="w-5 h-5 fill-[#E4405F]" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>) },
  { id: 'twitter',   name: 'Twitter',   bgColor: '#1DA1F2', svg: (<svg className="w-5 h-5 fill-[#1DA1F2]" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.936 9.936 0 0024 4.59z"/></svg>) },
  { id: 'x',         name: 'X',         bgColor: '#000000', svg: (<svg className="w-5 h-5 fill-black" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>) },
  { id: 'linkedin',  name: 'LinkedIn',  bgColor: '#0A66C2', svg: (<svg className="w-5 h-5 fill-[#0A66C2]" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>) },
  { id: 'pinterest', name: 'Pinterest', bgColor: '#E60023', svg: (<svg className="w-5 h-5 fill-[#E60023]" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z"/></svg>) },
  { id: 'tiktok',    name: 'TikTok',    bgColor: '#000000', svg: (<svg className="w-5 h-5 fill-black" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.96-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.56-1.34 1.53-1.38 2.53-.08 1.08.38 2.16 1.19 2.87.82.72 1.96.97 3.01.7 1.03-.25 1.91-1.02 2.24-2.03.17-.55.23-1.13.22-1.71.02-4.97.01-9.94.01-14.91z"/></svg>) },
  { id: 'youtube',   name: 'YouTube',   bgColor: '#FF0000', svg: (<svg className="w-5 h-5 fill-[#FF0000]" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>) },
  { id: 'twitch',    name: 'Twitch',    bgColor: '#9146FF', svg: (<svg className="w-5 h-5 fill-[#9146FF]" viewBox="0 0 24 24"><path d="M11.571 4.714h1.715v5.143h-1.715zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>) }
];

const EMOJI_ITEMS = ['🔥', '🚀', '❤️', '👍', '🎉', '😎', '💯', '✨', '👏', '🌟', '💥', '💬', '💡', '📌', '🎯', '⚡', '🎈', '🤩', '🔥'];

export default function StickerPanel() {
  const { activeSubTab, setActiveSubTab, setTextOverlays } = useVideoEditor();
  const { scrollRef, dragHandlers, scrollByAmount } = useDragScroll();

  const handleAddSticker = (stickerText, isLogo = false, bgColor = null) => {
    const overlay = {
      id: Date.now().toString(),
      text: stickerText,
      color: '#FFFFFF',
      bgColor: bgColor,
      isLogo: isLogo,
      size: isLogo ? 24 : 32,
      x: 50,
      y: 50
    };
    setTextOverlays((prev) => [...prev, overlay]);
    toast.success(`Đã thêm nhãn dán: ${stickerText}`);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading(`Đang tải nhãn dán hình ảnh...`);
    try {
      const res = await mediaService.saveDirect(null, null, {
        filename: file.name,
        size: file.size,
        type: file.type
      });

      const serverPath = res?.url;
      const fullUrl = getFullImageUrl(serverPath);

      // Track asset in current session for rollback if discarded
      const trackUploadedAsset = usePostCreatorStore.getState().trackUploadedAsset;
      if (trackUploadedAsset && serverPath) {
        trackUploadedAsset(serverPath);
      }

      const overlay = {
        id: Date.now().toString(),
        type: 'image',
        text: file.name,
        imageUrl: fullUrl,
        serverUrl: serverPath,
        size: 80,
        x: 50,
        y: 50
      };

      setTextOverlays((prev) => [...prev, overlay]);
      toast.success(`Đã thêm nhãn dán hình ảnh: ${file.name}`, { id: toastId });
    } catch (err) {
      console.warn("Upload sticker image API failed, fallback to local Blob:", err);
      const objectUrl = URL.createObjectURL(file);
      const overlay = {
        id: Date.now().toString(),
        type: 'image',
        text: file.name,
        imageUrl: objectUrl,
        size: 80,
        x: 50,
        y: 50
      };
      setTextOverlays((prev) => [...prev, overlay]);
      toast.success(`Đã thêm nhãn dán: ${file.name}`, { id: toastId });
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-3 py-2 select-none">
      <div className="relative w-full flex items-center justify-center px-4">
        {activeSubTab !== 'select-image' && (
          <button
            onClick={() => scrollByAmount(-200)}
            className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 shrink-0 transition cursor-pointer z-10 mr-1"
            title="Cuộn sang trái"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        <div
          ref={scrollRef}
          {...dragHandlers}
          className="flex-1 flex items-center justify-center gap-3 overflow-x-auto py-2 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {activeSubTab === 'logos' && (
            <div className="flex items-center gap-3 shrink-0">
              {LOGO_ITEMS.map((logo) => (
                <button
                  key={logo.id}
                  onClick={() => handleAddSticker(logo.name, true, logo.bgColor)}
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:scale-110 transition cursor-pointer hover:shadow-md shrink-0"
                  title={`Thêm logo ${logo.name}`}
                >
                  {logo.svg}
                </button>
              ))}
            </div>
          )}

          {activeSubTab === 'emojis' && (
            <div className="flex items-center gap-3 shrink-0">
              {EMOJI_ITEMS.map((emoji, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAddSticker(emoji)}
                  className="w-10 h-10 rounded-full bg-gray-50 border border-gray-200 text-xl flex items-center justify-center hover:scale-125 transition cursor-pointer shrink-0"
                  title="Thêm Emoji"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {activeSubTab === 'select-image' && (
            <div className="flex items-center justify-center py-1">
              <label className="flex items-center gap-2 px-5 py-2 rounded-full border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold cursor-pointer transition">
                <Upload size={14} />
                <span>Tải ảnh nhãn dán từ máy tính</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Right Scroll Arrow Button */}
        {activeSubTab !== 'select-image' && (
          <button
            onClick={() => scrollByAmount(200)}
            className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-100 shrink-0 transition cursor-pointer z-10 ml-1"
            title="Cuộn sang phải"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Sub-tab Pill: Select Image / Emojis / Logos */}
      <div className="flex items-center justify-center bg-gray-100 p-0.5 rounded-full border border-gray-200 text-xs font-semibold">
        <label className={`flex items-center gap-1.5 px-4 py-1 rounded-full transition cursor-pointer ${
          activeSubTab === 'select-image'
            ? 'bg-gray-300 text-black font-extrabold shadow-sm'
            : 'text-gray-500 hover:text-gray-800'
        }`}>
          <ImageIcon size={13} />
          <span>Select Image</span>
          <input
            type="radio"
            name="sticker-subtab"
            checked={activeSubTab === 'select-image'}
            onChange={() => setActiveSubTab('select-image')}
            className="hidden"
          />
        </label>

        <button
          onClick={() => setActiveSubTab('emojis')}
          className={`px-4 py-1 rounded-full transition cursor-pointer ${
            activeSubTab === 'emojis'
              ? 'bg-gray-300 text-black font-extrabold shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Emojis
        </button>

        <button
          onClick={() => setActiveSubTab('logos')}
          className={`px-4 py-1 rounded-full transition cursor-pointer ${
            activeSubTab === 'logos'
              ? 'bg-gray-300 text-black font-extrabold shadow-sm'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Logos
        </button>
      </div>
    </div>
  );
}
