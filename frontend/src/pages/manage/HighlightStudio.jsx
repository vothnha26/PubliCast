import { useState, useEffect, useRef } from "react";
import { Scissors, Sparkles, Upload, Play, CheckCircle2, AlertCircle, Loader2, Edit3, X, Youtube } from "lucide-react";
import apiService from "../../services/api";
import { useBrand } from "../../context/BrandContext";

export default function HighlightStudio() {
  const { activeBrand } = useBrand();
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [taskId, setTaskId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | processing | completed | error
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [highlightData, setHighlightData] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [ytModal, setYtModal] = useState(false);
  const [ytTitle, setYtTitle] = useState("");
  const [ytDesc, setYtDesc] = useState("#Shorts #Highlights");
  const [ytPublishing, setYtPublishing] = useState(false);
  const [ytResult, setYtResult] = useState(null);
  const videoRef = useRef(null);
  const pollRef = useRef(null);

  // Restore task from localStorage on mount
  useEffect(() => {
    const savedTaskId = localStorage.getItem("highlight_task_id");
    if (savedTaskId) {
      setTaskId(savedTaskId);
      setStatus("processing");
      setProgressMsg("Đang khôi phục tiến trình...");
    }
  }, []);

  // Poll status every 3s while processing
  useEffect(() => {
    if (status === "processing" && taskId) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await apiService.get(`/highlights/${taskId}/status`);
          const data = res.data.data.highlight;
          setProgress(data.progress || 0);
          setProgressMsg(data.progressMsg || "Đang xử lý...");

          if (data.status === "completed") {
            setStatus("completed");
            setHighlightData(data);
            clearInterval(pollRef.current);
            if (data.subtitleUrl) fetchSubtitles(data.subtitleUrl);
          } else if (data.status === "failed") {
            setStatus("error");
            setErrorMsg("Colab Worker báo lỗi khi xử lý video.");
            clearInterval(pollRef.current);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [status, taskId]);

  const fetchSubtitles = async (url) => {
    try {
      const res = await fetch(url);
      const data = await res.json();
      setSubtitles(data);
    } catch (err) {
      console.error("Failed to load subtitles:", err);
    }
  };

  const handleImport = async () => {
    if (!youtubeUrl.trim()) return;
    if (!activeBrand?.id) {
      setErrorMsg("Bạn cần chọn một Brand trước khi import.");
      setStatus("error");
      return;
    }
    setStatus("processing");
    setProgress(0);
    setProgressMsg("Đang khởi tạo task...");
    setErrorMsg("");

    try {
      const res = await apiService.post("/highlights/import", {
        youtubeUrl: youtubeUrl.trim(),
        brandId: activeBrand.id,
      });
      const newTaskId = res.data.data.highlight.id;
      setTaskId(newTaskId);
      localStorage.setItem("highlight_task_id", newTaskId);
    } catch (err) {
      console.error("Import failed:", err);
      setErrorMsg(err.response?.data?.message || "Không thể kết nối Backend.");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setYoutubeUrl("");
    setTaskId(null);
    setProgress(0);
    setProgressMsg("");
    setHighlightData(null);
    setSubtitles([]);
    setErrorMsg("");
    setYtResult(null);
    setYtModal(false);
    localStorage.removeItem("highlight_task_id");
  };

  const handlePublishYoutube = async () => {
    if (!ytTitle.trim()) return;
    setYtPublishing(true);
    try {
      const res = await apiService.post(`/highlights/${taskId}/publish-youtube`, {
        title: ytTitle,
        description: ytDesc,
        brandId: activeBrand.id,
      });
      setYtResult(res.data.data);
      setYtModal(false);
    } catch (err) {
      alert(err.response?.data?.message || "Đăng thất bại. Kiểm tra kết nối YouTube!");
    } finally {
      setYtPublishing(false);
    }
  };

  const progressSteps = [
    { label: "Tải video", pct: 20 },
    { label: "Tách âm thanh", pct: 40 },
    { label: "Tìm Highlight", pct: 55 },
    { label: "Crop 9:16", pct: 75 },
    { label: "Tạo phụ đề AI", pct: 90 },
    { label: "Upload", pct: 100 },
  ];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
            <Scissors size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Highlight Studio</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Tự động cắt video 9:16 + phụ đề karaoke từ Livestream YouTube</p>
          </div>
          <span className="ml-auto text-[10px] font-bold px-2 py-1 rounded-full bg-purple-500/15 text-purple-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={10} /> AI Powered
          </span>
        </div>

        <div className="h-px bg-[var(--sidebar-border)] mb-6" />

        {/* ── IDLE / ERROR state ── */}
        {(status === "idle" || status === "error") && (
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--sidebar-border)] p-8">
            <h2 className="text-lg font-semibold mb-1">Nhập link Livestream</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-5">
              Dán link YouTube (video đã kết thúc hoặc replay) để AI phân tích và trích xuất những đoạn hay nhất.
            </p>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Upload size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImport()}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--muted)] border border-[var(--sidebar-border)] text-sm outline-none focus:ring-2 focus:ring-purple-500/40 transition-all placeholder:text-[var(--muted-foreground)]"
                />
              </div>
              <button
                onClick={handleImport}
                disabled={!youtubeUrl.trim()}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                <Sparkles size={15} />
                Phân tích AI
              </button>
            </div>

            {status === "error" && errorMsg && (
              <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16} className="shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Info cards */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[
                { icon: "🎵", title: "RMS Audio Peak", desc: "Tìm đỉnh âm lượng để xác định khoảnh khắc highlight" },
                { icon: "👤", title: "Face Tracking", desc: "MediaPipe theo dõi khuôn mặt để crop 9:16 tự động" },
                { icon: "✍️", title: "Whisper AI", desc: "Nhận diện giọng nói từng chữ để tạo phụ đề karaoke" },
              ].map((card) => (
                <div key={card.title} className="bg-[var(--muted)] rounded-xl p-4 border border-[var(--sidebar-border)]">
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <div className="text-sm font-semibold mb-1">{card.title}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">{card.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-xl px-4 py-3 border border-[var(--sidebar-border)]">
              ⚠️ <strong>Lưu ý:</strong> Tính năng này yêu cầu <strong>Google Colab Worker đang chạy</strong>. Mở file{" "}
              <code className="bg-[var(--background)] px-1 py-0.5 rounded text-xs">python-worker/Google_Colab_Worker.md</code>{" "}
              và bật Worker trên Colab trước khi import.
            </div>
          </div>
        )}

        {/* ── PROCESSING state ── */}
        {status === "processing" && (
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--sidebar-border)] p-8">
            <div className="flex items-center gap-3 mb-6">
              <Loader2 size={22} className="text-purple-500 animate-spin" />
              <h2 className="text-lg font-semibold">AI đang phân tích video...</h2>
            </div>

            {/* Big progress bar */}
            <div className="w-full h-3 bg-[var(--muted)] rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #7c3aed, #ec4899)",
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--muted-foreground)] mb-6">
              <span>{progressMsg}</span>
              <span className="font-semibold text-purple-500">{progress}%</span>
            </div>

            {/* Step indicators */}
            <div className="flex items-center justify-between gap-1">
              {progressSteps.map((step, i) => {
                const done = progress >= step.pct;
                const active = progress >= (progressSteps[i - 1]?.pct || 0) && progress < step.pct;
                return (
                  <div key={step.label} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                      done ? "bg-purple-500 text-white" :
                      active ? "bg-purple-200 text-purple-700 animate-pulse" :
                      "bg-[var(--muted)] text-[var(--muted-foreground)]"
                    }`}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span className="text-[9px] text-center text-[var(--muted-foreground)] leading-tight hidden sm:block">{step.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <p className="text-xs text-center text-[var(--muted-foreground)]">
                Quá trình có thể mất <strong>3–10 phút</strong> tùy độ dài video. Đừng tắt tab này!
              </p>
              
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--sidebar-border)] bg-[var(--muted)] text-[var(--foreground)] hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all shrink-0"
              >
                <X size={14} />
                Hủy phân tích
              </button>
            </div>
          </div>
        )}

        {/* ── COMPLETED state ── */}
        {status === "completed" && highlightData && (
          <div>
            {/* Success banner */}
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-6">
              <CheckCircle2 size={18} className="text-green-500 shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-semibold text-green-600">Highlight đã sẵn sàng! </span>
                <span className="text-sm text-[var(--muted-foreground)]">AI đã cắt xong đoạn video hay nhất. Kiểm tra và xuất bản nhé.</span>
              </div>
              <button onClick={handleReset} className="text-xs text-[var(--muted-foreground)] hover:underline">Import mới</button>
            </div>

            <div className="grid grid-cols-[300px_1fr] gap-8 items-start">
              {/* ── Video Player 9:16 ── */}
              <div>
                <div className="w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden relative shadow-2xl">
                  <video
                    ref={videoRef}
                    src={highlightData.videoUrl}
                    controls
                    className="w-full h-full object-cover"
                    onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
                  />
                  {/* Karaoke subtitle overlay */}
                  {subtitles.length > 0 && (
                    <div className="absolute bottom-16 left-0 w-full text-center pointer-events-none px-4">
                      <div className="flex flex-wrap justify-center gap-1">
                        {subtitles
                          .filter((sub) => currentTime >= sub.start - 1.5 && currentTime <= sub.end + 1.5)
                          .map((sub, i) => {
                            const isActive = currentTime >= sub.start && currentTime <= sub.end;
                            return (
                              <span
                                key={i}
                                className="transition-all duration-100 inline-block"
                                style={{
                                  fontSize: isActive ? "22px" : "18px",
                                  fontWeight: 900,
                                  color: isActive ? "#fbbf24" : "#ffffff",
                                  textShadow: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000",
                                  transform: isActive ? "scale(1.15)" : "scale(1)",
                                }}
                              >
                                {sub.word}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
                {highlightData.duration && (
                  <p className="text-xs text-center text-[var(--muted-foreground)] mt-2">
                    ⏱ Thời lượng: {Math.round(highlightData.duration)}s
                  </p>
                )}
              </div>

              {/* ── Subtitle Editor + Publish ── */}
              <div className="flex flex-col gap-4" style={{ maxHeight: "600px" }}>
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--sidebar-border)] p-5 flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Edit3 size={16} className="text-purple-500" />
                      <h2 className="font-semibold">Trình soạn phụ đề</h2>
                    </div>
                    <button
                      onClick={() => {
                        const t = videoRef.current?.currentTime ?? 0;
                        const newWord = { word: "Từ mới", start: parseFloat(t.toFixed(2)), end: parseFloat((t + 0.8).toFixed(2)) };
                        const updated = [...subtitles, newWord].sort((a, b) => a.start - b.start);
                        setSubtitles(updated);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                    >
                      + Thêm tại {currentTime.toFixed(1)}s
                    </button>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mb-3">
                    Sửa chữ, thêm từ mới tại thời điểm đang phát, hoặc xóa từng dòng. Hàng màu vàng = đang nói.
                  </p>

                  {subtitles.length > 0 ? (
                    <div className="max-h-[340px] overflow-y-auto rounded-xl border border-[var(--sidebar-border)]">
                      {/* Header */}
                      <div className="grid grid-cols-[1fr_72px_72px_32px] gap-1 px-3 py-2 bg-[var(--muted)] text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide sticky top-0 z-10">
                        <span>Từ / Cụm từ</span>
                        <span className="text-center">Bắt đầu (s)</span>
                        <span className="text-center">Kết thúc (s)</span>
                        <span></span>
                      </div>

                      {/* Rows */}
                      {subtitles.map((sub, index) => {
                        const isActive = currentTime >= sub.start && currentTime <= sub.end;
                        return (
                          <div
                            key={index}
                            className="grid grid-cols-[1fr_72px_72px_32px] gap-1 px-3 py-1.5 items-center border-t border-[var(--sidebar-border)] transition-colors"
                            style={{ background: isActive ? "rgba(251,191,36,0.12)" : "transparent" }}
                          >
                            {/* Word */}
                            <input
                              type="text"
                              value={sub.word}
                              onChange={e => {
                                const n = [...subtitles];
                                n[index] = { ...n[index], word: e.target.value };
                                setSubtitles(n);
                              }}
                              className="w-full px-2 py-1 rounded-lg border text-xs outline-none transition-all bg-transparent"
                              style={{
                                borderColor: isActive ? "#f59e0b" : "var(--sidebar-border)",
                                color: "var(--foreground)",
                                fontWeight: isActive ? 700 : 400,
                              }}
                            />
                            {/* Start time */}
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={sub.start}
                              onChange={e => {
                                const n = [...subtitles];
                                n[index] = { ...n[index], start: parseFloat(e.target.value) || 0 };
                                setSubtitles(n);
                              }}
                              onBlur={() => setSubtitles(prev => [...prev].sort((a, b) => a.start - b.start))}
                              className="w-full px-1 py-1 rounded-lg border text-xs text-center outline-none bg-transparent"
                              style={{ borderColor: "var(--sidebar-border)", color: "var(--foreground)" }}
                            />
                            {/* End time */}
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={sub.end}
                              onChange={e => {
                                const n = [...subtitles];
                                n[index] = { ...n[index], end: parseFloat(e.target.value) || 0 };
                                setSubtitles(n);
                              }}
                              className="w-full px-1 py-1 rounded-lg border text-xs text-center outline-none bg-transparent"
                              style={{ borderColor: "var(--sidebar-border)", color: "var(--foreground)" }}
                            />
                            {/* Delete */}
                            <button
                              onClick={() => setSubtitles(subtitles.filter((_, i) => i !== index))}
                              className="flex items-center justify-center w-6 h-6 rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-[var(--muted-foreground)] py-8 bg-[var(--muted)] rounded-xl">
                      <p>Không có phụ đề nào.</p>
                      <button
                        onClick={() => setSubtitles([{ word: "Từ đầu tiên", start: 0, end: 1 }])}
                        className="mt-2 px-4 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                      >
                        + Tạo phụ đề thủ công
                      </button>
                    </div>
                  )}
                </div>

                {/* Export buttons */}
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--sidebar-border)] p-5">
                  <h3 className="font-semibold mb-3">Xuất bản</h3>
                  <div className="flex flex-col gap-2">
                    <a
                      href={highlightData.videoUrl}
                      download
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-500 text-white hover:opacity-90 transition-opacity"
                    >
                      ⬇️ Tải video về máy
                    </a>
                    <button
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm border border-[var(--sidebar-border)] hover:bg-[var(--muted)] transition-colors text-[var(--foreground)]"
                      onClick={() => alert("Tính năng đăng TikTok sẽ được tích hợp sau!")}
                    >
                      🎵 Đăng lên TikTok
                    </button>

                    {/* YouTube Shorts publish */}
                    {ytResult ? (
                      <a
                        href={`https://youtube.com/shorts/${ytResult.platformVideoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
                      >
                        <Youtube size={16} /> ✅ Đã đăng — Xem trên YouTube Shorts
                      </a>
                    ) : (
                      <button
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-semibold text-sm bg-red-500 text-white hover:bg-red-600 transition-colors"
                        onClick={() => { setYtTitle(highlightData.youtubeUrl || "Highlight"); setYtModal(true); }}
                      >
                        <Youtube size={16} /> Đăng lên YouTube Shorts
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── YouTube Publish Modal ── */}
        {ytModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[var(--card)] border border-[var(--sidebar-border)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Youtube size={20} className="text-red-500" />
                  <h3 className="font-bold text-lg">Đăng lên YouTube Shorts</h3>
                </div>
                <button onClick={() => setYtModal(false)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                  <X size={18} />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Tiêu đề video *</label>
                  <input
                    type="text"
                    value={ytTitle}
                    onChange={e => setYtTitle(e.target.value)}
                    maxLength={100}
                    placeholder="Nhập tiêu đề hấp dẫn..."
                    className="w-full px-3 py-2 rounded-xl border border-[var(--sidebar-border)] bg-[var(--background)] text-sm outline-none focus:border-red-400 transition-colors"
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{ytTitle.length}/100 ký tự</p>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Mô tả / Hashtag</label>
                  <textarea
                    value={ytDesc}
                    onChange={e => setYtDesc(e.target.value)}
                    rows={3}
                    placeholder="#Shorts #Highlights"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--sidebar-border)] bg-[var(--background)] text-sm outline-none focus:border-red-400 transition-colors resize-none"
                  />
                </div>
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-500">
                  <Youtube size={14} />
                  Video sẽ được đăng <strong>công khai</strong> lên kênh YouTube đã kết nối với Brand này.
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setYtModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--sidebar-border)] text-sm font-medium hover:bg-[var(--muted)] transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handlePublishYoutube}
                  disabled={ytPublishing || !ytTitle.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {ytPublishing ? <Loader2 size={16} className="animate-spin" /> : <Youtube size={16} />}
                  {ytPublishing ? "Đang đăng..." : "Đăng ngay"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

