const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
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
  async processVideo({ videoUrl, startTime, endTime, aspectRatio, keyframes, audioUrl, audioVolume = 50, brandId = 'unassigned' }) {
    console.log(`[VideoProcessorFacade] Starting process: videoUrl=${videoUrl}, trim=${startTime}s-${endTime}s, aspectRatio=${aspectRatio}, keyframesCount=${keyframes?.length || 0}`);
    
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const localInputPath = path.join(tempDir, `${uniqueId}-input.mp4`);
    const localOutputPath = path.join(tempDir, `${uniqueId}-output.mp4`);
    const localAudioPath = audioUrl ? path.join(tempDir, `${uniqueId}-audio.mp3`) : null;

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
        audioVolume
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
      this._cleanupFiles([localInputPath, localOutputPath, localAudioPath]);
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

  _executeFfmpeg({ inputPath, outputPath, startTime, endTime, aspectRatio, keyframes, audioPath, audioVolume }) {
    return new Promise((resolve, reject) => {
      let cmd = '';
      const duration = endTime - startTime;
      const volCoef = (audioVolume / 100).toFixed(2);

      // Xác định filter crop
      let cropFilter = '';
      if (aspectRatio && aspectRatio !== 'original') {
        const cropXExpr = this._buildFfmpegCropXExpr(keyframes);
        const escapedCropXExpr = cropXExpr.split(',').join('\\,');
        if (aspectRatio === '1:1') {
          cropFilter = `crop=min(iw\\,ih):min(iw\\,ih):(iw-ow)*(${escapedCropXExpr}):(ih-oh)/2`;
        } else if (aspectRatio === '9:16') {
          cropFilter = `crop=min(iw\\,ih*9/16):min(iw*16/9\\,ih):(iw-ow)*(${escapedCropXExpr}):(ih-oh)/2`;
        } else if (aspectRatio === '16:9') {
          cropFilter = `crop=min(iw\\,ih*16/9):min(iw*9/16\\,ih):(iw-ow)*(${escapedCropXExpr}):(ih-oh)/2`;
        }
      }

      if (audioPath) {
        if (cropFilter) {
          cmd = `ffmpeg -y -ss ${startTime} -t ${duration} -i "${inputPath}" -i "${audioPath}" -filter_complex "[0:v]${cropFilter}[v];[1:a]volume=${volCoef}[a1];[0:a][a1]amix=inputs=2:duration=first[a]" -map "[v]" -map "[a]" -c:v libx264 -c:a aac -preset fast -crf 23 -strict experimental "${outputPath}"`;
        } else {
          cmd = `ffmpeg -y -ss ${startTime} -t ${duration} -i "${inputPath}" -i "${audioPath}" -filter_complex "[1:a]volume=${volCoef}[a1];[0:a][a1]amix=inputs=2:duration=first[a]" -map 0:v -map "[a]" -c:v libx264 -c:a aac -preset fast -crf 23 -strict experimental "${outputPath}"`;
        }
      } else {
        if (cropFilter) {
          cmd = `ffmpeg -y -ss ${startTime} -t ${duration} -i "${inputPath}" -vf "${cropFilter}" -c:v libx264 -c:a aac -preset fast -crf 23 -strict experimental "${outputPath}"`;
        } else {
          cmd = `ffmpeg -y -ss ${startTime} -t ${duration} -i "${inputPath}" -c:v libx264 -c:a aac -preset fast -crf 23 -strict experimental "${outputPath}"`;
        }
      }

      console.log(`[VideoProcessorFacade] Executing command: ${cmd}`);
      exec(cmd, (error, stdout, stderr) => {
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
