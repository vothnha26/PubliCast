import apiService from "./api";

export async function uploadMediaFile(file, brandId, folderId = null) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("brandId", brandId);
  if (folderId) {
    formData.append("folderId", folderId);
  }

  const res = await apiService.post("/media/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    },
    timeout: 120000 // 120 seconds timeout for media uploads
  });

  return res.data.data;
}
