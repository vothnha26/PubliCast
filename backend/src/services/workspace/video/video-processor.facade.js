const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const axios = require('axios');
const { cloudinary } = require('../../../config/cloudinary');
const videoFilterPipeline = require('./video-filter.pipeline');
const { FFMPEG_DEFAULTS, VIDEO_FILE_CONFIG } = require('../../../constants/video-editor.constants');

class VideoProcessorFacade {
  /**
   * Main entry point to process video edits (Trim, Audio merge, Crop, Adjustments, Filters, Overlays, Subtitles, Resize)
   * @param {Object} params
   * @param {string} params.videoUrl - Input video URL (Cloudinary or local path)
   * @param {number} params.startTime - Trim start time in seconds
   * @param {number} params.endTime - Trim end time in seconds
   * @param {string} params.aspectRatio - Target aspect ratio ('original', '1:1', '9:16', '16:9')
   * @param {Array} params.keyframes - Crop dynamic position keyframes [{ time, cropX }]
   * @param {Object} params.adjustments - { brightness, contrast, saturation }
   * @param {string} params.filterPreset - Color preset filter ('none', 'grayscale', 'sepia', etc.)
   * @param {Object} params.resize - Custom target width/height { width, height }
   * @param {Array} params.textOverlays - Text and sticker overlays
   * @param {Array} params.subtitles - Timed subtitles
   * @param {string} params.audioUrl - Selected audio track URL (optional)
   * @param {number} params.audioVolume - Volume for selected audio (0-100)
   * @param {string} params.brandId - Brand identifier for organization
   * @returns {Promise<string>} Output video URL (local path or Cloudinary URL)
   */
  async processVideo({
    videoUrl,
    startTime,
    endTime,
    aspectRatio,
    keyframes,
    adjustments,
    filterPreset,
    resize,
    audioUrl,
    audioVolume = FFMPEG_DEFAULTS.DEFAULT_AUDIO_VOLUME,
    textOverlays = [],
    subtitles = [],
    brandId = VIDEO_FILE_CONFIG.DEFAULT_BRAND_ID
  }) {
    console.log(
      `[VideoProcessorFacade] Starting process: videoUrl=${videoUrl}, trim=${startTime}s-${endTime}s, aspectRatio=${aspectRatio}, filterPreset=${filterPreset}, keyframesCount=${keyframes?.length || 0}`
    );

    const tempDir = path.join(process.cwd(), 'uploads', VIDEO_FILE_CONFIG.TEMP_DIR);
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
        adjustments,
        filterPreset,
        resize,
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
        const destDir = path.join(process.cwd(), 'uploads', VIDEO_FILE_CONFIG.MEDIA_DIR, brandId);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        const finalDestPath = path.join(destDir, `${uniqueId}-${VIDEO_FILE_CONFIG.OUTPUT_PREFIX}.mp4`);
        fs.copyFileSync(localOutputPath, finalDestPath);
        return `/uploads/${VIDEO_FILE_CONFIG.MEDIA_DIR}/${brandId}/${uniqueId}-${VIDEO_FILE_CONFIG.OUTPUT_PREFIX}.mp4`;
      }
    } finally {
      // Cleanup temp files
      this._cleanupFiles([localInputPath, localOutputPath, localAudioPath, ...textFilePaths]);
    }
  }

  // ================= Private Helper Methods =================

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

  _executeFfmpeg({
    inputPath,
    outputPath,
    startTime,
    endTime,
    aspectRatio,
    keyframes,
    adjustments,
    filterPreset,
    resize,
    audioPath,
    audioVolume,
    textOverlays,
    subtitles,
    tempDir,
    uniqueId,
    textFilePaths
  }) {
    return new Promise((resolve, reject) => {
      const duration = endTime - startTime;
      const volCoef = (audioVolume / 100).toFixed(2);

      const videoFilterString = videoFilterPipeline.buildPipeline({
        aspectRatio,
        keyframes,
        adjustments,
        filterPreset,
        resize,
        textOverlays,
        subtitles,
        startTime,
        tempDir,
        uniqueId,
        textFilePaths
      });

      const videoChain = videoFilterString ? `[0:v]${videoFilterString}[v]` : `[0:v]null[v]`;

      let args;
      if (audioPath) {
        args = [
          '-y',
          '-ss',
          String(startTime),
          '-t',
          String(duration),
          '-i',
          inputPath,
          '-i',
          audioPath,
          '-filter_complex',
          `${videoChain};[1:a]volume=${volCoef}[a1];[0:a][a1]amix=inputs=2:duration=first[a]`,
          '-map',
          '[v]',
          '-map',
          '[a]',
          '-c:v',
          FFMPEG_DEFAULTS.VIDEO_CODEC,
          '-c:a',
          FFMPEG_DEFAULTS.AUDIO_CODEC,
          '-preset',
          FFMPEG_DEFAULTS.PRESET,
          '-crf',
          FFMPEG_DEFAULTS.CRF,
          '-strict',
          FFMPEG_DEFAULTS.STRICT,
          outputPath
        ];
      } else {
        args = [
          '-y',
          '-ss',
          String(startTime),
          '-t',
          String(duration),
          '-i',
          inputPath,
          '-filter_complex',
          videoChain,
          '-map',
          '[v]',
          '-map',
          '0:a?',
          '-c:v',
          FFMPEG_DEFAULTS.VIDEO_CODEC,
          '-c:a',
          FFMPEG_DEFAULTS.AUDIO_CODEC,
          '-preset',
          FFMPEG_DEFAULTS.PRESET,
          '-crf',
          FFMPEG_DEFAULTS.CRF,
          '-strict',
          FFMPEG_DEFAULTS.STRICT,
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

  _buildFfmpegCropXExpr(keyframes) {
    const CropScaleFilterStrategy = require('./strategies/crop-scale-filter.strategy');
    const cropStrategy = new CropScaleFilterStrategy();
    return cropStrategy._buildCropXExpr(keyframes);
  }

  _buildVideoFilters(options) {
    return videoFilterPipeline.buildPipeline(options);
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
    paths.forEach((p) => {
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
