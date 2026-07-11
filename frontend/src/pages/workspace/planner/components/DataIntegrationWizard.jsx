import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Upload, Download, CheckCircle2, AlertTriangle, 
  Calendar as CalendarIcon, ChevronRight, ChevronLeft, 
  FileSpreadsheet, FileCode, Check, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { useBrand } from '@/context/BrandContext';
import { PlatformIcon } from '@/components/shared/PlatformIcon';
import { PostMediaThumbnail } from '@/components/shared/PostMediaThumbnail';
import { 
  getIntegrationStrategy, 
  INTEGRATION_ACTIONS, 
  INTEGRATION_FORMATS 
} from '../utils/integrationStrategies';

/**
 * DataIntegrationWizard
 * Trình thuật sĩ hợp nhất Nhập/Xuất dữ liệu cho Planner (CSV và ICS)
 */
export function DataIntegrationWizard({ isOpen, onClose, onRefreshData }) {
  const { activeBrand } = useBrand();
  
  // Trạng thái từng bước
  const [step, setStep] = useState(1);
  const [action, setAction] = useState(INTEGRATION_ACTIONS.IMPORT);
  const [format, setFormat] = useState(INTEGRATION_FORMATS.CSV);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Trạng thái cấu hình Xuất
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  // Trạng thái phân tích & nhập
  const [parsingResult, setParsingResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedFile(null);
      setParsingResult(null);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const strategy = getIntegrationStrategy(format);

  // Xử lý kéo thả file
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    validateAndSetFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    validateAndSetFile(file);
  };

  const validateAndSetFile = (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (format === INTEGRATION_FORMATS.CSV && ext !== 'csv') {
      toast.error('Vui lòng chọn tệp tin định dạng .csv');
      return;
    }
    if (format === INTEGRATION_FORMATS.ICS && ext !== 'ics') {
      toast.error('Vui lòng chọn tệp tin định dạng .ics');
      return;
    }

    setSelectedFile(file);
    toast.success(`Đã nhận tệp: ${file.name}`);
  };

  // Tiến hành bước tiếp theo
  const handleNextStep = async () => {
    if (step === 1) {
      if (action === INTEGRATION_ACTIONS.IMPORT) {
        if (!selectedFile) {
          toast.error('Vui lòng chọn tệp tin để nhập dữ liệu.');
          return;
        }
        
        // Phân tích file tại Bước 1 chuyển sang Bước 2
        setIsProcessing(true);
        try {
          const res = await strategy.parseAndValidate(selectedFile);
          setParsingResult(res);
          if (res.success) {
            setStep(2);
          } else {
            toast.error(res.message || 'Lỗi kiểm tra tệp tin.');
          }
        } catch (err) {
          console.error(err);
          toast.error('Lỗi khi phân tích tệp tin.');
        } finally {
          setIsProcessing(false);
        }
      } else {
        // Cấu hình Xuất chuyển sang Bước 2
        setStep(2);
      }
    } else if (step === 2) {
      setStep(3);
    }
  };

  // Quay lại bước trước
  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // Hoàn thành Nhập dữ liệu
  const handleConfirmImport = async () => {
    if (!activeBrand) return;
    setIsProcessing(true);
    try {
      const res = await strategy.executeImport(activeBrand.id, parsingResult.items, null, parsingResult);
      if (res.successCount > 0) {
        toast.success(`Đã nhập thành công ${res.successCount} mục vào Planner!`);
        if (onRefreshData) onRefreshData();
        onClose();
      } else {
        toast.error('Nhập dữ liệu thất bại hoặc không có dòng nào hợp lệ.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi nhập dữ liệu.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Hoàn thành Xuất dữ liệu
  const handleConfirmExport = async () => {
    if (!activeBrand) return;
    setIsProcessing(true);
    try {
      const res = await strategy.executeExport(activeBrand.id, { startDate, endDate });
      
      // Tạo link tải file
      const url = window.URL.createObjectURL(new Blob([res.blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', res.filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      toast.success('Xuất dữ liệu lịch biểu thành công!');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi xuất dữ liệu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-base font-black text-gray-900">Tích hợp & Đồng bộ dữ liệu</h3>
            <p className="text-[11px] text-gray-400 font-medium">Nhập hoặc xuất bài viết và lịch biểu bằng định dạng CSV/ICS</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-colors border-none bg-transparent cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Steps Breadcrumbs indicator */}
        <div className="px-8 py-4 border-b border-gray-50 flex items-center justify-center gap-10 bg-white">
          {[
            { num: 1, label: 'Cài đặt' },
            { num: 2, label: action === INTEGRATION_ACTIONS.IMPORT ? 'Kiểm tra' : 'Bộ lọc' },
            { num: 3, label: 'Xem trước' }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                step >= s.num 
                  ? 'bg-black text-white' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {step > s.num ? <Check size={12} className="stroke-[3]" /> : s.num}
              </div>
              <span className={`text-xs font-bold ${
                step >= s.num ? 'text-gray-900' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Body scroll zone */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[250px]">
          
          {/* STEP 1: SETUP */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Chọn action */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAction(INTEGRATION_ACTIONS.IMPORT)}
                  className={`p-5 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    action === INTEGRATION_ACTIONS.IMPORT 
                      ? 'border-black bg-black/[0.02] ring-1 ring-black' 
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                    <Upload size={18} />
                  </div>
                  <span className="text-xs font-black text-gray-900">Nhập dữ liệu (Import)</span>
                  <span className="text-[10px] text-gray-400 font-medium leading-relaxed">Đưa danh sách bài viết từ các tệp dữ liệu vào Planner của bạn.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAction(INTEGRATION_ACTIONS.EXPORT)}
                  className={`p-5 rounded-2xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                    action === INTEGRATION_ACTIONS.EXPORT 
                      ? 'border-black bg-black/[0.02] ring-1 ring-black' 
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Download size={18} />
                  </div>
                  <span className="text-xs font-black text-gray-900">Xuất dữ liệu (Export)</span>
                  <span className="text-[10px] text-gray-400 font-medium leading-relaxed">Tải xuống toàn bộ lịch biểu bài viết của bạn ra định dạng chuẩn.</span>
                </button>
              </div>

              {/* Chọn định dạng */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Định dạng tệp hỗ trợ</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setFormat(INTEGRATION_FORMATS.CSV); setSelectedFile(null); }}
                    className={`px-4 py-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all flex-1 justify-center cursor-pointer ${
                      format === INTEGRATION_FORMATS.CSV 
                        ? 'border-black bg-black text-white' 
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <FileSpreadsheet size={16} />
                    <span>Bảng tính CSV (.csv)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFormat(INTEGRATION_FORMATS.ICS); setSelectedFile(null); }}
                    className={`px-4 py-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold transition-all flex-1 justify-center cursor-pointer ${
                      format === INTEGRATION_FORMATS.ICS 
                        ? 'border-black bg-black text-white' 
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <FileCode size={16} />
                    <span>Lịch iCalendar (.ics)</span>
                  </button>
                </div>
              </div>

              {/* Tải tệp tin lên (chỉ hiển thị khi là IMPORT) */}
              {action === INTEGRATION_ACTIONS.IMPORT && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tải tệp tin</label>
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-gray-300 bg-gray-50/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-gray-50/50 group"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                      accept={format === INTEGRATION_FORMATS.CSV ? '.csv' : '.ics'}
                      className="hidden" 
                    />
                    <Upload size={24} className="text-gray-400 group-hover:text-black transition-colors" />
                    <span className="text-xs font-bold text-gray-700">Kéo & thả hoặc click để chọn file</span>
                    <span className="text-[10px] text-gray-400 font-medium">Hỗ trợ tệp *.{format.toLowerCase()} mẫu tiêu chuẩn</span>
                  </div>

                  {selectedFile && (
                    <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-green-800">
                      <span className="font-bold truncate max-w-[400px]">{selectedFile.name}</span>
                      <span className="font-medium shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CONFIGURATION & VALIDATION */}
          {step === 2 && (
            <div className="space-y-6">
              {action === INTEGRATION_ACTIONS.IMPORT ? (
                // Phân tích và kiểm tra file (IMPORT)
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-gray-50/60 p-4 rounded-2xl border border-gray-100">
                    <div className="flex-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Trạng thái tệp</span>
                      <h4 className="text-xs font-black text-gray-900 mt-0.5">{selectedFile?.name}</h4>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 size={10} />
                        {parsingResult?.stats.valid} dòng hợp lệ
                      </span>
                      {parsingResult?.stats.failed > 0 && (
                        <span className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-full text-[10px] font-bold flex items-center gap-1">
                          <AlertTriangle size={10} />
                          {parsingResult?.stats.failed} dòng bị lỗi
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Hiển thị lỗi phân tích nếu có */}
                  {parsingResult?.errors && parsingResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Danh sách dòng bị lỗi/bỏ qua</label>
                      <div className="max-h-[180px] overflow-y-auto border border-yellow-100 bg-yellow-50/30 rounded-xl divide-y divide-yellow-100/50">
                        {parsingResult.errors.map((err, idx) => (
                          <div key={idx} className="p-3 text-[11px] flex flex-col gap-0.5">
                            <span className="font-bold text-gray-800">Dòng {err.row}: {err.title}</span>
                            <span className="text-red-500 font-medium">{err.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-blue-800 text-[11px] leading-relaxed">
                    <p className="font-bold">💡 Hướng dẫn kiểm tra:</p>
                    <p className="mt-1 font-medium">Bấm **Tiếp tục** để kiểm tra và xem trước nội dung trực quan từng bài viết trước khi chính thức áp dụng vào Lịch biểu của bạn.</p>
                  </div>
                </div>
              ) : (
                // Cấu hình lọc khoảng ngày (EXPORT)
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-900">Chọn khoảng thời gian xuất lịch biểu</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Từ ngày</label>
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                      />
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Đến ngày</label>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl text-gray-500 text-[11px] leading-relaxed font-medium">
                    Bài viết trong khoảng thời gian này sẽ được truy vấn trực tiếp từ cơ sở dữ liệu để biên dịch tệp tải về tương thích.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: PREVIEW & COMPLETE */}
          {step === 3 && (
            <div className="space-y-6">
              {action === INTEGRATION_ACTIONS.IMPORT ? (
                // Bảng xem trước danh sách bài viết sẽ Import
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Xem trước danh sách bài viết ({parsingResult?.items.length})</label>
                    <span className="text-[10px] font-bold text-gray-400">Xem trước giúp đảm bảo định dạng khớp chính xác</span>
                  </div>
                  
                  <div className="border border-gray-100 rounded-2xl overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-[9px] font-black text-gray-400 uppercase tracking-wider">
                          <th className="p-3 w-10 text-center">STT</th>
                          <th className="p-3 w-14">Media</th>
                          <th className="p-3">Bài viết</th>
                          <th className="p-3 w-28">Nền tảng</th>
                          <th className="p-3 w-36">Thời gian lên lịch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 text-[11px] font-bold text-gray-700">
                        {parsingResult?.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                            <td className="p-3 text-center text-gray-400">{item.rowIndex}</td>
                            <td className="p-3">
                              <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-gray-100">
                                <PostMediaThumbnail 
                                  thumbnail={item.rawPayload.thumbnail || (item.mediaUrls.length > 0 ? item.mediaUrls[0] : null)}
                                  mediaUrls={item.mediaUrls}
                                  className="w-full h-full"
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="max-w-[200px] truncate" title={item.caption}>
                                {item.title || item.caption || 'Bài viết nhập'}
                              </div>
                              {item.caption && (
                                <div className="text-[9px] text-gray-400 font-medium truncate max-w-[200px]">
                                  {item.caption}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {String(item.targetPlatforms).split(',').map((plt) => (
                                  <div key={plt} className="w-4 h-4 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 shadow-sm" title={plt}>
                                    <PlatformIcon platform={plt} size={10} />
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-[10px] text-gray-500 font-medium">
                              {item.scheduledAt 
                                ? new Date(item.scheduledAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
                                : 'Lưu bản nháp'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                // Xem trước cấu hình trước khi Xuất
                <div className="space-y-4">
                  <div className="bg-gray-50/60 border border-gray-100 rounded-2xl p-5 space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-400">Hình thức hành động</span>
                      <span className="font-black text-gray-900">Xuất tệp dữ liệu (Export)</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-400">Định dạng đầu ra</span>
                      <span className="font-black text-gray-900">{format === INTEGRATION_FORMATS.CSV ? 'Bảng tính CSV (.csv)' : 'Lịch iCalendar (.ics)'}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-gray-400">Phạm vi thời gian</span>
                      <span className="font-black text-gray-900">{startDate} → {endDate}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl text-blue-800 text-[11px] leading-relaxed">
                    Tệp của bạn sẽ được tự động biên dịch, ký số mã hóa và sẵn sàng tải về trong giây lát sau khi bấm xác nhận.
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="px-6 py-5 border-t border-gray-100 flex justify-between bg-gray-50/50">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <ChevronLeft size={14} />
                <span>Quay lại</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-700 transition-all cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-black hover:bg-black/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <span>Tiếp tục</span>
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={action === INTEGRATION_ACTIONS.IMPORT ? handleConfirmImport : handleConfirmExport}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-black hover:bg-black/90 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    {action === INTEGRATION_ACTIONS.IMPORT ? (
                      <>
                        <Upload size={14} />
                        <span>Nhập dữ liệu</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Tải về file</span>
                      </>
                    )}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
