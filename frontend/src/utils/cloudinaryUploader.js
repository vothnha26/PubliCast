/**
 * Cloudinary Resumable Uploader
 * Handles large file uploads by splitting them into chunks.
 * Supports resuming after network failure or page reload.
 */
class CloudinaryResumableUploader {
  constructor(cloudName, apiKey, folder, onProgress) {
    this.cloudName = cloudName;
    this.apiKey = apiKey;
    this.folder = folder;
    this.onProgress = onProgress;
    this.chunkSize = 6 * 1024 * 1024; // 6MB per chunk (Cloudinary min is 5MB)
    this.url = `https://api.cloudinary.com/v1_1/${this.cloudName}/auto/upload`;
  }

  /**
   * Upload a file in chunks.
   *
   * Cloudinary's signature is bound to the exact (timestamp, params) pair it
   * was signed for, and chunk continuity for a given X-Unique-Upload-Id is
   * tracked server-side against the signature/timestamp the session started
   * with. If the page reloads mid-upload and the caller fetches a brand-new
   * signature/timestamp but resumes from a stale byte offset, the resumed
   * chunks are sent under a session Cloudinary never started — so the
   * signature/timestamp used for chunk 0 must be persisted and reused for
   * every subsequent chunk of that same resumable session, not the fresh
   * ones the caller re-fetched after reload.
   */
  async upload(file, signature, timestamp) {
    const totalSize = file.size;
    const fileKey = `cld-resumable-${file.name}-${file.size}`;

    // Check for existing upload session in localStorage
    let startByte = 0;
    let uniqueId = localStorage.getItem(`${fileKey}-id`);
    let activeSignature = signature;
    let activeTimestamp = timestamp;

    if (!uniqueId) {
      uniqueId = `idx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(`${fileKey}-id`, uniqueId);
      localStorage.setItem(`${fileKey}-start`, "0");
      localStorage.setItem(`${fileKey}-signature`, signature);
      localStorage.setItem(`${fileKey}-timestamp`, String(timestamp));
    } else {
      startByte = parseInt(localStorage.getItem(`${fileKey}-start`) || "0");
      activeSignature = localStorage.getItem(`${fileKey}-signature`) || signature;
      activeTimestamp = localStorage.getItem(`${fileKey}-timestamp`) || timestamp;
      console.log(`Resuming upload for ${file.name} from byte ${startByte}`);
    }

    let lastResponse = null;

    while (startByte < totalSize) {
      const endByte = Math.min(startByte + this.chunkSize, totalSize);
      const chunk = file.slice(startByte, endByte);
      const contentRange = `bytes ${startByte}-${endByte - 1}/${totalSize}`;

      try {
        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('signature', activeSignature);
        formData.append('timestamp', activeTimestamp);
        formData.append('api_key', this.apiKey);
        formData.append('folder', this.folder);

        const response = await fetch(this.url, {
          method: 'POST',
          headers: {
            'X-Unique-Upload-Id': uniqueId,
            'Content-Range': contentRange
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || 'Chunk upload failed');
        }

        lastResponse = await response.json();
        
        // Update progress
        startByte = endByte;
        localStorage.setItem(`${fileKey}-start`, startByte.toString());
        
        const percent = Math.round((startByte / totalSize) * 100);
        if (this.onProgress) this.onProgress(percent, lastResponse);

      } catch (error) {
        console.error('Error uploading chunk:', error);
        throw error;
      }
    }

    // Success! Clear storage
    localStorage.removeItem(`${fileKey}-id`);
    localStorage.removeItem(`${fileKey}-start`);
    localStorage.removeItem(`${fileKey}-signature`);
    localStorage.removeItem(`${fileKey}-timestamp`);

    return lastResponse;
  }
}

export default CloudinaryResumableUploader;
