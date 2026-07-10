import React from "react";
import { X, Check } from "lucide-react";

/**
 * SelectionModal – Generic radio-list/checklist modal giống style "Choose a tone" trong ảnh.
 *
 * Props:
 *  isOpen      – boolean
 *  onClose     – () => void
 *  title       – string  (ví dụ: "Choose a tone")
 *  options     – Array<{ value: string, label: string, emoji: string }>
 *  value       – string (nếu single) hoặc Array<string> (nếu isMulti)
 *  onChange    – (value: string | Array<string>) => void
 *  isMulti     – boolean (nếu true, cho phép chọn nhiều bằng checklist)
 */
export default function SelectionModal({ isOpen, onClose, title, options, value, onChange, isMulti = false }) {
  if (!isOpen) return null;

  const handleSelect = (val) => {
    if (isMulti) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(val)) {
        onChange(currentValues.filter((v) => v !== val));
      } else {
        onChange([...currentValues, val]);
      }
    } else {
      onChange(val);
      onClose();
    }
  };

  const handleSelectAll = () => {
    const allValues = options.map((opt) => opt.value);
    const currentValues = Array.isArray(value) ? value : [];
    
    // Nếu đã chọn tất cả thì bỏ chọn hết, ngược lại chọn tất cả
    if (currentValues.length === allValues.length) {
      onChange([]);
    } else {
      onChange(allValues);
    }
  };

  const isAllSelected = isMulti && Array.isArray(value) && value.length === options.length;
  const currentValues = isMulti && Array.isArray(value) ? value : [];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[400px] bg-white rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 font-sans flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button – nổi ở góc trên phải (giống ảnh) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-gray-900 hover:bg-gray-700 text-white flex items-center justify-center transition-colors shadow-lg cursor-pointer"
        >
          <X size={16} />
        </button>

        {/* Title */}
        <div className="px-6 pt-7 pb-3 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          
          {/* Nút Chọn tất cả (chỉ hiển thị khi isMulti) */}
          {isMulti && (
            <button
              onClick={handleSelectAll}
              className="mt-3 text-xs font-black text-purple-600 hover:text-purple-800 transition-colors uppercase tracking-wider cursor-pointer"
            >
              {isAllSelected ? "☑ Bỏ chọn tất cả" : "☐ Chọn tất cả"}
            </button>
          )}
        </div>

        {/* Options list – có scroll khi dài */}
        <div className="overflow-y-auto px-4 pb-4 space-y-2 flex-grow">
          {options.map((opt) => {
            const isSelected = isMulti ? currentValues.includes(opt.value) : value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border transition-all duration-150 group cursor-pointer text-left ${
                  isSelected
                    ? "border-purple-300 bg-purple-50 shadow-sm"
                    : "border-gray-100 bg-gray-50/60 hover:border-gray-200 hover:bg-gray-100/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl leading-none">{opt.emoji}</span>
                  <span
                    className={`text-sm font-semibold ${
                      isSelected ? "text-purple-700" : "text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </span>
                </div>

                {/* Circle / Square indicator */}
                {isMulti ? (
                  // Checkbox square
                  <div
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "border-purple-600 bg-purple-600 text-white"
                        : "border-gray-300 group-hover:border-gray-400"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                ) : (
                  // Radio circle
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? "border-purple-600 bg-purple-600"
                        : "border-gray-300 group-hover:border-gray-400"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Nút Áp dụng ở dưới cùng (chỉ dành cho isMulti) */}
        {isMulti && (
          <div className="px-4 py-4 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-purple-100 cursor-pointer"
            >
              Áp dụng ({currentValues.length} nền tảng)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
