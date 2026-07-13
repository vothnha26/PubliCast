import React, { useEffect, useState } from 'react';
import { Music, Play, Pause, Loader2 } from 'lucide-react';
import { useVideoEditor } from '../../context/VideoEditorContext';
import { MOOD_PRESETS, VIDEO_API_ROUTES } from '../../constants/video-editor';
import apiService from '../../services/api';

export default function AudioSelector() {
  const { bgMusic, setBgMusic } = useVideoEditor();
  const [selectedMood, setSelectedMood] = useState(MOOD_PRESETS[1].id); // Chill làm mặc định
  const [musicTracks, setMusicTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [playingTrackId, setPlayingTrackId] = useState(null);
  const [previewAudio, setPreviewAudio] = useState(null);

  useEffect(() => {
    const fetchMusic = async () => {
      setIsLoading(true);
      try {
        const res = await apiService.get(`${VIDEO_API_ROUTES.MUSIC}?mood=${selectedMood}`);
        setMusicTracks(res.data.data || []);
      } catch (err) {
        console.error('❌ Failed to fetch music tracks:', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMusic();
  }, [selectedMood]);

  // Clean up audio preview when unmounted
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
      }
    };
  }, [previewAudio]);

  const handlePlayPreview = (track, e) => {
    e.stopPropagation();
    if (playingTrackId === track.id) {
      if (previewAudio) {
        previewAudio.pause();
        setPlayingTrackId(null);
      }
    } else {
      if (previewAudio) {
        previewAudio.pause();
      }
      const audio = new Audio(track.fileUrl);
      audio.volume = 0.4;
      audio.play().catch(() => {});
      setPreviewAudio(audio);
      setPlayingTrackId(track.id);

      audio.onended = () => {
        setPlayingTrackId(null);
      };
    }
  };

  const handleSelectTrack = (track) => {
    if (bgMusic.trackId === track.id) {
      // Bỏ chọn nhạc nền
      setBgMusic({ ...bgMusic, trackId: null, trackUrl: null, title: '' });
    } else {
      setBgMusic({
        ...bgMusic,
        trackId: track.id,
        trackUrl: track.fileUrl,
        title: track.title
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Mood Presets Selection */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-white">Mood Nhạc Nền</h3>
        <div className="grid grid-cols-4 gap-1.5">
          {MOOD_PRESETS.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMood(m.id)}
              className={`py-2 text-xs font-medium rounded-lg capitalize transition border ${
                selectedMood === m.id
                  ? 'border-lime-400 bg-lime-400/5 text-lime-400'
                  : 'border-gray-800 bg-gray-900/30 text-gray-400 hover:border-gray-700 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Background Music Volume */}
      <div>
        <h3 className="text-sm font-semibold mb-2 text-white">Âm lượng nhạc nền</h3>
        <div className="flex items-center gap-3 bg-gray-900/40 border border-gray-800 p-3.5 rounded-xl">
          <span className="text-xs font-mono text-gray-400 w-8">{bgMusic.volume}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={bgMusic.volume}
            onChange={(e) => setBgMusic({ ...bgMusic, volume: parseInt(e.target.value) })}
            className="flex-1 accent-lime-400 h-1 bg-gray-850 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Music Tracks List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Danh sách bài nhạc</h3>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="w-6 h-6 text-lime-400 animate-spin" />
          </div>
        ) : musicTracks.length === 0 ? (
          <div className="text-center text-gray-500 text-xs py-10">
            Không tìm thấy bài nhạc nào cho mood này.
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 pb-20">
            {musicTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => handleSelectTrack(track)}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                  bgMusic.trackId === track.id
                    ? 'border-lime-400 bg-lime-400/5 text-lime-400'
                    : 'border-gray-800 bg-gray-900/30 hover:border-gray-750 text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => handlePlayPreview(track, e)}
                    className={`p-2 rounded-lg transition ${
                      playingTrackId === track.id ? 'bg-lime-400 text-black' : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {playingTrackId === track.id ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                  </button>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{track.title}</span>
                    <span className="text-[10px] text-gray-500">{track.artist || 'Không rõ nghệ sĩ'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {bgMusic.trackId === track.id && (
                    <span className="text-[10px] bg-lime-400/20 text-lime-400 px-2 py-0.5 rounded-full font-bold">
                      Đã chọn
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">{track.duration || '0:00'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
