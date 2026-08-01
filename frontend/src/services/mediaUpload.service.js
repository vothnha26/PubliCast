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

  return savedMedia?.url || uploadData.secure_url;
}
