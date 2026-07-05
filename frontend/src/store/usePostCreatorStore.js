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

  setVideoFile: (val) => set({ videoFile: val }),
  setVideoFileUrl: (val) => set({ videoFileUrl: val }),
  setIsUploadingVideo: (val) => set({ isUploadingVideo: val }),
  setUploadedVideoPath: (val) => set({ uploadedVideoPath: val }),
  setAlbumMedia: (val) => set((state) => ({ albumMedia: typeof val === 'function' ? val(state.albumMedia) : val })),
  setPostMedia: (val) => set((state) => ({ postMedia: typeof val === 'function' ? val(state.postMedia) : val })),

  openPostCreator: (options = {}) => set({
    editingPost: options.post || null,
    templatePost: options.template || null,
    defaultScheduledAt: options.defaultScheduledAt || null,
    isLibrary: options.isLibrary || false,
    videoFile: null,
    videoFileUrl: options.defaultVideoUrl || "",
    uploadedVideoPath: options.defaultVideoPath || "",
    isUploadingVideo: options.isUploadingVideo || false,
    albumMedia: options.post?.options?.albumMedia || options.template?.options?.albumMedia || [],
    postMedia: options.post?.mediaUrls?.map(url => ({
      file: null,
      previewUrl: buildMediaUrl(url),
      path: url
    })) || options.template?.mediaUrls?.map(url => ({
      file: null,
      previewUrl: buildMediaUrl(url),
      path: url
    })) || [],
    isOpen: true
  }),

  closePostCreator: () => set({
    editingPost: null,
    templatePost: null,
    defaultScheduledAt: null,
    isLibrary: false,
    videoFile: null,
    videoFileUrl: "",
    uploadedVideoPath: "",
    isUploadingVideo: false,
    albumMedia: [],
    postMedia: [],
    isOpen: false
  })
}));
