import { apiV2 } from "./api";
import CloudinaryResumableUploader from "../utils/cloudinaryUploader";

/**
 * Upload a single File object to Cloudinary and register it in DB via /media/save-direct.
 *
 * @param {File} file - The file object to upload
 * @param {string} brandId - Active brand ID
 * @param {function} [onProgress] - Callback for upload percentage (0-100)
 * @returns {Promise<string>} The uploaded media URL from Cloudinary / backend
 */
export async function uploadMediaFile(file, brandId, onProgress) {
  const meta = await uploadMediaFileWithMetadata(file, brandId, onProgress);
  return meta.url;
}

/**
 * Same upload as uploadMediaFile, but also returns the video metadata
 * Cloudinary's own upload response already includes (width, height,
 * duration, frame rate, codec) — free, since Cloudinary analyzes every
 * video it receives regardless of whether the caller reads that part of
 * the response. No extra request, no server-side ffprobe pass needed for
 * anything that already went through this upload path.
 *
 * @returns {Promise<{url: string, width: number|null, height: number|null, duration: number|null, frameRate: number|null, codec: string|null}>}
 */
export async function uploadMediaFileWithMetadata(file, brandId, onProgress) {
  if (!file) throw new Error("No file provided for upload");
  const isVideo = file.type.startsWith('video/');
  const folder = isVideo ? 'publicast/videos' : 'publicast/images';

  // 1. Request upload signature from backend
  const sigData = await apiV2.get(`/media/signature?folder=${folder}`);
  const { signature, timestamp, apiKey, cloudName } = sigData;

  // 2. Direct upload to Cloudinary using resumable uploader
  const uploader = new CloudinaryResumableUploader(
    cloudName,
    apiKey,
    folder,
    (percent) => {
      if (typeof onProgress === 'function') {
        onProgress(percent);
      }
    }
  );

  const uploadData = await uploader.upload(file, signature, timestamp);

  // 3. Register uploaded media in backend DB
  const savedMedia = await apiV2.post("/media/save-direct", {
    brandId,
    fileInfo: uploadData,
    saveToLibrary: false
  });

  return {
    url: savedMedia?.url || uploadData.secure_url,
    width: uploadData.width ?? null,
    height: uploadData.height ?? null,
    duration: uploadData.duration ?? null,
    frameRate: uploadData.video?.frame_rate ?? null,
    codec: uploadData.video?.codec ?? null
  };
}
