import React, { useState } from 'react';
import { Languages, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';
import { VIDEO_API_ROUTES } from '../../constants/video-editor';
import { usePostCreatorStore } from '../../store/usePostCreatorStore';
import { useBrand } from '../../context/BrandContext';
import videoEditorService from '../../services/videoEditor.service';
import { toast } from 'sonner';

export default function SubtitlesGenerator() {
  const { subtitles, setSubtitles } = useVideoEditor();
  const { videoFileUrl, uploadedVideoPath } = usePostCreatorStore();
  const { activeBrand } = useBrand();
  const [isGenerating, setIsGenerating] = useState(false);

  const brandId = activeBrand?.id || 'unassigned';
  const videoUrl = uploadedVideoPath || videoFileUrl;

  const handleGenerateAIQuotes = async () => {
    if (!videoUrl) {
      toast.error('Không tìm thấy đường dẫn video để sinh phụ đề!');
      return;
    }

    setIsGenerating(true);
    toast.loading('Đang khởi chạy AI Transcribe nhận diện giọng nói...', { id: 'subtitle-toast' });
    
    try {
      const res = await videoEditorService.transcribe(videoUrl, brandId);
      setSubtitles(res?.subtitles || res?.data?.subtitles || []);
      toast.success('Sinh phụ đề AI thành công!', { id: 'subtitle-toast' });
    } catch (err) {
      console.error('[AI Subtitles] ❌ Error:', err.message);
      toast.error(`Sinh phụ đề thất bại: ${err.message}`, { id: 'subtitle-toast' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateSubtitleText = (index, newText) => {
    setSubtitles(prev => prev.map((s, i) => i === index ? { ...s, text: newText } : s));
  };

  const handleUpdateSubtitleTime = (index, key, value) => {
    const val = parseFloat(value);
    if (isNaN(val)) return;
    setSubtitles(prev => prev.map((s, i) => i === index ? { ...s, [key]: val } : s));
  };

  const handleDeleteSubtitle = (index) => {
    setSubtitles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Generate Button Container */}
      <div className="bg-gray-900/30 border border-gray-800 p-5 rounded-xl text-center space-y-4">
        <div className="p-3 bg-lime-400/10 rounded-full w-fit mx-auto text-lime-400">
          <Languages className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-white">Sinh Phụ Đề Bằng AI (AI Subtitles)</h3>
          <p className="text-xs text-gray-400">
            Hệ thống sẽ tự động quét âm thanh của video và tạo phụ đề chuẩn xác bằng thuật toán AI Transcribe.
          </p>
        </div>
        <button
          onClick={handleGenerateAIQuotes}
          disabled={isGenerating || !videoUrl}
          className="w-full flex items-center justify-center gap-2 py-3 bg-lime-400 hover:bg-lime-500 disabled:bg-gray-800 disabled:text-gray-500 text-black font-semibold rounded-xl transition shadow-lg shadow-lime-400/5 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang nhận diện giọng nói...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Bắt đầu Sinh AI Subtitles</span>
            </>
          )}
        </button>
      </div>

      {/* Subtitles Editor List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-white">Danh sách phụ đề ({subtitles.length})</h3>
          {subtitles.length > 0 && (
            <button
              onClick={() => setSubtitles([])}
              className="text-[10px] text-red-400 hover:underline"
            >
              Xóa tất cả
            </button>
          )}
        </div>

        {subtitles.length === 0 ? (
          <div className="text-center text-gray-550 text-xs py-8">
            Chưa có phụ đề nào. Nhấp vào nút phía trên để bắt đầu.
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 pb-20">
            {subtitles.map((sub, index) => (
              <div
                key={index}
                className="p-3 bg-gray-900/40 border border-gray-800 hover:border-gray-700 rounded-xl space-y-2.5 transition"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
                    <span>Từ:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={sub.start}
                      onChange={(e) => handleUpdateSubtitleTime(index, 'start', e.target.value)}
                      className="w-12 bg-gray-850 text-white text-center rounded border border-gray-800 py-0.5 focus:border-lime-400 focus:outline-none"
                    />
                    <span>s đến:</span>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={sub.end}
                      onChange={(e) => handleUpdateSubtitleTime(index, 'end', e.target.value)}
                      className="w-12 bg-gray-850 text-white text-center rounded border border-gray-800 py-0.5 focus:border-lime-400 focus:outline-none"
                    />
                    <span>s</span>
                  </div>

                  <button
                    onClick={() => handleDeleteSubtitle(index)}
                    className="p-1 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <textarea
                  value={sub.text}
                  onChange={(e) => handleUpdateSubtitleText(index, e.target.value)}
                  className="w-full bg-gray-850 text-white text-xs px-3 py-2 rounded-lg border border-gray-800 focus:border-lime-400 focus:outline-none placeholder-gray-600 resize-none h-12"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
