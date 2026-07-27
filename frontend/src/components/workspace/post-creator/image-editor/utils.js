import { buildMediaUrl } from "@/utils/url";

export const getFullImageUrl = (url) => {
  return buildMediaUrl(url);
};

export const processCanvas = ({
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
}) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get 2d context");
  }

  // 1. Calculate the scale factor from UI to natural resolution
  const scaleFactor = img.naturalWidth / initialBox.width;

  // 2. Set canvas size to match the viewport (cropBox) size in natural resolution
  canvas.width = cropBox.width * scaleFactor;
  canvas.height = cropBox.height * scaleFactor;

  // 3. Apply CSS-like filters directly to canvas context
  let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
  if (activeFilter === 'grayscale') filterString += ' grayscale(100%)';
  else if (activeFilter === 'sepia') filterString += ' sepia(100%)';
  else if (activeFilter === 'invert') filterString += ' invert(100%)';
  else if (activeFilter === 'blur') filterString += ' blur(2px)';
  else if (activeFilter === 'warm') filterString += ' sepia(30%) saturate(130%) hue-rotate(-10deg)';
  else if (activeFilter === 'cool') filterString += ' saturate(90%) hue-rotate(10deg) brightness(105%)';
  else if (activeFilter === 'dramatic') filterString += ' contrast(120%) brightness(90%)';
  ctx.filter = filterString;

  // 4. Translate, pan, rotate, flip, and zoom the main image
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.translate(position.x * scaleFactor, position.y * scaleFactor);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.scale(scaleVal, scaleVal);

  // Draw the main image centered at (0, 0)
  ctx.drawImage(
    img,
    -img.naturalWidth / 2,
    -img.naturalHeight / 2,
    img.naturalWidth,
    img.naturalHeight
  );

  // 5. Reset transform to draw overlays in canvas coordinate space
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = 'none';

  const ratioX = scaleFactor;
  const ratioY = scaleFactor;

  // 6. Draw Drawings
  drawLines.forEach(line => {
    ctx.beginPath();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width * ratioX;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    if (line.type === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (line.type === 'sharpie' || line.type === 'path' || line.type === 'eraser') {
      line.points.forEach((pt, index) => {
        const canvasPtX = pt.x * ratioX;
        const canvasPtY = pt.y * ratioY;
        if (index === 0) {
          ctx.moveTo(canvasPtX, canvasPtY);
        } else {
          ctx.lineTo(canvasPtX, canvasPtY);
        }
      });
      ctx.stroke();
    } else if (line.type === 'line' && line.points.length >= 2) {
      ctx.moveTo(line.points[0].x * ratioX, line.points[0].y * ratioY);
      ctx.lineTo(line.points[1].x * ratioX, line.points[1].y * ratioY);
      ctx.stroke();
    } else if (line.type === 'arrow' && line.points.length >= 2) {
      const fromX = line.points[0].x * ratioX;
      const fromY = line.points[0].y * ratioY;
      const toX = line.points[1].x * ratioX;
      const toY = line.points[1].y * ratioY;
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();

      const angle = Math.atan2(toY - fromY, toX - fromX);
      ctx.beginPath();
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - 10 * ratioX * Math.cos(angle - Math.PI / 6), toY - 10 * ratioY * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(toX - 10 * ratioX * Math.cos(angle + Math.PI / 6), toY - 10 * ratioY * Math.sin(angle + Math.PI / 6));
      ctx.closePath();
      ctx.fillStyle = line.color;
      ctx.fill();
    } else if (line.type === 'rectangle' && line.points.length >= 2) {
      const x = line.points[0].x * ratioX;
      const y = line.points[0].y * ratioY;
      const w = (line.points[1].x - line.points[0].x) * ratioX;
      const h = (line.points[1].y - line.points[0].y) * ratioY;
      ctx.strokeRect(x, y, w, h);
    } else if (line.type === 'ellipse' && line.points.length >= 2) {
      const x = line.points[0].x * ratioX;
      const y = line.points[0].y * ratioY;
      const w = Math.abs(line.points[1].x - line.points[0].x) * ratioX;
      const h = Math.abs(line.points[1].y - line.points[0].y) * ratioY;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (line.type === 'text' && line.textVal) {
      ctx.fillStyle = line.color;
      ctx.font = `${line.width * 4 * ratioX}px Arial`;
      ctx.fillText(line.textVal, line.points[0].x * ratioX, line.points[0].y * ratioY);
    }
  });

  // Restore default composite operation
  ctx.globalCompositeOperation = 'source-over';

  // 7. Draw Censures
  censures.forEach(c => {
    const canvasX = canvas.width / 2 + (c.x * ratioX) - (c.w * ratioX) / 2;
    const canvasY = canvas.height / 2 + (c.y * ratioY) - (c.h * ratioY) / 2;
    const canvasW = c.w * ratioX;
    const canvasH = c.h * ratioY;
    
    ctx.fillStyle = "rgba(0,0,0,0.95)";
    ctx.fillRect(canvasX, canvasY, canvasW, canvasH);
  });

  // 8. Draw Stickers
  stickers.forEach(s => {
    const canvasX = canvas.width / 2 + (s.x * ratioX);
    const canvasY = canvas.height / 2 + (s.y * ratioY);
    const canvasSize = s.size * ratioX;
    
    ctx.font = `${canvasSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(s.emoji, canvasX, canvasY);
  });

  // 9. Draw Frames
  if (activeFrame !== 'none') {
    ctx.strokeStyle = frameColor;
    const borderWidth = (canvas.width * (frameSize / 100));
    ctx.lineWidth = borderWidth;
    
    if (activeFrame === 'mat' || activeFrame === 'classic' || activeFrame === 'line') {
      ctx.strokeRect(borderWidth / 2, borderWidth / 2, canvas.width - borderWidth, canvas.height - borderWidth);
    } else if (activeFrame === 'dashed') {
      ctx.setLineDash([15 * ratioX, 10 * ratioX]);
      ctx.strokeRect(borderWidth / 2, borderWidth / 2, canvas.width - borderWidth, canvas.height - borderWidth);
    } else if (activeFrame === 'bevel') {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.strokeRect(borderWidth / 4, borderWidth / 4, canvas.width - borderWidth / 2, canvas.height - borderWidth / 2);
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.strokeRect(borderWidth * 0.75, borderWidth * 0.75, canvas.width - borderWidth * 1.5, canvas.height - borderWidth * 1.5);
    } else if (activeFrame === 'zebra') {
      ctx.lineWidth = borderWidth / 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(borderWidth / 6, borderWidth / 6, canvas.width - borderWidth / 3, canvas.height - borderWidth / 3);
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(borderWidth * 0.5, borderWidth * 0.5, canvas.width - borderWidth, canvas.height - borderWidth);
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(borderWidth * 0.83, borderWidth * 0.83, canvas.width - borderWidth * 1.66, canvas.height - borderWidth * 1.66);
    } else if (activeFrame === 'polaroid') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.beginPath();
      ctx.rect(borderWidth, borderWidth, canvas.width - borderWidth * 2, canvas.height - borderWidth * 3.5);
      ctx.clip();
      
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.translate(position.x * scaleFactor, position.y * scaleFactor);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.scale(scaleVal, scaleVal);
      
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2, img.naturalWidth, img.naturalHeight);
      ctx.restore();
    }
  }

  // 10. Final Resize
  let finalCanvas = canvas;
  if (resizeWidth !== canvas.width || resizeHeight !== canvas.height) {
    finalCanvas = document.createElement("canvas");
    finalCanvas.width = resizeWidth;
    finalCanvas.height = resizeHeight;
    const finalCtx = finalCanvas.getContext("2d");
    if (finalCtx) {
      finalCtx.drawImage(canvas, 0, 0, resizeWidth, resizeHeight);
    }
  }

  return finalCanvas;
};
