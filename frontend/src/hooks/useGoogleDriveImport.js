import { useState } from 'react';
import { toast } from 'sonner';
import { buildMediaUrl } from '@/utils/url';
import socialService from '../services/social.service';
import { usePostCreator } from '../context/PostCreatorContext';

/**
 * Custom hook managing the Google Drive import flow & post creator prefilling.
 * Conforms to Single Responsibility Principle (SRP).
 */
export function useGoogleDriveImport(activeBrand) {
  const [isImporting, setIsImporting] = useState(false);
  const { openPostCreator, setUploadedVideoPath, setVideoFileUrl, setIsUploadingVideo } = usePostCreator();

  const importFromDrive = async (date, hour, fileData) => {
    if (!activeBrand) return;

    const scheduledDate = new Date(date);
    scheduledDate.setHours(hour, 0, 0, 0);

    // 1. Open Post Creator immediately with loading/import state
    openPostCreator({
      defaultScheduledAt: scheduledDate,
      defaultVideoPath: fileData.name,
      isUploadingVideo: true
    });

    setIsImporting(true);
    toast.loading(`Importing "${fileData.name}" from Google Drive...`, { id: 'import-drive-toast' });

    // 2. Perform download in background without blocking modal
    try {
      const res = await socialService.downloadGoogleDriveFile(
        activeBrand.id,
        fileData.fileId,
        fileData.name
      );

      if (res.videoUrl) {
        toast.success(`Successfully imported "${fileData.name}"!`, { id: 'import-drive-toast' });

        const fullUrl = buildMediaUrl(res.videoUrl);

        // 3. Pre-fill files inside the open Post Creator modal
        setUploadedVideoPath(res.videoUrl);
        setVideoFileUrl(fullUrl);
        setIsUploadingVideo(false);
      } else {
        throw new Error("Invalid response received from import service");
      }
    } catch (err) {
      console.error(err);
      toast.error(`Import failed: ${err.message}`, { id: 'import-drive-toast' });
      // Reset state on error
      setUploadedVideoPath("");
      setVideoFileUrl("");
      setIsUploadingVideo(false);
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isImporting,
    importFromDrive
  };
}
