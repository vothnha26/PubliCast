import React, { useState, useEffect, useRef } from 'react';
import socketClient from '../../services/socket';
import apiService from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useBrandStore } from '../../store/useBrandStore';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { toast } from 'sonner';

// Hằng số định cấu hình tránh magic string
const PLATFORMS = {
  ALL: 'all',
  YOUTUBE: 'youtube',
  FACEBOOK: 'facebook'
};

const UPDATE_INTERVALS = {
  VELOCITY_REFRESH_MS: 1000,
  SPARKLINE_SAMPLE_MS: 10000,
  MOCK_STATS_MS: 8000
};

const ROLLING_WINDOW_SEC = 60;
const MAX_SPARKLINE_POINTS = 30;

// SVG Icons chuẩn cho YouTube và Facebook
const YouTubeIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837z" fill="#FF0000"/>
    <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#FFF"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12.48 20.246c.148-.063.296-.129.441-.197m0 0a8.101 8.101 0 003.7-4.817M12.92 20.05a8.077 8.077 0 01-3.695-4.817m8.406 0A8 8 0 0012 3a8 8 0 00-7.63 5.485m13.26 0C17.48 8.717 17.5 9.213 17.5 9.75c0 1.259-.334 2.44-1.923 3.441m0 0a8.097 8.097 0 01-4.152 1.353M4.37 8.485C4.778 9.508 5 10.59 5 11.75c0 1.637-.435 3.172-2 4.473m0 0A8.07 8.07 0 0012 21a8.07 8.07 0 007.63-4.777" />
  </svg>
);

export function LivestreamChat() {
  const { activeBrand } = useBrandStore();
  const brandId = activeBrand?.id || 'default-brand';
  
  const [streams, setStreams] = useState([]);
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [comments, setComments] = useState([]);
  const [activeTab, setActiveTab] = useState(PLATFORMS.ALL);
  const [showGuideModal, setShowGuideModal] = useState(false);
  
  // Trạng thái kết nối độc lập từng nền tảng
  const [ytConnected, setYtConnected] = useState(false);
  const [fbConnected, setFbConnected] = useState(false);

  // Các chỉ số sống (Real-time Metrics)
  const [currentViewers, setCurrentViewers] = useState(0);
  const [peakViewers, setPeakViewers] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [commentVelocity, setCommentVelocity] = useState(0);

  // Dữ liệu phục vụ vẽ biểu đồ xu hướng (Sparkline)
  const [viewerHistory, setViewerHistory] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  
  const commentsEndRef = useRef(null);
  const commentTimestamps = useRef([]);
  const canvasRef = useRef(null);

  // Fetch brand livestreams
  useEffect(() => {
    async function fetchStreams() {
      try {
        setIsLoading(true);
        const res = await apiService.get(`/livestreams/history?brandId=${brandId}`);
        const streamData = res.data?.data || [];
        setStreams(streamData);
        if (streamData.length > 0) {
          const firstStream = streamData[0];
          setSelectedStreamId(firstStream.id);
          setPeakViewers(firstStream.peak || 0);
          
          // Trực quan hóa kết nối ban đầu
          setYtConnected(firstStream.platforms.includes(PLATFORMS.YOUTUBE));
          setFbConnected(firstStream.platforms.includes(PLATFORMS.FACEBOOK));
        }
      } catch (err) {
        console.error('Error fetching streams:', err);
        toast.error('Không thể lấy danh sách livestream');
      } finally {
        setIsLoading(false);
      }
    }
    if (brandId) {
      fetchStreams();
    }
  }, [brandId]);

  // Connect socket and listen to comments
  useEffect(() => {
    if (!selectedStreamId) return;

    // Clear old comments & reset states
    setComments([]);
    commentTimestamps.current = [];
    setCommentVelocity(0);
    
    const streamInfo = streams.find(s => s.id === selectedStreamId);
    if (streamInfo) {
      setPeakViewers(streamInfo.peak || 0);
      setYtConnected(streamInfo.platforms.includes(PLATFORMS.YOUTUBE));
      setFbConnected(streamInfo.platforms.includes(PLATFORMS.FACEBOOK));
      
      // Set current viewers ban đầu
      const initViewers = Math.floor((streamInfo.peak || 100) * 0.7);
      setCurrentViewers(initViewers);
      setViewerHistory([initViewers]);
    }

    // Reading the literal 'token' key instead of STORAGE_KEYS.TOKEN meant a
    // future key rename here would silently fall through to 'dummy-token'
    // and connect unauthenticated with no error surfaced (#113 K12).
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN) || 'dummy-token';
    socketClient.connect(token);

    // Join room
    socketClient.emit('join_livestream', { livestreamId: selectedStreamId });
    setIsConnected(true);

    const handleNewComment = (comment) => {
      // Without dedup by id, a socket reconnect/replay could re-append the
      // same comment, producing a duplicate list entry (and a React key
      // collision if `comment.id` is used as the list key) (#112 K8).
      setComments((prev) => {
        if (comment.id != null && prev.some(c => c.id === comment.id)) return prev;
        return [...prev, comment];
      });

      // Thêm timestamp để tính Comment Velocity (rolling window)
      commentTimestamps.current.push(Date.now());
    };

    const handleStatsUpdate = (stats) => {
      if (stats.currentViewers) {
        setCurrentViewers(stats.currentViewers);
        if (stats.peakViewers) setPeakViewers(stats.peakViewers);
      }
    };

    socketClient.on('new_livestream_comment', handleNewComment);
    socketClient.on('livestream_stats_update', handleStatsUpdate);

    return () => {
      socketClient.emit('leave_livestream', { livestreamId: selectedStreamId });
      socketClient.off('new_livestream_comment', handleNewComment);
      socketClient.off('livestream_stats_update', handleStatsUpdate);
      setIsConnected(false);
    };
    // `streams` deliberately excluded from deps — it's a new array
    // reference on every fetchStreams() call, which previously tore down
    // and rejoined the room (plus wiped `comments` via the effect's own
    // setComments([]) reset) on every background refresh, not just an
    // actual stream switch (#112 K8). `streamInfo` is only read once above
    // to seed initial state, so this effect only needs to react to the
    // stream selection actually changing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStreamId]);

  // Auto-scroll comments to bottom
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments, activeTab]);

  // Bộ đếm thời gian phát sóng và cập nhật mock chỉ số sống
  useEffect(() => {
    if (!selectedStreamId) return;

    setDurationSeconds(0);
    const durationTimer = setInterval(() => {
      setDurationSeconds(prev => prev + 1);
    }, 1000);

    // Mock biến động người xem nhẹ nhàng nếu là live stream thật.
    // peakViewers is read via the functional setPeakViewers form (state
    // callback), not the render-scope value — so it no longer needs to be
    // an effect dependency. Previously having it in the deps array meant
    // every new peak recreated this whole effect, tearing down and
    // restarting durationTimer too, which reset durationSeconds to 0 on
    // every new peak (#113 K13).
    const statsTimer = setInterval(() => {
      setCurrentViewers(prev => {
        const delta = Math.floor(Math.random() * 9) - 4; // -4 đến +4
        const nextValue = Math.max(10, prev + delta);
        setPeakViewers(peak => Math.max(peak, nextValue));
        return nextValue;
      });
    }, UPDATE_INTERVALS.MOCK_STATS_MS);

    return () => {
      clearInterval(durationTimer);
      clearInterval(statsTimer);
    };
  }, [selectedStreamId]);

  // Tính toán Comment Velocity qua cửa sổ trượt (Rolling Window) 60 giây
  useEffect(() => {
    const calculateVelocity = () => {
      const now = Date.now();
      const cutoff = now - ROLLING_WINDOW_SEC * 1000;
      
      // Loại bỏ các bình luận ngoài tầm 60 giây
      commentTimestamps.current = commentTimestamps.current.filter(ts => ts >= cutoff);
      setCommentVelocity(commentTimestamps.current.length);
    };

    // Chạy định kỳ mỗi giây để cập nhật cửa sổ trượt
    const velocityTimer = setInterval(calculateVelocity, UPDATE_INTERVALS.VELOCITY_REFRESH_MS);
    return () => clearInterval(velocityTimer);
  }, []);

  // Lấy mẫu dữ liệu cho Sparkline Chart (mỗi 10 giây)
  useEffect(() => {
    if (!selectedStreamId) return;

    const sampleTimer = setInterval(() => {
      setViewerHistory(prev => {
        const updated = [...prev, currentViewers];
        if (updated.length > MAX_SPARKLINE_POINTS) {
          updated.shift(); // Giữ tối đa 30 điểm
        }
        return updated;
      });
    }, UPDATE_INTERVALS.SPARKLINE_SAMPLE_MS);

    return () => clearInterval(sampleTimer);
  }, [selectedStreamId, currentViewers]);

  // Vẽ biểu đồ Sparkline bằng Canvas HTML5
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || viewerHistory.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;
    const padding = 5;

    const min = Math.min(...viewerHistory);
    const max = Math.max(...viewerHistory);
    const range = max - min === 0 ? 1 : max - min;

    // Vẽ vùng gradient đổ bên dưới đường biểu đồ
    ctx.beginPath();
    ctx.moveTo(padding, height);
    
    viewerHistory.forEach((val, index) => {
      const x = padding + (index / (viewerHistory.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding - 10);
      ctx.lineTo(x, y);
    });

    ctx.lineTo(width - padding, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.25)'); // Indigo mờ
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Vẽ đường line biểu đồ bóng bẩy
    ctx.beginPath();
    viewerHistory.forEach((val, index) => {
      const x = padding + (index / (viewerHistory.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding - 10);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = '#6366F1'; // Solid Indigo
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(99, 102, 241, 0.4)';
    ctx.shadowBlur = 4;
    ctx.stroke();
    
    // Reset shadow
    ctx.shadowBlur = 0;

    // Vẽ điểm tròn nhỏ nổi bật tại điểm cuối cùng
    const lastIdx = viewerHistory.length - 1;
    const lastX = padding + (lastIdx / (viewerHistory.length - 1)) * (width - 2 * padding);
    const lastY = height - padding - ((viewerHistory[lastIdx] - min) / range) * (height - 2 * padding - 10);

    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#818CF8';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();

  }, [viewerHistory]);

  const handleCopyObsLink = () => {
    const origin = window.location.origin;
    const obsLink = `${origin}/overlay/chat/${selectedStreamId}`;
    navigator.clipboard.writeText(obsLink);
    toast.success('Đã sao chép liên kết OBS Overlay!');
  };

  const formatDuration = (sec) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    
    const parts = [];
    if (hrs > 0) parts.push(String(hrs).padStart(2, '0'));
    parts.push(String(mins).padStart(2, '0'));
    parts.push(String(secs).padStart(2, '0'));
    
    return parts.join(':');
  };

  // Client-side filtering
  const filteredComments = activeTab === PLATFORMS.ALL
    ? comments
    : comments.filter(c => c.platform === activeTab);

  // Xác định stream thực tế hay mock
  const currentStream = streams.find(s => s.id === selectedStreamId);
  const platformStreamId = currentStream?.platformStreamId;
  const isMockStream = !platformStreamId || platformStreamId.toLowerCase().includes('mock');
  const hasRealStream = !!platformStreamId && !isMockStream;

  // Lấy link nhúng thật dựa trên nền tảng
  let embedUrl = '';
  if (hasRealStream) {
    const isYT = currentStream.platforms.some(p => p.toLowerCase() === 'youtube');
    if (isYT) {
      embedUrl = `https://www.youtube.com/embed/${platformStreamId}?autoplay=1&mute=1`;
    } else {
      // Nhúng Facebook Live Video Player
      embedUrl = `https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/facebook/videos/${platformStreamId}/&show_text=0&autoplay=true&mute=true`;
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#070709] text-gray-100 p-6 overflow-hidden">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#1A1A22]">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            📺 Livestream Chat Hub
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </h1>
          <p className="text-xs text-gray-400 mt-1">Gom bình luận đa kênh đồng thời từ YouTube Live và Facebook Page</p>
        </div>

        {/* Trạng thái kết nối độc lập các Platform */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-[#111115] px-4 py-2 rounded-xl border border-[#1E1E28]">
            <div className="flex items-center text-xs">
              <span className={`w-2 h-2 rounded-full mr-2 ${ytConnected ? 'bg-red-500 animate-ping' : 'bg-gray-600'}`} />
              <span className="text-gray-400 font-medium mr-1">YT:</span>
              <span className={ytConnected ? 'text-red-400 font-bold' : 'text-gray-500'}>
                {ytConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <div className="w-[1px] h-4 bg-[#2D2D3D]" />
            <div className="flex items-center text-xs">
              <span className={`w-2 h-2 rounded-full mr-2 ${fbConnected ? 'bg-blue-500 animate-ping' : 'bg-gray-600'}`} />
              <span className="text-gray-400 font-medium mr-1">FB:</span>
              <span className={fbConnected ? 'text-blue-400 font-bold' : 'text-gray-500'}>
                {fbConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>

          <div className="flex flex-col">
            <select
              value={selectedStreamId}
              onChange={(e) => setSelectedStreamId(e.target.value)}
              className="bg-[#111115] border border-[#1E1E28] text-xs text-gray-300 px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-52 font-medium"
              disabled={isLoading}
            >
              {streams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
              {streams.length === 0 && (
                <option value="">Không có livestream nào</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Video Live Player + Chat Feed + Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden mt-6">
        
        {/* Khung Live Video Player (Chung) */}
        <div className="w-full lg:w-[48%] flex flex-col backdrop-blur-md bg-[#0F0F16]/70 border border-white/5 rounded-2xl overflow-hidden shadow-2xl p-4">
          <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/5 shadow-inner">
            {hasRealStream ? (
              <iframe
                src={embedUrl}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                title="Real Livestream Player"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#12121A] to-[#0A0A0F] text-center p-6 select-none relative overflow-hidden">
                {/* Hiệu ứng sóng radar nhấp nháy phía nền */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <div className="w-48 h-48 rounded-full border-2 border-indigo-500 animate-ping absolute" />
                  <div className="w-32 h-32 rounded-full border border-indigo-400 animate-ping absolute" />
                </div>
                <div className="text-4xl filter drop-shadow-[0_0_12px_rgba(99,102,241,0.5)] mb-3 animate-pulse">📡</div>
                <h4 className="text-sm font-black text-gray-200 tracking-wide uppercase">Đang chờ tín hiệu phát sóng</h4>
                <p className="text-[10px] text-gray-500 max-w-[280px] mt-1.5 leading-relaxed">
                  Hãy sao chép Stream Key và RTMP URL trong OBS Studio để bắt đầu truyền luồng video thực tế.
                </p>
                
                {currentStream && (
                  <div className="mt-4 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1 text-[9px] text-indigo-400 font-mono flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-indigo-400 animate-ping" />
                    rtmp://live.publicast.com/app
                  </div>
                )}
              </div>
            )}
            
            {/* Lớp phủ HUD của Livestream */}
            <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none bg-gradient-to-t from-black/60 via-transparent to-black/40">
              <div className="flex justify-between items-center">
                <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded flex items-center gap-1.5 shadow-md shadow-red-600/30 animate-pulse pointer-events-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE
                </span>
                <span className="text-[10px] font-bold text-gray-300 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-md">
                  {ytConnected && fbConnected ? 'Multistream' : ytConnected ? 'YouTube Live' : fbConnected ? 'Facebook Live' : 'Multistream'}
                </span>
              </div>
              <div className="pointer-events-auto">
                <h2 className="text-sm font-bold text-white drop-shadow-md truncate">
                  {currentStream?.title || 'Đang chuẩn bị luồng trực tiếp...'}
                </h2>
                <p className="text-[10px] text-gray-300 mt-0.5 flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${hasRealStream ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
                  {hasRealStream ? 'Tín hiệu ổn định' : 'Chưa có tín hiệu'}
                </p>
              </div>
            </div>
          </div>
          {/* Tên stream & mô tả nhanh phía dưới player */}
          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            <h3 className="text-md font-black text-white">
              {streams.find(s => s.id === selectedStreamId)?.title || 'Không có Livestream hoạt động'}
            </h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              {streams.find(s => s.id === selectedStreamId)?.description || 'Không có mô tả nào cho phiên livestream này. Hãy kết nối camera và micrô của bạn qua OBS hoặc Streamlabs để phát sóng trực tiếp lên các kênh liên kết của PubliCast.'}
            </p>
          </div>
        </div>

        {/* Chat Feed (Glassmorphism Container) */}
        <div className="flex-1 flex flex-col backdrop-blur-md bg-[#0F0F16]/70 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          
          {/* Tabs Filter */}
          <div className="px-5 py-3 bg-[#13131B]/90 border-b border-white/5 flex justify-between items-center">
            <div className="flex gap-1.5">
              <button
                onClick={() => setActiveTab(PLATFORMS.ALL)}
                className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === PLATFORMS.ALL ? 'bg-[#1E1E2E] text-white shadow-md border border-white/5' : 'text-gray-400 hover:text-gray-200'}`}
              >
                <GlobeIcon />
                Chung
              </button>
              <button
                onClick={() => setActiveTab(PLATFORMS.YOUTUBE)}
                className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === PLATFORMS.YOUTUBE ? 'bg-red-950/40 text-red-400 shadow-md border border-red-900/30' : 'text-gray-400 hover:text-red-400'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
                YouTube
              </button>
              <button
                onClick={() => setActiveTab(PLATFORMS.FACEBOOK)}
                className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${activeTab === PLATFORMS.FACEBOOK ? 'bg-blue-950/40 text-blue-400 shadow-md border border-blue-900/30' : 'text-gray-400 hover:text-blue-400'}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                Facebook
              </button>
            </div>
            
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-[#1A1A26] px-2.5 py-1 rounded-md">
              {filteredComments.length} tin nhắn
            </span>
          </div>

          {/* Dòng chảy bình luận */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 min-h-0">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start bg-[#111117] border border-[#1D1D28]/40 p-3.5 rounded-xl transition-all duration-200 hover:bg-[#161622] hover:border-indigo-500/20 group"
              >
                <img
                  src={comment.authorAvatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${comment.authorName}`}
                  alt={comment.authorName}
                  className="w-9 h-9 rounded-xl border border-[#2D2D3D] object-cover mr-3.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-1">
                    {comment.platform === PLATFORMS.YOUTUBE ? <YouTubeIcon /> : <FacebookIcon />}
                    <span className="font-bold text-gray-200 text-sm truncate mr-2">{comment.authorName}</span>
                    <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">
                      {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 break-words leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))}
            
            {filteredComments.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <span className="text-4xl mb-3 filter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">💬</span>
                <p className="text-gray-400 font-semibold text-sm">Chưa có bình luận nào ở kênh này</p>
                <p className="text-xs text-gray-600 mt-1 max-w-[280px]">Đang chờ tin nhắn mới từ YouTube Live hoặc Facebook Page...</p>
              </div>
            )}
            <div ref={commentsEndRef} />
          </div>
        </div>

        {/* Sidebar Info/Preview (Sleek Dark Mode Panel) */}
        <div className="w-80 hidden lg:flex flex-col gap-5">
          
          {/* Main Action & Real-time Info Panel */}
          <div className="bg-[#0F0F16]/60 border border-white/5 rounded-2xl p-5 shadow-xl flex flex-col">
            
            {/* Guide Trigger Button */}
            <button
              onClick={() => setShowGuideModal(true)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 transition-all text-xs font-bold rounded-xl text-white shadow-md shadow-indigo-600/20 hover:shadow-indigo-600/30 flex items-center justify-center gap-2 mb-6"
            >
              💡 Xem Hướng dẫn Setup
            </button>

            {/* Chỉ Số Sống (Real-time Metrics) */}
            <div className="space-y-5">
              
              {/* Chỉ số người xem thực tế */}
              <div className="bg-[#111117] p-4 rounded-xl border border-[#1A1A24]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Người xem trực tiếp</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                </div>
                <div className="text-2xl font-black text-indigo-400 tracking-tight">
                  {currentViewers.toLocaleString()}
                </div>
                
                {/* Sparkline Canvas Chart */}
                <div className="mt-3 bg-[#08080C] p-1.5 rounded-lg border border-[#161622] flex items-center justify-center">
                  <canvas ref={canvasRef} width={240} height={50} className="w-full" />
                </div>
              </div>

              {/* Tốc độ bình luận */}
              <div className="bg-[#111117] p-4 rounded-xl border border-[#1A1A24] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Tốc độ bình luận</span>
                  <span className="text-lg font-black text-emerald-400 mt-0.5 block">{commentVelocity} cmt/phút</span>
                </div>
                <div className="text-2xl opacity-60">⚡</div>
              </div>

              {/* Peak & Duration (Thu nhỏ nằm dưới) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-[#111117]/60 p-3 rounded-xl border border-[#1A1A24] text-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Peak Viewers</span>
                  <span className="text-sm font-bold text-gray-200 mt-1 block">
                    {peakViewers.toLocaleString()}
                  </span>
                </div>
                <div className="bg-[#111117]/60 p-3 rounded-xl border border-[#1A1A24] text-center">
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Thời lượng live</span>
                  <span className="text-sm font-bold text-gray-200 mt-1 block">
                    {formatDuration(durationSeconds)}
                  </span>
                </div>
              </div>

            </div>
          </div>

          {/* Quick OBS Action Panel */}
          <div className="bg-[#0F0F16]/60 border border-white/5 rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs font-bold text-white mb-2 uppercase tracking-wider">OBS integration</h3>
            <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">Nhúng Chatbox trong suốt vào phần mềm OBS để hiển thị bình luận lên màn hình live.</p>
            {selectedStreamId && (
              <button
                onClick={handleCopyObsLink}
                className="w-full py-2 bg-[#1A1A26] hover:bg-[#252538] border border-white/5 transition-all text-xs font-semibold rounded-xl text-gray-200 flex items-center justify-center gap-1.5"
              >
                🔗 Copy OBS Overlay Link
              </button>
            )}
          </div>

        </div>
      </div>

      {/* SETUP WIZARD GUIDE MODAL (Overlay) */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0F0F16] border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#1E1E28] flex justify-between items-center">
              <h3 className="text-md font-bold text-white flex items-center gap-2">
                ⚙️ Hướng dẫn Cấu hình Livestream Chat
              </h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-gray-400 hover:text-white transition text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-100">Liên kết tài khoản mạng xã hội</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Truy cập trang cấu hình Connections trong Cài đặt và cấp quyền liên kết cho tài khoản YouTube (Google OAuth) hoặc Fanpage Facebook của bạn.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-100">Bắt đầu phát trực tiếp</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Bật phát trực tiếp trên phần mềm chuyên nghiệp (như OBS Studio, Streamlabs,...) bằng Stream Key & RTMP URL tương ứng của kênh YouTube hoặc Fanpage Facebook bạn đã liên kết.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-100">Nhúng Chatbox vào OBS</h4>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Copy link OBS Overlay từ Chat Hub, sau đó tại OBS Studio, thêm nguồn mới loại <strong>Browser Source</strong>, dán liên kết vừa copy và cấu hình kích thước mong muốn (đề xuất: 400x600 px).
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-[#111117] border-t border-[#1E1E28] flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white transition-all shadow-md shadow-indigo-600/10"
              >
                Đồng ý & Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default LivestreamChat;
