import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { useImageEditor } from "../image-editor/useImageEditor";
import { Sidebar } from "../image-editor/Sidebar";
import { Toolbar } from "../image-editor/Toolbar";
import { Viewport } from "../image-editor/Viewport";
import { SettingsPanel, FILTER_PRESETS } from "../image-editor/SettingsPanel";
import { getFinetuneFilterString } from "../image-editor/utils";

export function ImageEditorModal({ isOpen, imageUrl, currentTransform, brandId, onClose, onSave }) {
  const editor = useImageEditor({ imageUrl, currentTransform, brandId, onSave, onClose });

  if (!isOpen) return null;

  const selectedFilterObj = FILTER_PRESETS.find(f => f.id === editor.activeFilter);
  const filterClass = selectedFilterObj ? selectedFilterObj.class : '';
  
  const scaleFactor = editor.imgSize.w && editor.initialBox.width ? (editor.imgSize.w / editor.initialBox.width) : 1;
  const croppedNaturalWidth = editor.cropBox.width * scaleFactor;
  const croppedNaturalHeight = editor.cropBox.height * scaleFactor;

  const stretchX = croppedNaturalWidth ? (editor.resizeWidth / croppedNaturalWidth) : 1;
  const stretchY = croppedNaturalHeight ? (editor.resizeHeight / croppedNaturalHeight) : 1;

  const stretchStyle = {
    transform: `scaleX(${stretchX}) scaleY(${stretchY})`,
    transformOrigin: 'center center',
  };

  const finetuneFilter = getFinetuneFilterString({
    brightness: editor.brightness,
    contrast: editor.contrast,
    saturate: editor.saturate,
    adjustments: editor.adjustments,
    activeFilter: editor.activeFilter
  });

  const imageStyle = {
    transform: `translate(${editor.position.x}px, ${editor.position.y}px) rotate(${editor.rotation}deg) scaleX(${editor.flipH ? -1 : 1}) scaleY(${editor.flipV ? -1 : 1}) scale(${editor.scaleVal})`,
    filter: finetuneFilter,
    cursor: editor.isDraggingImage ? 'grabbing' : (editor.activeTab === 'draw' ? 'crosshair' : 'grab'),
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full h-full max-w-7xl max-h-[90vh] md:rounded-[32px] overflow-hidden shadow-2xl flex flex-col justify-between font-sans relative border border-gray-100 mx-4">
        
        {/* Loading Overlay */}
        {editor.isSaving && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[3100] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-200">
            <Loader2 size={36} className="text-[#1A1A1A] animate-spin" />
            <span className="text-xs font-black uppercase tracking-widest text-gray-700">Saving Changes...</span>
          </div>
        )}

        {/* Header */}
        <div className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white shrink-0">
          <h2 className="text-base font-black text-gray-800 tracking-tight">Image Editor</h2>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#180F1E] hover:bg-black text-white flex items-center justify-center shadow-md transition-all cursor-pointer group"
          >
            <X size={18} className="group-hover:rotate-90 transition-transform duration-300 text-yellow-300" />
          </button>
        </div>

        {/* Workspace body */}
        <div className="flex-1 flex overflow-hidden">
          
          <Sidebar
            activeTab={editor.activeTab}
            setActiveTab={editor.setActiveTab}
            setActiveStickerId={editor.setActiveStickerId}
            setActiveCensureId={editor.setActiveCensureId}
          />

          {/* Center Main Screen */}
          <div className="flex-1 bg-white flex flex-col relative overflow-hidden select-none" ref={editor.containerRef}>
            
            <Toolbar
              scaleVal={editor.scaleVal}
              flipH={editor.flipH}
              flipV={editor.flipV}
              canUndo={editor.canUndo}
              canRedo={editor.canRedo}
              handleUndo={editor.handleUndo}
              handleRedo={editor.handleRedo}
              handleReset={editor.handleReset}
              handleZoomOut={editor.handleZoomOut}
              handleZoomIn={editor.handleZoomIn}
              handleRotate90={editor.handleRotate90}
              handleFlipH={editor.handleFlipH}
              handleFlipV={editor.handleFlipV}
            />

            <Viewport
              cropBox={editor.cropBox}
              activeTab={editor.activeTab}
              activeDrawTool={editor.activeDrawTool}
              textPosition={editor.textPosition}
              textInputVal={editor.textInputVal}
              setTextInputVal={editor.setTextInputVal}
              handleAddText={editor.handleAddText}
              setTextPosition={editor.setTextPosition}
              drawCanvasRef={editor.drawCanvasRef}
              handleDrawStart={editor.handleDrawStart}
              handleDrawMove={editor.handleDrawMove}
              handleDrawEnd={editor.handleDrawEnd}
              stickers={editor.stickers}
              activeStickerId={editor.activeStickerId}
              handleStickerMouseDown={editor.handleStickerMouseDown}
              handleResizeSticker={editor.handleResizeSticker}
              handleRemoveSticker={editor.handleRemoveSticker}
              censures={editor.censures}
              activeCensureId={editor.activeCensureId}
              handleCensureMouseDown={editor.handleCensureMouseDown}
              handleResizeCensure={editor.handleResizeCensure}
              handleRemoveCensure={editor.handleRemoveCensure}
              activeFrame={editor.activeFrame}
              frameColor={editor.frameColor}
              frameSize={editor.frameSize}
              frameOffset1={editor.frameOffset1}
              frameRadius={editor.frameRadius}
              handleImageMouseDown={editor.handleImageMouseDown}
              handleCornerMouseDown={editor.handleCornerMouseDown}
              imageUrl={imageUrl}
              imageStyle={imageStyle}
              filterClass={filterClass}
              stretchStyle={stretchStyle}
              adjustments={editor.adjustments}
            />

            <SettingsPanel
              activeTab={editor.activeTab}
              adjustMode={editor.adjustMode}
              setAdjustMode={editor.setAdjustMode}
              scaleVal={editor.scaleVal}
              setScaleVal={editor.setScaleVal}
              rotation={editor.rotation}
              setRotation={editor.setRotation}
              brightness={editor.brightness}
              setBrightness={editor.setBrightness}
              contrast={editor.contrast}
              setContrast={editor.setContrast}
              saturate={editor.saturate}
              setSaturate={editor.setSaturate}
              adjustments={editor.adjustments}
              setAdjustments={editor.setAdjustments}
              finetuneActiveField={editor.finetuneActiveField}
              setFinetuneActiveField={editor.setFinetuneActiveField}
              activeFilter={editor.activeFilter}
              setActiveFilter={editor.setActiveFilter}
              imageUrl={imageUrl}
              handleAddSticker={editor.handleAddSticker}
              activeDrawTool={editor.activeDrawTool}
              setActiveDrawTool={editor.setActiveDrawTool}
              drawColor={editor.drawColor}
              setDrawColor={editor.setDrawColor}
              drawWidth={editor.drawWidth}
              setDrawWidth={editor.setDrawWidth}
              showColorDropdown={editor.showColorDropdown}
              setShowColorDropdown={editor.setShowColorDropdown}
              showLineWidthDropdown={editor.showLineWidthDropdown}
              setShowLineWidthDropdown={editor.setShowLineWidthDropdown}
              setTextPosition={editor.setTextPosition}
              activeFrame={editor.activeFrame}
              setActiveFrame={editor.setActiveFrame}
              frameColor={editor.frameColor}
              setFrameColor={editor.setFrameColor}
              frameSize={editor.frameSize}
              setFrameSize={editor.setFrameSize}
              frameOffset1={editor.frameOffset1}
              setFrameOffset1={editor.setFrameOffset1}
              frameOffset2={editor.frameOffset2}
              setFrameOffset2={editor.setFrameOffset2}
              frameRadius={editor.frameRadius}
              setFrameRadius={editor.setFrameRadius}
              frameAmount={editor.frameAmount}
              setFrameAmount={editor.setFrameAmount}
              showFrameColorPicker={editor.showFrameColorPicker}
              setShowFrameColorPicker={editor.setShowFrameColorPicker}
              handleAddCensure={editor.handleAddCensure}
              keepRatio={editor.keepRatio}
              setKeepRatio={editor.setKeepRatio}
              resizeWidth={editor.resizeWidth}
              handleResizeWidthChange={editor.handleResizeWidthChange}
              resizeHeight={editor.resizeHeight}
              handleResizeHeightChange={editor.handleResizeHeightChange}
              imgSize={editor.imgSize}
            />

            {/* Size dimension detail badge */}
            <div className="absolute right-4 bottom-4 text-[10px] font-black text-gray-400 select-none">
              {Math.round(editor.imgSize.w * (editor.cropBox.width / editor.initialBox.width))} × {Math.round(editor.imgSize.h * (editor.cropBox.height / editor.initialBox.height))}
            </div>

          </div>

        </div>

        {/* Footer controls */}
        <div className="h-16 bg-white border-t border-gray-100 flex items-center justify-end px-8 gap-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-black text-gray-500 hover:text-black transition-all cursor-pointer uppercase tracking-wider"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={editor.handleSaveTrigger}
            className="px-6 py-2.5 text-xs font-black bg-[#1A1A1A] hover:bg-black text-yellow-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md uppercase tracking-wider"
          >
            Save
          </button>
        </div>

      </div>
    </div>
  );
}
