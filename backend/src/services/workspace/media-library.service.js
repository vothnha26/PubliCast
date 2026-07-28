const mediaLibraryRepository = require('../../repositories/workspace/media-library.repository');
const postRepository = require('../../repositories/workspace/post.repository');
const QueryPipeline = require('../../core/query-pipeline/query.pipeline');
const MediaLibrarySearchFilter = require('./media-library/filters/search.filter');
const MediaLibraryTypeFilter = require('./media-library/filters/type.filter');
const MediaLibraryUsedFilter = require('./media-library/filters/used.filter');
const MediaLibraryFolderFilter = require('./media-library/filters/folder.filter');
const { cloudinary } = require('../../config/cloudinary');
const fs = require('fs/promises');
const path = require('path');

const ALLOWED_SORT_FIELDS = ['createdAt', 'filename', 'sizeBytes'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

class MediaLibraryService {
  constructor() {
    this.queryPipeline = new QueryPipeline([
      new MediaLibrarySearchFilter(),
      new MediaLibraryTypeFilter(),
      new MediaLibraryUsedFilter(),
      new MediaLibraryFolderFilter()
    ]);
  }

  /**
   * Get filtered media files
   */
  async getMediaFiles(queryParams, brandId) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = queryParams;
    const { skip, take } = this._getPagination(page, limit);
    const order = this._getSortOrder(sortBy, sortOrder);

    const where = this.queryPipeline.apply({ brandId }, queryParams);
    const { files, total } = await mediaLibraryRepository.findManyAndCount(where, { skip, take, orderBy: order });

    return {
      data: files.map(f => this._formatMediaFile(f)),
      meta: { total, page: Math.max(1, parseInt(page) || 1), limit: take, totalPages: Math.ceil(total / take) }
    };
  }

  /**
   * Upload and save media file info
   */
  async uploadFile(file, brandId, userId, folderId = null) {
    await this._assertFolderBelongsToBrand(folderId, brandId);

    const isLocal = process.env.UPLOAD_STORAGE === 'local';
    const storageUrl = isLocal ? this._toPublicUploadUrl(file.path) : file.path;

    const media = await mediaLibraryRepository.create({
      brandId,
      uploadedByUserId: userId,
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageUrl,
      mediaId: isLocal ? file.filename : file.filename, // Cloudinary public_id or local filename
      folderId: folderId || null,
      uploadedAt: new Date()
    });

    return this._formatMediaFile(media);
  }

  /**
   * Delete media file and physical file.
   *
   * Order matters: the physical file (Cloudinary/local) is deleted FIRST, the
   * DB record only after that succeeds. If storage deletion fails, we throw
   * instead of swallowing the error — the alternative (delete DB row first)
   * silently orphans the storage file forever, since mediaId only lives on
   * the DB row we'd have already deleted.
   */
  async deleteMedia(id, brandId) {
    const media = await mediaLibraryRepository.findById(id);
    if (!media || media.brandId !== brandId) {
      throw new Error('Media file not found');
    }

    const referencingPosts = await postRepository.findMany(
      { brandId, mediaUrls: { contains: media.storageUrl } },
      { take: 5 }
    );
    if (referencingPosts.length > 0) {
      const error = new Error(
        `Không thể xóa: tệp này đang được dùng trong ${referencingPosts.length} bài viết. Vui lòng gỡ khỏi bài viết trước khi xóa.`
      );
      error.status = 409;
      error.referencingPosts = referencingPosts.map(p => ({ id: p.id, title: p.title, status: p.status }));
      throw error;
    }

    if (this._isLocalUploadUrl(media.storageUrl)) {
      try {
        const localPath = this._fromPublicUploadUrl(media.storageUrl);
        await fs.unlink(localPath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          const error = new Error(`Không thể xóa tệp vật lý: ${err.message}`);
          error.status = 500;
          throw error;
        }
        // ENOENT: the physical file is already gone — treat as already deleted.
      }
    } else {
      const resourceType = this._getResourceType(media.mimeType);
      let result;
      try {
        result = await cloudinary.uploader.destroy(media.mediaId, { resource_type: resourceType });
      } catch (err) {
        const error = new Error(`Không thể xóa tệp trên Cloudinary: ${err.message}`);
        error.status = 500;
        throw error;
      }
      // Cloudinary resolves with { result: 'not found' } instead of rejecting
      // when the resource doesn't exist — treat that the same as ENOENT above
      // (already gone), only a genuine failure result blocks the DB delete.
      if (result.result !== 'ok' && result.result !== 'not found') {
        const error = new Error(`Cloudinary từ chối xóa tệp: ${result.result}`);
        error.status = 500;
        throw error;
      }
    }

    await mediaLibraryRepository.delete(id);
    return { success: true };
  }

  /**
   * Save media info after direct upload to Cloudinary
   */
  async saveDirectMedia(fileInfo, brandId, userId, folderId = null, saveToLibrary = true) {
    if (saveToLibrary === false || saveToLibrary === 'false') {
      return this._formatUnsavedDirectMedia(fileInfo);
    }

    await this._assertFolderBelongsToBrand(folderId, brandId);

    const media = await mediaLibraryRepository.create({
      brandId,
      uploadedByUserId: userId,
      filename: fileInfo.original_filename || fileInfo.filename,
      mimeType: fileInfo.mimetype || `${fileInfo.resource_type}/${fileInfo.format}`,
      sizeBytes: fileInfo.bytes,
      storageUrl: fileInfo.secure_url,
      mediaId: fileInfo.public_id,
      folderId: folderId || null,
      width: fileInfo.width,
      height: fileInfo.height,
      durationSeconds: fileInfo.duration,
      uploadedAt: new Date()
    });

    return this._formatMediaFile(media);
  }

  _formatUnsavedDirectMedia(fileInfo) {
    const mimeType = fileInfo.mimetype || `${fileInfo.resource_type}/${fileInfo.format}`;
    let thumbnail = fileInfo.secure_url;

    if (fileInfo.secure_url && fileInfo.secure_url.includes('cloudinary.com')) {
      if (mimeType.startsWith('image/')) {
        thumbnail = fileInfo.secure_url.replace('/upload/', '/upload/c_thumb,w_200,g_face/');
      } else if (mimeType.startsWith('video/')) {
        thumbnail = fileInfo.secure_url.replace(/\.[^/.]+$/, ".jpg").replace('/upload/', '/upload/c_thumb,w_200,g_face,so_auto/');
      }
    }

    return {
      id: fileInfo.public_id || null,
      name: fileInfo.original_filename || fileInfo.filename || 'Direct Upload',
      type: this._getShortType(mimeType),
      size: this._formatBytes(fileInfo.bytes || 0),
      dim: fileInfo.width && fileInfo.height ? `${fileInfo.width}×${fileInfo.height}` : '—',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      used: false,
      url: fileInfo.secure_url,
      thumbnail: thumbnail,
      aspect: fileInfo.width && fileInfo.height ? `${fileInfo.width}/${fileInfo.height}` : '1/1',
      emoji: this._getEmoji(mimeType),
      duration: fileInfo.duration ? this._formatDuration(fileInfo.duration) : null
    };
  }

  /**
   * Rename media file
   */
  async renameMedia(id, brandId, filename) {
    const media = await mediaLibraryRepository.findById(id);
    if (!media || media.brandId !== brandId) {
      throw new Error('Media file not found');
    }
    const updated = await mediaLibraryRepository.update(id, { filename });
    return this._formatMediaFile(updated);
  }

  /**
   * Sync media usage status (isUsed) when post mediaUrls change or post is deleted.
   */
  async syncMediaUsage(brandId, addedUrls = [], removedUrls = [], client = undefined) {
    const prisma = require('../../config/prisma');
    const tx = client || prisma;

    if (addedUrls.length > 0) {
      const validAdded = addedUrls.filter(u => u && typeof u === 'string' && u.trim() !== '');
      if (validAdded.length > 0) {
        await mediaLibraryRepository.updateUsageByUrls(brandId, validAdded, true, tx);
      }
    }

    if (removedUrls.length > 0) {
      const postRepository = require('../../repositories/workspace/post.repository');
      const validRemoved = removedUrls.filter(u => u && typeof u === 'string' && u.trim() !== '');
      for (const url of validRemoved) {
        const postsUsingUrl = await postRepository.findMany(
          { brandId, mediaUrls: { contains: url } },
          { take: 1 }
        );
        if (postsUsingUrl.length === 0) {
          await mediaLibraryRepository.updateUsageByUrls(brandId, [url], false, tx);
        }
      }
    }
  }

  // ============= Private Helper Methods =============

  async _assertFolderBelongsToBrand(folderId, brandId) {
    if (!folderId) return;
    const mediaFolderRepository = require('../../repositories/workspace/media-folder.repository');
    const folder = await mediaFolderRepository.findById(folderId);
    if (!folder || folder.brandId !== brandId) {
      const error = new Error('Folder not found');
      error.status = 404;
      throw error;
    }
  }

  _getResourceType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'raw';
  }

  _getPagination(page, limit) {
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    return { skip: (safePage - 1) * safeLimit, take: safeLimit };
  }

  _getSortOrder(sortBy, sortOrder) {
    const safeSortBy = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const safeSortOrder = ALLOWED_SORT_ORDERS.includes(sortOrder) ? sortOrder : 'desc';
    return { [safeSortBy]: safeSortOrder };
  }

  _formatMediaFile(f) {
    let thumbnail = f.thumbnailUrl;
    
    // Auto-generate thumbnail for Cloudinary if missing
    if (!thumbnail && f.storageUrl.includes('cloudinary.com')) {
      if (f.mimeType.startsWith('image/')) {
        // For images, we can use the original URL or a transformed version
        thumbnail = f.storageUrl.replace('/upload/', '/upload/c_thumb,w_200,g_face/');
      } else if (f.mimeType.startsWith('video/')) {
        // For videos, Cloudinary can generate a jpg thumbnail by changing the extension
        thumbnail = f.storageUrl.replace(/\.[^/.]+$/, ".jpg").replace('/upload/', '/upload/c_thumb,w_200,g_face,so_auto/');
      }
    }

    return {
      id: f.id,
      name: f.filename,
      type: this._getShortType(f.mimeType),
      size: this._formatBytes(f.sizeBytes),
      dim: f.width && f.height ? `${f.width}×${f.height}` : '—',
      date: new Date(f.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      used: f.isUsed,
      url: f.storageUrl,
      thumbnail: thumbnail || f.storageUrl, // Fallback to storageUrl if still missing
      aspect: f.aspectRatio || '1/1',
      emoji: this._getEmoji(f.mimeType),
      duration: f.durationSeconds ? this._formatDuration(f.durationSeconds) : null
    };
  }

  _toPublicUploadUrl(filePath) {
    const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    return `/${relativePath}`;
  }

  _fromPublicUploadUrl(url) {
    const cleanUrl = url.split('?')[0].replace(/^\/+/, '');
    return path.join(process.cwd(), cleanUrl);
  }

  _isLocalUploadUrl(url) {
    return typeof url === 'string' && url.startsWith('/uploads/');
  }

  _getShortType(mime) {
    if (mime.includes('image')) return 'image';
    if (mime.includes('video')) return 'video';
    if (mime.includes('gif')) return 'gif';
    return 'file';
  }

  _getEmoji(mime) {
    if (mime.includes('video')) return '🎬';
    if (mime.includes('gif')) return '🎞️';
    return '🖼️';
  }

  _formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  _formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

module.exports = new MediaLibraryService();
