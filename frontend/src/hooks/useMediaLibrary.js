import { useState, useEffect } from "react";
import { useFilters } from "./useFilters";
import { useDebounce } from "./useDebounce";
import apiService from "../services/api";
import { toast } from "sonner";
import CloudinaryResumableUploader from "../utils/cloudinaryUploader";
import { useBrand } from "../context/BrandContext";

export function useMediaLibrary() {
  const { filters, updateFilters, clearFilters, searchParamsString } = useFilters({
    view: "grid",
    search: "",
    type: "All",
    page: "1",
    limit: "20"
  });

  const { activeBrand } = useBrand();
  const [mediaData, setMediaData] = useState({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } });
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [detail, setDetail] = useState(null);
  const [dragging, setDragging] = useState(false);

  const view = filters.view || "grid";
  const typeFilter = filters.type || "All";
  const currentFolderId = filters.folderId || null;
  const [searchTerm, setSearchTerm] = useState(filters.search || "");
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (debouncedSearch !== undefined) {
      updateFilters({ search: debouncedSearch });
    }
  }, [debouncedSearch]);

  // Prevent page reload during upload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (uploading) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploading]);

  // Fetch Folders
  const fetchFolders = async () => {
    if (!activeBrand) return;
    setLoadingFolders(true);
    try {
      const res = await apiService.get(`/media-folders?brandId=${activeBrand.id}${currentFolderId ? `&parentId=${currentFolderId}` : ""}`);
      setFolders(res.data.data);
    } catch (err) {
      console.error("Failed to fetch folders", err);
    } finally {
      setLoadingFolders(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [activeBrand, currentFolderId]);

  // Fetch real data from Backend
  const fetchMedia = async () => {
    if (!activeBrand) return;
    setLoading(true);
    try {
      const response = await apiService.get(`/media?brandId=${activeBrand.id}&${searchParamsString}`);
      setMediaData(response.data);
    } catch (error) {
      toast.error(error.message || "Failed to load media files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [searchParamsString, activeBrand]);

  const createFolder = async (name) => {
    if (!activeBrand) return;
    try {
      await apiService.post("/media-folders", {
        name,
        brandId: activeBrand.id,
        parentId: currentFolderId
      });
      toast.success("Folder created successfully");
      fetchFolders();
    } catch (error) {
      toast.error(error.message || "Failed to create folder");
    }
  };

  const uploadFiles = async (files) => {
    if (!activeBrand) {
      toast.error("Please select or create a Brand first");
      return;
    }
    setUploading(true);
    const toastId = toast.loading(`Preparing ${files.length} file(s)...`);

    try {
      for (const file of files) {
        // 1. Get signature from backend
        const isVideo = file.type.startsWith('video/');
        const folder = isVideo ? 'publicast/videos' : 'publicast/images';
        const sigRes = await apiService.get(`/media/signature?folder=${folder}`);
        const { signature, timestamp, apiKey, cloudName } = sigRes.data.data;

        toast.loading(`Uploading ${file.name}... 0%`, { id: toastId });

        // 2. Resumable Upload using chunks
        const uploader = new CloudinaryResumableUploader(
          cloudName, 
          apiKey, 
          folder, 
          (percent) => {
            toast.loading(`Uploading ${file.name}... ${percent}%`, { id: toastId });
          }
        );

        const uploadData = await uploader.upload(file, signature, timestamp);

        // 3. Save info to our backend
        await apiService.post("/media/save-direct", {
          brandId: activeBrand.id,
          folderId: currentFolderId,
          fileInfo: uploadData
        });
      }
      toast.success("All files uploaded successfully", { id: toastId });
      fetchMedia(); // Refresh list
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Upload failed";
      toast.error(errorMessage, { id: toastId });
      console.error("Upload error details:", error);
    } finally {
      setUploading(false);
      setDragging(false);
    }
  };

  const deleteFile = async (id) => {
    if (!activeBrand) return;
    try {
      await apiService.delete(`/media/${id}`, { data: { brandId: activeBrand.id } });
      toast.success("File deleted successfully");
      if (detail?.id === id) setDetail(null);
      await fetchMedia();
    } catch (error) {
      // Real backend errors surface here — e.g. 409 when the file is still
      // referenced by a Post, or 500 if Cloudinary deletion actually failed.
      // No optimistic pre-delete/rollback: the list only changes once we know
      // the delete truly succeeded.
      toast.error(error.message || "Delete failed");
    }
  };

  const deleteSelected = async () => {
    if (!activeBrand || selected.size === 0) return;
    const toastId = toast.loading(`Deleting ${selected.size} file(s)...`);
    const idsToDelete = Array.from(selected);
    const failures = [];

    for (const id of idsToDelete) {
      try {
        await apiService.delete(`/media/${id}`, { data: { brandId: activeBrand.id } });
      } catch (error) {
        failures.push({ id, message: error.message });
      }
    }

    if (failures.length === 0) {
      toast.success("Selected files deleted", { id: toastId });
    } else if (failures.length === idsToDelete.length) {
      toast.error(failures[0].message || "Failed to delete files", { id: toastId });
    } else {
      toast.error(`${failures.length}/${idsToDelete.length} files could not be deleted (still in use)`, { id: toastId });
    }

    setSelected(new Set());
    await fetchMedia();
  };

  const renameFile = async (id, newName) => {
    if (!activeBrand) return;
    try {
      // Optimistic UI update
      setMediaData(prev => ({
        ...prev,
        data: prev.data.map(item => item.id === id ? { ...item, name: newName } : item)
      }));
      if (detail && detail.id === id) {
        setDetail(prev => ({ ...prev, name: newName }));
      }
      
      await apiService.patch(`/media/${id}/rename`, {
        brandId: activeBrand.id,
        filename: newName
      });
      
      toast.success("File renamed successfully");
      await fetchMedia();
    } catch (error) {
      toast.error(error.message || "Rename failed");
      await fetchMedia();
    }
  };

  const filteredMedia = mediaData.data || [];
  const totalEntries = mediaData.meta?.total || 0;
  const totalPages = mediaData.meta?.totalPages || 1;
  const currentPage = mediaData.meta?.page || 1;

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  return {
    filters,
    updateFilters,
    clearFilters,
    view,
    typeFilter,
    searchTerm,
    setSearchTerm,
    mediaData,
    folders,
    loading,
    loadingFolders,
    uploading,
    selected,
    setSelected,
    toggleSelect,
    clearSelection,
    deleteSelected,
    deleteFile,
    renameFile,
    uploadFiles,
    createFolder,
    detail,
    setDetail,
    dragging,
    setDragging,
    filteredMedia,
    totalEntries,
    totalPages,
    currentPage
  };
}
