class MediaLibraryFolderFilter {
  apply(where, queryParams) {
    const { folderId, search } = queryParams;
    
    // Nếu đang tìm kiếm, cho phép tìm kiếm trên toàn bộ thư viện (không lọc theo folderId)
    if (search && search.trim()) {
      return;
    }

    if (folderId === 'root' || !folderId) {
      where.folderId = null;
    } else if (folderId !== 'all') {
      where.folderId = folderId;
    }
  }
}

module.exports = MediaLibraryFolderFilter;
