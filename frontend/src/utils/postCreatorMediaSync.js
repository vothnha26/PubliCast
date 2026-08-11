/**
 * A single File object can be shared across multiple slots at once — e.g.
 * the same image used for both the main composer and a per-network custom
 * slot — matched by fileKey (`${name}_${size}_${lastModified}`) since two
 * different item objects can wrap the same underlying File. Once that file
 * finishes uploading (whichever call site triggered it — upload-on-select
 * in the media modal, or the pending-file scan at Submit), every item
 * sharing its fileKey needs `.path` (and video width/height) written in so
 * downstream code that keys off `item.path` sees it everywhere the file was
 * placed, not just the slot the upload call happened to be attached to.
 *
 * Mutates matching items in place (mirrors the mutate-then-`setX([...state])`
 * pattern already used at the call sites) and returns nothing.
 */
export function syncUploadedPathToAllSlots({ fileKey, targetFile, uploadResult, postMedia, networkCustom }) {
  // Accepts either shape: uploadMediaFileWithMetadata's own result (`.url`)
  // from handleCreatePost's pending-scan, or usePostCreatorStore's
  // mediaUploads entry (`.path`) from upload-on-select — both call sites
  // pass their own result object straight through rather than remapping it
  // field-by-field first.
  const path = uploadResult?.url || uploadResult?.path;
  if (!path) return;

  const isMatch = (otherFile) => {
    if (!otherFile) return false;
    if (targetFile && otherFile === targetFile) return true;
    if (fileKey && otherFile.name) {
      return `${otherFile.name}_${otherFile.size}_${otherFile.lastModified}` === fileKey;
    }
    return false;
  };

  (postMedia || []).forEach(pm => {
    if (isMatch(pm.file)) {
      pm.path = path;
      if (uploadResult.width) pm.width = uploadResult.width;
      if (uploadResult.height) pm.height = uploadResult.height;
    }
  });

  Object.values(networkCustom || {}).forEach(entry => {
    const slots = [entry, ...(entry?.perAccount ? Object.values(entry.perAccount) : [])];
    slots.forEach(slot => {
      if (Array.isArray(slot?.mediaUrls)) {
        slot.mediaUrls.forEach(m => {
          if (typeof m === 'object' && isMatch(m.file)) {
            m.path = path;
            if (uploadResult.width) m.width = uploadResult.width;
            if (uploadResult.height) m.height = uploadResult.height;
          }
        });
      }
    });
  });
}

export function buildFileKey(file) {
  if (!file?.name) return null;
  return `${file.name}_${file.size}_${file.lastModified}`;
}
