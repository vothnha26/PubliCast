import { buildMediaUrl } from "@/utils/url";

export const getFullImageUrl = (url) => {
  return buildMediaUrl(url);
};

export const getFinetuneFilterString = ({
  brightness = 100,
  contrast = 100,
  saturate = 100,
  adjustments = {},
  activeFilter = 'none'
}) => {
  const bAdj = (brightness - 100) + (adjustments.brightness || 0);
  const cAdj = (contrast - 100) + (adjustments.contrast || 0);
  const sAdj = (saturate - 100) + (adjustments.saturation || 0);

  const exp = adjustments.exposure || 0;
  const temp = adjustments.temperature || 0;
  const gamma = adjustments.gamma || 0;
  const clarity = adjustments.clarity || 0;

  const netBrightness = Math.max(10, 100 + bAdj * 2 + exp * 1.5 + gamma * 1.5 - clarity * 0.3);
  const netContrast = Math.max(10, 100 + cAdj * 2 + clarity * 2.5 - gamma * 1.2 + exp * 0.8);
  const netSaturate = Math.max(0, 100 + sAdj * 3 + clarity * 0.8);

  let filter = `brightness(${netBrightness}%) contrast(${netContrast}%) saturate(${netSaturate}%)`;

  if (temp > 0) {
    filter += ` sepia(${temp * 1.5}%) hue-rotate(${-temp * 0.6}deg) saturate(${100 + temp * 0.5}%)`;
  } else if (temp < 0) {
    const absTemp = Math.abs(temp);
    filter += ` hue-rotate(${absTemp * 0.8}deg) saturate(${100 + absTemp * 0.5}%) brightness(${100 + absTemp * 0.2}%)`;
  }

  if (activeFilter === 'grayscale' || activeFilter === 'mono') filter += ' grayscale(100%)';
  else if (activeFilter === 'noir') filter += ' grayscale(100%) contrast(150%) brightness(85%)';
  else if (activeFilter === 'stark') filter += ' grayscale(100%) contrast(200%)';
  else if (activeFilter === 'wash') filter += ' grayscale(100%) brightness(120%) contrast(80%)';
  else if (activeFilter === 'chrome') filter += ' saturate(160%) contrast(125%) brightness(105%)';
  else if (activeFilter === 'fade') filter += ' contrast(85%) brightness(110%) saturate(80%)';
  else if (activeFilter === 'cold') filter += ' saturate(90%) hue-rotate(15deg) brightness(105%)';
  else if (activeFilter === 'pastel') filter += ' saturate(70%) brightness(115%) contrast(90%)';
  else if (activeFilter === 'sepia') filter += ' sepia(100%)';
  else if (activeFilter === 'rust') filter += ' sepia(80%) saturate(140%) hue-rotate(-20deg)';
  else if (activeFilter === 'blues') filter += ' hue-rotate(180deg) sepia(30%) saturate(120%)';
  else if (activeFilter === 'invert') filter += ' invert(100%)';
  else if (activeFilter === 'blur') filter += ' blur(2px)';
  else if (activeFilter === 'warm') filter += ' sepia(35%) saturate(140%) hue-rotate(-10deg)';
  else if (activeFilter === 'cool') filter += ' saturate(90%) hue-rotate(10deg) brightness(105%)';
  else if (activeFilter === 'dramatic') filter += ' contrast(120%) brightness(90%)';

  return filter;
};

export const processCanvas = ({
  img,
  rotation,
  flipH,
  flipV,
  brightness,
  contrast,
  saturate,
  adjustments = {},
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
  frameOffset1,
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
  ctx.filter = getFinetuneFilterString({
    brightness,
    contrast,
    saturate,
    adjustments,
    activeFilter
  });

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

  // 6. Draw Vignette on canvas output if active
  if (adjustments.vignette && Math.abs(adjustments.vignette) > 0) {
    const vRadius = Math.max(canvas.width, canvas.height) / 1.2;
    const vGrad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, vRadius * 0.3,
      canvas.width / 2, canvas.height / 2, vRadius
    );
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, `rgba(0,0,0,${Math.min(0.9, Math.abs(adjustments.vignette) / 50)})`);
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

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
    ctx.strokeStyle = activeFrame === 'lumber' ? '#8B5A2B' : (frameColor || '#FFFFFF');
    const borderWidth = Math.max(2, (canvas.width * ((frameSize || 3) / 100)));
    const offsetPx = (canvas.width * ((frameOffset1 || 0) / 100));
    ctx.lineWidth = borderWidth;
    
    const fx = offsetPx + borderWidth / 2;
    const fy = offsetPx + borderWidth / 2;
    const fw = canvas.width - (offsetPx * 2) - borderWidth;
    const fh = canvas.height - (offsetPx * 2) - borderWidth;

    if (activeFrame === 'mat' || activeFrame === 'line' || activeFrame === 'lumber' || activeFrame === 'hook') {
      ctx.strokeRect(fx, fy, fw, fh);
    } else if (activeFrame === 'inset') {
      ctx.setLineDash([15 * ratioX, 10 * ratioX]);
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.setLineDash([]);
    } else if (activeFrame === 'bevel') {
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.strokeStyle = frameColor || "#FFFFFF";
      ctx.strokeRect(fx + borderWidth, fy + borderWidth, fw - borderWidth * 2, fh - borderWidth * 2);
    } else if (activeFrame === 'zebra') {
      ctx.lineWidth = borderWidth / 3;
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.strokeStyle = '#FFFFFF';
      ctx.strokeRect(fx + borderWidth / 3, fy + borderWidth / 3, fw - (borderWidth * 2 / 3), fh - (borderWidth * 2 / 3));
      ctx.strokeStyle = '#000000';
      ctx.strokeRect(fx + borderWidth * 2 / 3, fy + borderWidth * 2 / 3, fw - (borderWidth * 4 / 3), fh - (borderWidth * 4 / 3));
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

      ctx.filter = getFinetuneFilterString({
        brightness,
        contrast,
        saturate,
        adjustments,
        activeFilter
      });
      ctx.drawImage(
        img,
        -img.naturalWidth / 2,
        -img.naturalHeight / 2,
        img.naturalWidth,
        img.naturalHeight
      );
      ctx.restore();
    } else if (activeFrame === 'film') {
      const filmHeaderHeight = Math.max(12, borderWidth * 1.8);
      ctx.fillStyle = '#000000';
      // Top & Bottom film bars
      ctx.fillRect(0, 0, canvas.width, filmHeaderHeight);
      ctx.fillRect(0, canvas.height - filmHeaderHeight, canvas.width, filmHeaderHeight);

      // Draw film sprocket holes (hàng lỗ cuộn phim trắng)
      ctx.fillStyle = '#FFFFFF';
      const holeW = Math.max(4, filmHeaderHeight * 0.4);
      const holeH = Math.max(6, filmHeaderHeight * 0.5);
      const holeGap = holeW * 2.5;
      const topHoleY = (filmHeaderHeight - holeH) / 2;
      const botHoleY = canvas.height - filmHeaderHeight + (filmHeaderHeight - holeH) / 2;

      for (let x = holeW; x < canvas.width - holeW; x += holeGap) {
        ctx.fillRect(x, topHoleY, holeW, holeH);
        ctx.fillRect(x, botHoleY, holeW, holeH);
      }
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
