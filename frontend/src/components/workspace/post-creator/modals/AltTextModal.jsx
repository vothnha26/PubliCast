import * as React from "react";
import { useState } from "react";
import { X, Info, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AltTextModal({
  isOpen,
  onClose,
  imageUrl,
  imageTransform,
  caption,
  initialAltText,
  onSave
}) {
  const [altText, setAltText] = useState(initialAltText || "");
  const [aiCredits, setAiCredits] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const getImageStyle = (transform) => {
    if (!transform) return {};
    const { rotation = 0, flipH = false, flipV = false } = transform;
    return {
      transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
      transition: "transform 0.3s ease"
    };
  };

  const getImageFilterClass = (filterId) => {
    switch (filterId) {
      case "grayscale": return "grayscale";
      case "sepia": return "sepia";
      case "invert": return "invert";
      case "blur": return "blur-[2px]";
      case "warm": return "sepia-[0.3] saturate-[1.3] hue-rotate-[-10deg]";
      case "cool": return "saturate-[0.9] hue-rotate-[10deg] brightness-[1.05]";
      case "dramatic": return "contrast-[1.2] brightness-[0.9]";
      default: return "";
    }
  };

  const handleAiGenerate = async () => {
    if (aiCredits <= 0) {
      toast.error("You have run out of AI credits.");
      return;
    }

    setIsGenerating(true);
    // Simulate AI thinking and generating a smart description
    setTimeout(() => {
      let generatedText = "Một bức ảnh nghệ thuật chi tiết chất lượng cao.";
      if (caption && caption.trim()) {
        generatedText = `Mô tả hình ảnh liên quan đến nội dung: "${caption.substring(0, 80)}..." với độ chi tiết cao, màu sắc hài hòa và bố cục rõ ràng.`;
      } else {
        generatedText = "Một hình ảnh minh họa sống động với độ tương phản cao, tập trung vào chủ thể trung tâm và ánh sáng tự nhiên tinh tế.";
      }
      setAltText(generatedText);
      setAiCredits(prev => Math.max(0, prev - 1));
      setIsGenerating(false);
      toast.success("AI Alt Text generated successfully!");
    }, 1500);
  };

  const handleSave = () => {
    onSave(altText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[650px] bg-card rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col p-6 relative animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-1">
          <h3 className="text-base font-bold text-foreground">Add alt text</h3>
          
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold mr-8">
            <span>Available AI credits: <strong className="text-foreground">{aiCredits} of 5</strong>.</span>
            <Info size={14} className="text-muted-foreground cursor-help" />
          </div>

          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-black transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex gap-6 mt-6">
          {/* Left Panel: Preview */}
          <div className="w-[180px] h-[240px] rounded-2xl overflow-hidden bg-muted border border-border shrink-0 shadow-sm relative flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                style={getImageStyle(imageTransform)}
                className={`w-full h-full object-cover ${getImageFilterClass(imageTransform?.filter)}`}
                alt="Alt text thumbnail preview"
              />
            ) : (
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">No Image</span>
            )}
          </div>

          {/* Right Panel: Input Area */}
          <div className="flex-1 flex flex-col justify-between h-[240px]">
            <textarea
              value={altText}
              onChange={(e) => setAltText(e.target.value.substring(0, 500))}
              placeholder="Write an alt text or press the AI icon to generate one"
              className="w-full flex-1 p-4 bg-muted border border-border focus:border-border focus:bg-card rounded-2xl text-xs font-semibold text-foreground placeholder-gray-400 resize-none outline-none transition-all scrollbar-thin"
            />
            
            <div className="flex items-center justify-between mt-3 px-1">
              <button
                type="button"
                onClick={handleAiGenerate}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted disabled:opacity-50 rounded-xl transition-all text-[11px] font-bold text-muted-foreground cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={13} className="text-muted-foreground animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="text-[#1877F2]" />
                    <span>Generate Alt Text</span>
                  </>
                )}
              </button>

              <span className="text-[10px] font-bold text-muted-foreground">{altText.length} / 500</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-5 mt-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
            <span>This text will apply to:</span>
            <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center text-white">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                toast.info("Alt text provides descriptions of your images for visually impaired users.");
              }}
              className="text-[#1877F2] hover:underline"
            >
              Know more
            </a>
          </div>

          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-[#0A0A0A] hover:bg-black text-white text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Accept
          </button>
        </div>

      </div>
    </div>
  );
}
