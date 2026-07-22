import { useState, useEffect, useRef } from "react";
import { getFullImageUrl, processCanvas } from "./utils";
import apiService from "../../../../services/api";

export function useImageEditor({ imageUrl, currentTransform, brandId, onSave, onClose }) {
  const [activeTab, setActiveTab] = useState('size');
  const [adjustMode, setAdjustMode] = useState('rotation');
  const [rotation, setRotation] = useState(currentTransform?.rotation || 0);
  const [flipH, setFlipH] = useState(currentTransform?.flipH || false);
  const [flipV, setFlipV] = useState(currentTransform?.flipV || false);
  const [activeFilter, setActiveFilter] = useState(currentTransform?.filter || 'none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [scaleVal, setScaleVal] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  
  const [imgSize, setImgSize] = useState({ w: 225, h: 225 });
  const [cropBox, setCropBox] = useState({ width: 320, height: 320 });
  const [initialBox, setInitialBox] = useState({ width: 320, height: 320 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const [stickers, setStickers] = useState([]);
  const [activeStickerId, setActiveStickerId] = useState(null);

  const [activeDrawTool, setActiveDrawTool] = useState('sharpie');
  const [drawColor, setDrawColor] = useState("#FF0000");
  const [drawWidth, setDrawWidth] = useState(4);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [showLineWidthDropdown, setShowLineWidthDropdown] = useState(false);
  const [drawLines, setDrawLines] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [textInputVal, setTextInputVal] = useState("");
  const [textPosition, setTextPosition] = useState(null);

  const [activeFrame, setActiveFrame] = useState('none');
  const [frameColor, setFrameColor] = useState('#FFFFFF');
  const [frameSize, setFrameSize] = useState(3);
  const [frameOffset1, setFrameOffset1] = useState(25);
  const [frameOffset2, setFrameOffset2] = useState(13);
  const [frameRadius, setFrameRadius] = useState(0);
  const [frameAmount, setFrameAmount] = useState(2);
  const [showFrameColorPicker, setShowFrameColorPicker] = useState(false);

  const [censures, setCensures] = useState([]);
  const [activeCensureId, setActiveCensureId] = useState(null);

  const [resizeWidth, setResizeWidth] = useState(800);
  const [resizeHeight, setResizeHeight] = useState(800);
  const [keepRatio, setKeepRatio] = useState(true);

  const containerRef = useRef(null);
  const drawCanvasRef = useRef(null);

  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      const fullUrl = getFullImageUrl(imageUrl);
      if (!fullUrl.startsWith("blob:") && !fullUrl.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => {
        const naturalWidth = img.naturalWidth || 225;
        const naturalHeight = img.naturalHeight || 225;
        setImgSize({ w: naturalWidth, h: naturalHeight });
        setResizeWidth(naturalWidth);
        setResizeHeight(naturalHeight);
        
        let boxWidth = 320;
        let boxHeight = 320;
        const aspectRatio = naturalWidth / naturalHeight;
        
        if (aspectRatio > 1) {
          boxWidth = 320;
          boxHeight = 320 / aspectRatio;
        } else {
          boxHeight = 320;
          boxWidth = 320 * aspectRatio;
        }
        
        setCropBox({ width: boxWidth, height: boxHeight });
        setInitialBox({ width: boxWidth, height: boxHeight });
      };
      img.src = fullUrl;
    }
  }, [imageUrl]);

  useEffect(() => {
    if (imgSize.w && initialBox.width) {
      const scaleFactor = imgSize.w / initialBox.width;
      setResizeWidth(Math.round(cropBox.width * scaleFactor));
      setResizeHeight(Math.round(cropBox.height * scaleFactor));
    }
  }, [cropBox.width, cropBox.height, imgSize.w, initialBox.width]);

  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawLines.forEach(line => {
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (line.type === 'eraser') {
        ctx.strokeStyle = '#F9F9F8';
      }

      if (line.type === 'sharpie' || line.type === 'path' || line.type === 'eraser') {
        line.points.forEach((pt, index) => {
          if (index === 0) {
            ctx.moveTo(pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        });
        ctx.stroke();
      } else if (line.type === 'line' && line.points.length >= 2) {
        ctx.moveTo(line.points[0].x, line.points[0].y);
        ctx.lineTo(line.points[1].x, line.points[1].y);
        ctx.stroke();
      } else if (line.type === 'arrow' && line.points.length >= 2) {
        const from = line.points[0];
        const to = line.points[1];
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();

        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - 10 * Math.cos(angle - Math.PI / 6), to.y - 10 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(to.x - 10 * Math.cos(angle + Math.PI / 6), to.y - 10 * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = line.color;
        ctx.fill();
      } else if (line.type === 'rectangle' && line.points.length >= 2) {
        const x = line.points[0].x;
        const y = line.points[0].y;
        const w = line.points[1].x - x;
        const h = line.points[1].y - y;
        ctx.strokeRect(x, y, w, h);
      } else if (line.type === 'ellipse' && line.points.length >= 2) {
        const x = line.points[0].x;
        const y = line.points[0].y;
        const w = Math.abs(line.points[1].x - x);
        const h = Math.abs(line.points[1].y - y);
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (line.type === 'text' && line.textVal) {
        ctx.fillStyle = line.color;
        ctx.font = `${line.width * 4}px Arial`;
        ctx.fillText(line.textVal, line.points[0].x, line.points[0].y);
      }
    });
  }, [drawLines, activeTab, cropBox]);

  const handleRotate90 = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFlipH = () => {
    setFlipH(!flipH);
  };

  const handleFlipV = () => {
    setFlipV(!flipV);
  };

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setActiveFilter('none');
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
    setScaleVal(1);
    setPosition({ x: 0, y: 0 });
    setCropBox({ width: initialBox.width, height: initialBox.height });
    setStickers([]);
    setDrawLines([]);
    setActiveFrame('none');
    setCensures([]);
  };

  const handleZoomIn = () => {
    setScaleVal(prev => Math.min(2.5, prev + 0.05));
  };

  const handleZoomOut = () => {
    setScaleVal(prev => Math.max(0.5, prev - 0.05));
  };

  const handleImageMouseDown = (e) => {
    if (activeTab === 'draw') return; 
    if (e.button !== 0) return;
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;

    e.preventDefault();
    setIsDraggingImage(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...position };

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setPosition({
        x: startPos.x + deltaX,
        y: startPos.y + deltaY
      });
    };

    const handleMouseUp = () => {
      setIsDraggingImage(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCornerMouseDown = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = cropBox.width;
    const startHeight = cropBox.height;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (corner === 'br') {
        newWidth = Math.max(60, startWidth + deltaX * 2);
        newHeight = Math.max(60, startHeight + deltaY * 2);
      } else if (corner === 'bl') {
        newWidth = Math.max(60, startWidth - deltaX * 2);
        newHeight = Math.max(60, startHeight + deltaY * 2);
      } else if (corner === 'tr') {
        newWidth = Math.max(60, startWidth + deltaX * 2);
        newHeight = Math.max(60, startHeight - deltaY * 2);
      } else if (corner === 'tl') {
        newWidth = Math.max(60, startWidth - deltaX * 2);
        newHeight = Math.max(60, startHeight - deltaY * 2);
      }

      newWidth = Math.min(newWidth, 420);
      newHeight = Math.min(newHeight, 380);

      setCropBox({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleStickerMouseDown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveStickerId(id);

    const sticker = stickers.find(s => s.id === id);
    if (!sticker) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startXOffset = sticker.x;
    const startYOffset = sticker.y;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setStickers(prev => prev.map(s => s.id === id ? {
        ...s,
        x: startXOffset + deltaX,
        y: startYOffset + deltaY
      } : s));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleAddSticker = (emoji) => {
    setStickers([...stickers, {
      id: Date.now(),
      emoji,
      x: 0,
      y: 0,
      size: 44
    }]);
  };

  const handleRemoveSticker = (id) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    setActiveStickerId(null);
  };

  const handleResizeSticker = (id, change) => {
    setStickers(prev => prev.map(s => s.id === id ? {
      ...s,
      size: Math.max(20, Math.min(150, s.size + change))
    } : s));
  };

  const handleDrawStart = (e) => {
    if (activeTab !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeDrawTool === 'text') {
      setTextPosition({ x, y });
      setTextInputVal("");
      return;
    }

    setIsDrawing(true);
    setDrawLines(prev => [...prev, { 
      type: activeDrawTool, 
      points: [{ x, y }], 
      color: drawColor, 
      width: drawWidth 
    }]);
  };

  const handleDrawMove = (e) => {
    if (!isDrawing || activeTab !== 'draw') return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDrawLines(prev => {
      const currentLine = prev[prev.length - 1];
      if (!currentLine) return prev;

      // Spreading the array alone doesn't clone currentLine itself — pushing
      // into currentLine.points mutated the SAME object still referenced by
      // the previous state array, silently breaking undo/equality checks
      // that assume state updates never mutate prior snapshots (#90 L2).
      const updatedLine = currentLine.type === 'sharpie' || currentLine.type === 'path' || currentLine.type === 'eraser'
        ? { ...currentLine, points: [...currentLine.points, { x, y }] }
        : { ...currentLine, points: [currentLine.points[0], { x, y }] };

      return [...prev.slice(0, -1), updatedLine];
    });
  };

  const handleDrawEnd = () => {
    setIsDrawing(false);
  };

  const handleAddText = () => {
    if (!textPosition) return;
    setDrawLines([...drawLines, {
      type: 'text',
      points: [textPosition],
      color: drawColor,
      width: drawWidth,
      textVal: textInputVal
    }]);
    setTextPosition(null);
    setTextInputVal("");
  };

  const handleAddCensure = () => {
    setCensures([...censures, {
      id: Date.now(),
      x: 0,
      y: 0,
      w: 80,
      h: 40
    }]);
  };

  const handleCensureMouseDown = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveCensureId(id);

    const censure = censures.find(c => c.id === id);
    if (!censure) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startXOffset = censure.x;
    const startYOffset = censure.y;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setCensures(prev => prev.map(c => c.id === id ? {
        ...c,
        x: startXOffset + deltaX,
        y: startYOffset + deltaY
      } : c));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeCensure = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    
    const censure = censures.find(c => c.id === id);
    if (!censure) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = censure.w;
    const startH = censure.h;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setCensures(prev => prev.map(c => c.id === id ? {
        ...c,
        w: Math.max(30, startW + deltaX * 2),
        h: Math.max(20, startH + deltaY * 2)
      } : c));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleRemoveCensure = (id) => {
    setCensures(prev => prev.filter(c => c.id !== id));
    setActiveCensureId(null);
  };

  const handleResizeWidthChange = (val) => {
    setResizeWidth(val);
    if (keepRatio && cropBox.width) {
      const ratio = cropBox.height / cropBox.width;
      setResizeHeight(Math.round(val * ratio));
    }
  };

  const handleResizeHeightChange = (val) => {
    setResizeHeight(val);
    if (keepRatio && cropBox.height) {
      const ratio = cropBox.width / cropBox.height;
      setResizeWidth(Math.round(val * ratio));
    }
  };

  const handleSaveTrigger = async () => {
    setIsSaving(true);
    try {
      const img = new Image();
      const fullUrl = getFullImageUrl(imageUrl);
      if (!fullUrl.startsWith("blob:") && !fullUrl.startsWith("data:")) {
        img.crossOrigin = "anonymous";
      }
      
      img.onload = () => {
        try {
          const finalCanvas = processCanvas({
            img,
            rotation,
            flipH,
            flipV,
            brightness,
            contrast,
            saturate,
            activeFilter,
            scaleVal,
            position,
            cropBox,
            initialBox,
            drawLines,
            censures,
            stickers,
            activeFrame,
            frameColor,
            frameSize,
            resizeWidth,
            resizeHeight
          });

          finalCanvas.toBlob(async (blob) => {
            if (!blob) {
              throw new Error("Canvas to Blob failed");
            }

            const file = new File([blob], "edited_image.jpg", { type: "image/jpeg" });
            const formData = new FormData();
            formData.append("video", file);

            try {
              const res = await apiService.post(`/posts/upload?brandId=${brandId}`, formData, {
                headers: {
                  "Content-Type": "multipart/form-data"
                }
              });
              const path = res.data.videoUrl;
              onSave(file, path);
            } catch (err) {
              console.error("Failed to upload edited image", err);
              onSave(null, null, { rotation, flipH, flipV, filter: activeFilter });
            } finally {
              setIsSaving(false);
              onClose();
            }
          }, "image/jpeg", 0.95);
        } catch (canvasErr) {
          console.error("Error processing canvas drawing", canvasErr);
          onSave(null, null, { rotation, flipH, flipV, filter: activeFilter });
          setIsSaving(false);
          onClose();
        }
      };

      img.onerror = (e) => {
        console.error("Image load error on canvas process", e);
        onSave(null, null, { rotation, flipH, flipV, filter: activeFilter });
        setIsSaving(false);
        onClose();
      };

      img.src = fullUrl;
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      onClose();
    }
  };

  return {
    activeTab, setActiveTab,
    adjustMode, setAdjustMode,
    rotation, setRotation,
    flipH, setFlipH,
    flipV, setFlipV,
    activeFilter, setActiveFilter,
    brightness, setBrightness,
    contrast, setContrast,
    saturate, setSaturate,
    scaleVal, setScaleVal,
    isSaving, setIsSaving,
    isDraggingImage,
    imgSize,
    cropBox,
    initialBox,
    position,
    stickers,
    activeStickerId, setActiveStickerId,
    activeDrawTool, setActiveDrawTool,
    drawColor, setDrawColor,
    drawWidth, setDrawWidth,
    showColorDropdown, setShowColorDropdown,
    showLineWidthDropdown, setShowLineWidthDropdown,
    drawLines,
    textInputVal, setTextInputVal,
    textPosition, setTextPosition,
    activeFrame, setActiveFrame,
    frameColor, setFrameColor,
    frameSize, setFrameSize,
    frameOffset1, setFrameOffset1,
    frameOffset2, setFrameOffset2,
    frameRadius, setFrameRadius,
    frameAmount, setFrameAmount,
    showFrameColorPicker, setShowFrameColorPicker,
    censures,
    activeCensureId, setActiveCensureId,
    resizeWidth,
    resizeHeight,
    keepRatio, setKeepRatio,
    containerRef,
    drawCanvasRef,
    
    // Handlers
    handleRotate90,
    handleFlipH,
    handleFlipV,
    handleReset,
    handleZoomIn,
    handleZoomOut,
    handleImageMouseDown,
    handleCornerMouseDown,
    handleStickerMouseDown,
    handleAddSticker,
    handleRemoveSticker,
    handleResizeSticker,
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
    handleAddText,
    handleAddCensure,
    handleCensureMouseDown,
    handleResizeCensure,
    handleRemoveCensure,
    handleResizeWidthChange,
    handleResizeHeightChange,
    handleSaveTrigger
  };
}
