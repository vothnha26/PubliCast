const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const axios = require('axios');
const { cloudinary } = require('../../../config/cloudinary');

class VideoProcessorFacade {
  /**
   * Main entry point to process video edits (Trim, Audio merge, and Crop Aspect Ratio with Keyframes)
   * @param {Object} params
   * @param {string} params.videoUrl - Input video URL (Cloudinary or local path)
   * @param {number} params.startTime - Trim start time in seconds
   * @param {number} params.endTime - Trim end time in seconds
   * @param {string} params.aspectRatio - Target aspect ratio ('original', '1:1', '9:16', '16:9')
   * @param {Array} params.keyframes - Crop dynamic position keyframes [{ time, cropX }]
   * @param {string} params.audioUrl - Selected audio track URL (optional)
   * @param {number} params.audioVolume - Volume for selected audio (0-100)
   * @param {string} params.brandId - Brand identifier for organization
   * @returns {Promise<string>} Output video URL (local path or Cloudinary URL)
   */
  async processVideo({ videoUrl, startTime, endTime, aspectRatio, keyframes, audioUrl, audioVolume = 50, textOverlays = [], subtitles = [], brandId = 'unassigned' }) {
    console.log(`[VideoProcessorFacade] Starting process: videoUrl=${videoUrl}, trim=${startTime}s-${endTime}s, aspectRatio=${aspectRatio}, keyframesCount=${keyframes?.length || 0}, textOverlaysCount=${textOverlays?.length || 0}`);

    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const localInputPath = path.join(tempDir, `${uniqueId}-input.mp4`);
    const localOutputPath = path.join(tempDir, `${uniqueId}-output.mp4`);
    const localAudioPath = audioUrl ? path.join(tempDir, `${uniqueId}-audio.mp3`) : null;
    const textFilePaths = [];

    try {
      // 1. Resolve source video path (Download if it is a remote URL)
      await this._resolveFile(videoUrl, localInputPath);

      // 2. Download audio if audio track is selected
      if (audioUrl) {
        await this._resolveFile(audioUrl, localAudioPath);
      }

      // 3. Execute FFmpeg command
      await this._executeFfmpeg({
        inputPath: localInputPath,
        outputPath: localOutputPath,
        startTime,
        endTime,
        aspectRatio,
        keyframes,
        audioPath: localAudioPath,
        audioVolume,
        textOverlays,
        subtitles,
        tempDir,
        uniqueId,
        textFilePaths
      });

      // 4. Handle output persistence
      const isCloudinary = process.env.UPLOAD_STORAGE === 'cloudinary';
      if (isCloudinary) {
        const cloudResult = await this._uploadToCloudinary(localOutputPath, brandId);
        return cloudResult.secure_url;
      } else {
        const destDir = path.join(process.cwd(), 'uploads', 'media', brandId);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        const finalDestPath = path.join(destDir, `${uniqueId}-edited.mp4`);
        fs.copyFileSync(localOutputPath, finalDestPath);
        return `/uploads/media/${brandId}/${uniqueId}-edited.mp4`;
      }
    } finally {
      // Cleanup temp files
      this._cleanupFiles([localInputPath, localOutputPath, localAudioPath, ...textFilePaths]);
    }
  }

  // ================= Private Helper Methods =================

  _buildFfmpegCropXExpr(keyframes) {
    if (!keyframes || keyframes.length === 0) return '0.5000';
    const sorted = [...keyframes].sort((a, b) => a.time - b.time);
    if (sorted.length === 1) return sorted[0].cropX.toFixed(4);

    // Xây dựng đệ quy
    const buildExpr = (index) => {
      if (index === sorted.length - 1) {
        return sorted[index].cropX.toFixed(4);
      }
      const current = sorted[index];
      const next = sorted[index + 1];
      const deltaT = next.time - current.time;
      const x0 = current.cropX.toFixed(4);

      if (deltaT <= 0.001) {
        return buildExpr(index + 1);
      }

      const slope = ((next.cropX - current.cropX) / deltaT).toFixed(4);
      const segmentExpr = `${x0}+(${slope})*(t-${current.time.toFixed(3)})`;
      
      return `if(lt(t,${next.time.toFixed(3)}),${segmentExpr},${buildExpr(index + 1)})`;
    };

    const firstTime = sorted[0].time;
    const baseExpr = buildExpr(0);
    if (firstTime > 0) {
      return `if(lt(t,${firstTime.toFixed(3)}),${sorted[0].cropX.toFixed(4)},${baseExpr})`;
    }
    return baseExpr;
  }

  async _resolveFile(fileSource, targetLocalPath) {
    if (fileSource.startsWith('http://') || fileSource.startsWith('https://')) {
      console.log(`[VideoProcessorFacade] Downloading remote file: ${fileSource} → ${targetLocalPath}`);
      const writer = fs.createWriteStream(targetLocalPath);
      const response = await axios({
        url: fileSource,
        method: 'GET',
        responseType: 'stream'
      });
      response.data.pipe(writer);
      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } else {
      // Local relative path: resolve absolute path
      const relativePath = fileSource.startsWith('/') ? fileSource.slice(1) : fileSource;
      const absoluteSourcePath = path.resolve(process.cwd(), relativePath);
      
      // Prevent Path Traversal by checking if the resolved path starts with the uploads directory
      const allowedDir = path.resolve(process.cwd(), 'uploads');
      if (!absoluteSourcePath.startsWith(allowedDir)) {
        throw new Error('Access denied: Local file path is outside the allowed directory.');
      }

      if (!fs.existsSync(absoluteSourcePath)) {
        throw new Error(`Local source file not found: ${absoluteSourcePath}`);
      }
      fs.copyFileSync(absoluteSourcePath, targetLocalPath);
    }
  }

  _buildVideoFilters({ aspectRatio, keyframes, textOverlays, subtitles, startTime, tempDir, uniqueId, textFilePaths }) {
    const filters = [];

    // 1. Crop & Scale Filter
    if (aspectRatio && aspectRatio !== 'original') {
      const cropXExpr = this._buildFfmpegCropXExpr(keyframes);
      const escapedCropXExpr = cropXExpr.split(',').join('\\,');
      if (aspectRatio === '1:1') {
        filters.push(`crop=min(iw\\,ih):min(iw\\,ih):(iw-ow)*(${escapedCropXExpr}):(ih-oh)/2`);
        filters.push('scale=720:720');
      } else if (aspectRatio === '9:16') {
        filters.push(`crop=min(iw\\,ih*9/16):min(iw*16/9\\,ih):(iw-ow)*(${escapedCropXExpr}):(ih-oh)/2`);
        filters.push('scale=720:1280');
      } else if (aspectRatio === '16:9') {
        filters.push(`crop=min(iw\\,ih*16/9):min(iw*9/16\\,ih):(iw-ow)*(${escapedCropXExpr}):(ih-oh)/2`);
        filters.push('scale=1280:720');
      }
    }

    // 2. Text Overlays (Tĩnh)
    if (Array.isArray(textOverlays)) {
      textOverlays.forEach((overlay, index) => {
        const text = String(overlay.text || '');
        if (!text) return;
        const color = this._sanitizeFfmpegColor(overlay.color);
        const size = this._sanitizeFfmpegNumber(overlay.size, 24);
        const x = this._sanitizeFfmpegNumber(overlay.x, 50);
        const y = this._sanitizeFfmpegNumber(overlay.y, 50);
        const textFilePath = this._writeDrawtextFile(tempDir, `${uniqueId}-overlay-${index}`, text);
        textFilePaths.push(textFilePath);
        const escapedPath = this._escapeFfmpegOptionValue(textFilePath);

        // Căn giữa tương đối theo phần trăm toạ độ
        filters.push(`drawtext=textfile='${escapedPath}':x=(w*${x}/100-tw/2):y=(h*${y}/100-th/2):fontcolor=${color}:fontsize=${size}`);
      });
    }

    // 3. Subtitles (Động theo thời gian)
    if (Array.isArray(subtitles)) {
      subtitles.forEach((sub, index) => {
        const text = String(sub.text || '');
        if (!text) return;

        // Thời gian hiển thị tương đối so với start time đã cắt (-ss ở input)
        const start = Math.max(0, sub.start - startTime);
        const end = Math.max(0, sub.end - startTime);
        const textFilePath = this._writeDrawtextFile(tempDir, `${uniqueId}-subtitle-${index}`, text);
        textFilePaths.push(textFilePath);
        const escapedPath = this._escapeFfmpegOptionValue(textFilePath);

        filters.push(`drawtext=textfile='${escapedPath}':x=(w-tw)/2:y=h-80:fontcolor=white:fontsize=22:box=1:boxcolor=black@0.6:boxborderw=6:enable='between(t,${start.toFixed(3)},${end.toFixed(3)})'`);
      });
    }

    return filters.join(',');
  }

  /**
   * Writes overlay/subtitle text to a server-generated temp file and points
   * drawtext at it via textfile= instead of interpolating the text directly
   * into the filter string via text=. This sidesteps ffmpeg's three-layer
   * filtergraph escaping (option value / filter description / shell) for
   * arbitrary user text entirely — the only thing that still needs escaping
   * is the file path itself, which is server-generated (uniqueId-based) and
   * never contains the characters that make that escaping hard.
   * See: https://ffmpeg.org/ffmpeg-filters.html#drawtext
   */
  _writeDrawtextFile(tempDir, name, text) {
    const filePath = path.join(tempDir, `${name}.txt`);
    fs.writeFileSync(filePath, text, 'utf8');
    return filePath;
  }

  /**
   * Escapes a filter option value per ffmpeg's filtergraph syntax. The
   * textfile= path is server-generated so it can never contain a single
   * quote, but on Windows it does contain a drive-letter colon (e.g.
   * "D:/...") — colon is the filter-option separator, so without escaping
   * it ffmpeg's parser stops reading the path at the first ':' and treats
   * the remainder as a bogus option name.
   * See: https://ffmpeg.org/ffmpeg-filters.html#Notes-on-filtergraph-escaping
   */
  _escapeFfmpegOptionValue(value) {
    return String(value).replace(/\\/g, '/').replace(/:/g, '\\:');
  }

  /**
   * fontcolor accepts an ffmpeg color name/spec, not free text — restrict to
   * a safe charset so it can't be used to break out of the filter option.
   */
  _sanitizeFfmpegColor(color) {
    if (typeof color !== 'string' || !/^[a-zA-Z0-9#@.]+$/.test(color)) return 'white';
    return color;
  }

  /**
   * Numeric filter options (fontsize, x%, y%) — reject anything that isn't
   * actually a finite number rather than interpolating arbitrary input.
   */
  _sanitizeFfmpegNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  _executeFfmpeg({ inputPath, outputPath, startTime, endTime, aspectRatio, keyframes, audioPath, audioVolume, textOverlays, subtitles, tempDir, uniqueId, textFilePaths }) {
    return new Promise((resolve, reject) => {
      const duration = endTime - startTime;
      const volCoef = (audioVolume / 100).toFixed(2);

      const videoFilterString = this._buildVideoFilters({ aspectRatio, keyframes, textOverlays, subtitles, startTime, tempDir, uniqueId, textFilePaths });
      const videoChain = videoFilterString ? `[0:v]${videoFilterString}[v]` : `[0:v]null[v]`;

      // Built as an argv array and run via execFile (no shell) instead of a
      // single interpolated string run via exec — user-controlled text
      // (textOverlays[].text, subtitles[].text) flows into videoChain, and a
      // shell would let a value like `"; rm -rf /; echo "` escape the
      // -filter_complex argument and execute as a separate command. With
      // execFile, each array element is passed to ffmpeg directly as one
      // argument; there's no shell to escape out of.
      let args;
      if (audioPath) {
        args = [
          '-y', '-ss', String(startTime), '-t', String(duration),
          '-i', inputPath, '-i', audioPath,
          '-filter_complex', `${videoChain};[1:a]volume=${volCoef}[a1];[0:a][a1]amix=inputs=2:duration=first[a]`,
          '-map', '[v]', '-map', '[a]',
          '-c:v', 'libx264', '-c:a', 'aac', '-preset', 'superfast', '-crf', '20', '-strict', 'experimental',
          outputPath
        ];
      } else {
        args = [
          '-y', '-ss', String(startTime), '-t', String(duration),
          '-i', inputPath,
          '-filter_complex', videoChain,
          '-map', '[v]', '-map', '0:a?',
          '-c:v', 'libx264', '-c:a', 'aac', '-preset', 'superfast', '-crf', '20', '-strict', 'experimental',
          outputPath
        ];
      }

      console.log(`[VideoProcessorFacade] Executing: ffmpeg ${args.join(' ')}`);
      execFile('ffmpeg', args, (error, stdout, stderr) => {
        if (error) {
          console.error(`[VideoProcessorFacade] FFmpeg execution error:`, stderr);
          reject(new Error(`FFmpeg failed to process video: ${error.message}`));
        } else {
          console.log(`[VideoProcessorFacade] FFmpeg processing complete.`);
          resolve();
        }
      });
    });
  }

  _uploadToCloudinary(filePath, brandId) {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        filePath,
        {
          folder: `publicast/videos/${brandId}`,
          resource_type: 'video',
          allowed_formats: ['mp4', 'mov', 'webm']
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });
  }

  _cleanupFiles(paths) {
    paths.forEach(p => {
      if (p && fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
          console.log(`[VideoProcessorFacade] Cleaned up temp file: ${p}`);
        } catch (err) {
          console.warn(`[VideoProcessorFacade] Failed to delete temp file ${p}: ${err.message}`);
        }
      }
    });
  }
}

module.exports = new VideoProcessorFacade();
