import { create } from 'zustand';
import { buildMediaUrl } from '../utils/url';

export const usePostCreatorStore = create((set) => ({
  isOpen: false,
  editingPost: null,
  templatePost: null,
  defaultScheduledAt: null,
  isLibrary: false,
  videoFile: null,
  videoFileUrl: "",
  isUploadingVideo: false,
  uploadedVideoPath: "",
  // State phục vụ Facebook Album
  albumMedia: [], // Mảng chứa các đối tượng { file, previewUrl, path, caption }
  postMedia: [], // Mảng chứa các đối tượng { file, previewUrl, path } for standard posts
  videoSettings: null,
  postCreatorFormBackup: null,

  setVideoFile: (val) => set({ videoFile: val }),
  setVideoFileUrl: (val) => set({ videoFileUrl: val }),
  setIsUploadingVideo: (val) => set({ isUploadingVideo: val }),
  setUploadedVideoPath: (val) => set({ uploadedVideoPath: val }),
  setAlbumMedia: (val) => set((state) => ({ albumMedia: typeof val === 'function' ? val(state.albumMedia) : val })),
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
    isLibrary: options.isLibrary || false,
    videoFile: null,
    videoFileUrl: options.defaultVideoUrl !== undefined ? options.defaultVideoUrl : state.videoFileUrl,
    uploadedVideoPath: options.defaultVideoPath !== undefined ? options.defaultVideoPath : state.uploadedVideoPath,
    isUploadingVideo: options.isUploadingVideo || false,
    videoSettings: options.videoSettings !== undefined ? options.videoSettings : (options.post?.options?.videoSettings || state.videoSettings || null),
    albumMedia: options.albumMedia !== undefined ? options.albumMedia : (options.post?.options?.albumMedia || options.template?.options?.albumMedia || []),
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
    set({
      editingPost: null,
      templatePost: null,
      defaultScheduledAt: null,
      isLibrary: false,
      videoFile: null,
      videoFileUrl: "",
      uploadedVideoPath: "",
      isUploadingVideo: false,
      videoSettings: null,
      postCreatorFormBackup: null,
      albumMedia: [],
      postMedia: [],
      isOpen: false
    });
  }
}));
