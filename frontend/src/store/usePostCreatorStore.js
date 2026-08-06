import { create } from 'zustand';
import { buildMediaUrl } from '../utils/url';
import apiService from '../services/api';

export const usePostCreatorStore = create((set, get) => ({
  isOpen: false,
  editingPost: null,
  templatePost: null,
  defaultScheduledAt: null,
  isLibrary: false,
  videoFile: null,
  videoFileUrl: "",
  isUploadingVideo: false,
  uploadedVideoPath: "",
  uploadedAssetsThisSession: [],
  postMedia: [], // Mảng chứa các đối tượng { file, previewUrl, path, caption } — ≥2 photos here auto-routes to a Facebook album server-side (facebook-post.service.js), no separate album-only flow needed
  videoSettings: null,
  postCreatorFormBackup: null,

  trackUploadedAsset: (url) => {
    if (!url || typeof url !== 'string') return;
    set((state) => {
      if (state.uploadedAssetsThisSession.includes(url)) return state;
      return { uploadedAssetsThisSession: [...state.uploadedAssetsThisSession, url] };
    });
  },

  clearTrackedAssets: () => set({ uploadedAssetsThisSession: [] }),

  setVideoFile: (val) => set({ videoFile: val }),
  setVideoFileUrl: (val) => set({ videoFileUrl: val }),
  setIsUploadingVideo: (val) => set({ isUploadingVideo: val }),
  setUploadedVideoPath: (val) => set({ uploadedVideoPath: val }),
  setPostMedia: (val) => set((state) => ({ postMedia: typeof val === 'function' ? val(state.postMedia) : val })),
  setVideoSettings: (val) => set({ videoSettings: val }),
  
  backupFormState: (formData) => {
    if (formData) {
      sessionStorage.setItem('postCreatorFormBackup', JSON.stringify(formData));
    }
    set({ postCreatorFormBackup: formData });
  },
  restoreFormState: () => {
    const backupStr = sessionStorage.getItem('postCreatorFormBackup');
    if (backupStr) {
      try {
        const backup = JSON.parse(backupStr);
        set({ postCreatorFormBackup: backup });
        return backup;
      } catch (err) {
        // Corrupt/truncated sessionStorage value would otherwise throw here
        // and fail PostCreator's mount entirely (#90 L4) — clear it and
        // start fresh instead.
        console.error('Failed to parse postCreatorFormBackup, clearing corrupt value:', err);
        sessionStorage.removeItem('postCreatorFormBackup');
      }
    }
    return null;
  },

  openPostCreator: (options = {}) => set((state) => ({
    editingPost: options.post || null,
    templatePost: options.template || null,
    defaultScheduledAt: options.defaultScheduledAt || null,
    defaultSocialAccountId: options.defaultSocialAccountId || options.socialAccountId || null,
    defaultSocialAccountIds: options.defaultSocialAccountIds || null,
    isLibrary: options.isLibrary || false,
    videoFile: null,
    videoFileUrl: options.defaultVideoUrl !== undefined ? options.defaultVideoUrl : state.videoFileUrl,
    uploadedVideoPath: options.defaultVideoPath !== undefined ? options.defaultVideoPath : state.uploadedVideoPath,
    isUploadingVideo: options.isUploadingVideo || false,
    uploadedAssetsThisSession: [],
    videoSettings: options.videoSettings !== undefined ? options.videoSettings : (options.post?.options?.videoSettings || state.videoSettings || null),
    postMedia: options.postMedia !== undefined ? options.postMedia : (
      options.post?.mediaUrls?.map(url => ({
        file: null,
        previewUrl: buildMediaUrl(url),
        path: url
      })) || options.template?.mediaUrls?.map(url => ({
        file: null,
        previewUrl: buildMediaUrl(url),
        path: url
      })) || []
    ),
    isOpen: true
  })),

  closePostCreatorTemporarily: () => set({
    isOpen: false
  }),

  closePostCreator: () => {
    sessionStorage.removeItem('postCreatorFormBackup');
    
    const { uploadedAssetsThisSession } = get();

    // Rollback uncommitted uploads asynchronously in background without blocking UI
    if (uploadedAssetsThisSession && uploadedAssetsThisSession.length > 0) {
      const assetsToDelete = [...uploadedAssetsThisSession];
      Promise.allSettled(
        assetsToDelete.map((url) =>
          apiService.delete('/posts/upload', { data: { url } }).catch((err) => {
            console.warn('[Rollback] Failed to delete unused asset:', url, err);
          })
        )
      );
    }

    set({
      editingPost: null,
      templatePost: null,
      defaultScheduledAt: null,
      defaultSocialAccountId: null,
      defaultSocialAccountIds: null,
      isLibrary: false,
      videoFile: null,
      videoFileUrl: "",
      uploadedVideoPath: "",
      isUploadingVideo: false,
      uploadedAssetsThisSession: [],
      videoSettings: null,
      postCreatorFormBackup: null,
      postMedia: [],
      isOpen: false
    });
  }
}));
