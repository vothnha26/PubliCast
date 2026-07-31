import { apiV2 } from "./api";

class MediaService {
  async getMedia(brandId, paramsString = "") {
    return await apiV2.get(`/media?brandId=${brandId}&${paramsString}`);
  }

  async getFolders(brandId, parentId = null) {
    const query = parentId ? `&parentId=${parentId}` : "";
    return await apiV2.get(`/media-folders?brandId=${brandId}${query}`);
  }

  async createFolder(brandId, name, parentId = null) {
    return await apiV2.post("/media-folders", {
      name,
      brandId,
      parentId
    });
  }

  async getSignature(folder) {
    return await apiV2.get(`/media/signature?folder=${folder}`);
  }

  async saveDirect(brandId, folderId, fileInfo) {
    return await apiV2.post("/media/save-direct", {
      brandId,
      folderId,
      fileInfo
    });
  }

  async deleteFile(id, brandId) {
    return await apiV2.delete(`/media/${id}`, { data: { brandId } });
  }

  async renameFile(id, brandId, filename) {
    return await apiV2.patch(`/media/${id}/rename`, {
      brandId,
      filename
    });
  }
}

const mediaService = new MediaService();
export default mediaService;
