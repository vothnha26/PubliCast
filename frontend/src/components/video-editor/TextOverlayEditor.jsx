import React, { useState } from 'react';
import { Type, Trash2, Plus } from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';

export default function TextOverlayEditor() {
  const {
    textOverlays,
    setTextOverlays,
    activeOverlayId,
    setActiveOverlayId
  } = useVideoEditor();

  const [newText, setNewText] = useState('');
  const [color, setColor] = useState('#FFFFFF');
  const [size, setSize] = useState(18);

  const handleAddText = () => {
    if (!newText.trim()) return;

    const overlay = {
      id: Date.now().toString(),
      text: newText,
      color,
      size,
      x: 50, // Vị trí mặc định ở giữa ngang
      y: 50  // Vị trí mặc định ở giữa dọc
    };

    setTextOverlays(prev => [...prev, overlay]);
    setActiveOverlayId(overlay.id);
    setNewText('');
  };

  const handleDeleteText = (id) => {
    setTextOverlays(prev => prev.filter(o => o.id !== id));
    if (activeOverlayId === id) {
      setActiveOverlayId(null);
    }
  };

  const handleUpdateTextProps = (id, key, val) => {
    setTextOverlays(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, [key]: val };
      }
      return o;
    }));
  };

  const activeOverlay = textOverlays.find(o => o.id === activeOverlayId);

  return (
    <div className="space-y-6">
      {/* Create New Text Overlay */}
      <div className="space-y-4 bg-gray-900/30 border border-gray-800 p-4 rounded-xl">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thêm chữ mới</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Nhập nội dung chữ..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="flex-1 bg-gray-850 text-white text-xs px-3.5 py-2.5 rounded-lg border border-gray-800 focus:border-lime-400 focus:outline-none placeholder-gray-500"
          />
          <button
            onClick={handleAddText}
            className="bg-lime-400 text-black hover:bg-lime-300 px-4 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Màu chữ:</label>
            <div className="flex items-center gap-2 bg-gray-850 p-2 rounded-lg border border-gray-800">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 bg-transparent border-0 cursor-pointer rounded"
              />
              <span className="text-[10px] font-mono uppercase text-gray-400">{color}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-500 block mb-1">Cỡ chữ (px):</label>
            <input
              type="number"
              min="10"
              max="72"
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value) || 18)}
              className="w-full bg-gray-850 text-white text-xs px-3 py-2 rounded-lg border border-gray-800 focus:border-lime-400 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Edit Selected Text Props */}
      {activeOverlay && (
        <div className="space-y-4 bg-gray-900/30 border border-lime-400/20 p-4 rounded-xl">
          <h3 className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-4 h-4" />
            <span>Chỉnh sửa Text đang chọn</span>
          </h3>

          <div className="space-y-3">
            <input
              type="text"
              value={activeOverlay.text}
              onChange={(e) => handleUpdateTextProps(activeOverlay.id, 'text', e.target.value)}
              className="w-full bg-gray-850 text-white text-xs px-3.5 py-2 rounded-lg border border-gray-800 focus:border-lime-400 focus:outline-none"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Đổi màu:</label>
                <input
                  type="color"
                  value={activeOverlay.color}
                  onChange={(e) => handleUpdateTextProps(activeOverlay.id, 'color', e.target.value)}
                  className="w-full h-8 bg-transparent border border-gray-800 cursor-pointer rounded"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Đổi cỡ (px):</label>
                <input
                  type="number"
                  min="10"
                  max="72"
                  value={activeOverlay.size}
                  onChange={(e) => handleUpdateTextProps(activeOverlay.id, 'size', parseInt(e.target.value) || 18)}
                  className="w-full bg-gray-850 text-white text-xs px-3 py-2 rounded-lg border border-gray-800 focus:border-lime-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Overlays List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Danh sách chữ đã thêm ({textOverlays.length})</h3>

        {textOverlays.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-8">
            Chưa có chữ nào được thêm vào video.
          </div>
        ) : (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 pb-20">
            {textOverlays.map((overlay) => (
              <div
                key={overlay.id}
                onClick={() => setActiveOverlayId(overlay.id)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  activeOverlayId === overlay.id
                    ? 'border-lime-400 bg-lime-400/5 text-lime-400'
                    : 'border-gray-800 bg-gray-900/30 hover:border-gray-750 text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs truncate max-w-[180px] font-semibold">{overlay.text}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 font-mono">{overlay.size}px</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteText(overlay.id);
                    }}
                    className="p-1 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
