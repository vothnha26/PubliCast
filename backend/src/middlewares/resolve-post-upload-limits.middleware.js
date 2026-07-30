const prisma = require('../config/prisma');

// Fallback used only when the caller sends no ?targetPlatforms= or none of the
// listed platforms have a PlatformLimit row yet — mirrors the DB column
// defaults (schema.prisma PlatformLimit.maxFileSizeMb/allowedFormats) so
// behavior degrades to "same as before this middleware existed" rather than
// silently rejecting everything.
const FALLBACK_LIMIT = {
  maxFileSizeMb: 100,
  allowedFormats: ['mp4', 'mov', 'png', 'jpg', 'jpeg'],
};

/**
 * Runs before uploadForPost (multer) on POST /api/posts/upload. Reads
 * ?targetPlatforms=FACEBOOK,TIKTOK from the query string (not req.body —
 * multer hasn't parsed the multipart body yet at this point in the chain)
 * and resolves the STRICTEST limit across all listed platforms: the smallest
 * maxFileSizeMb and the intersection of allowedFormats. multer's own
 * limits.fileSize is a static per-instance ceiling and can't vary per
 * request, so this only narrows the ceiling further, after the file is
 * already on Cloudinary — see postController.uploadVideo for the actual
 * enforcement once the real uploaded size/format is known.
 */
const resolvePostUploadLimits = async (req, res, next) => {
  const raw = req.query.targetPlatforms;
  const platforms = raw ? String(raw).split(',').map((p) => p.trim().toUpperCase()).filter(Boolean) : [];

  if (platforms.length === 0) {
    req.postUploadLimits = FALLBACK_LIMIT;
    return next();
  }

  try {
    const rows = await prisma.platformLimit.findMany({
      where: { platform: { in: platforms } },
    });

    if (rows.length === 0) {
      req.postUploadLimits = FALLBACK_LIMIT;
      return next();
    }

    const maxFileSizeMb = Math.min(...rows.map((r) => r.maxFileSizeMb));

    // Intersection of allowedFormats across all matched rows — a format only
    // counts as allowed if every targeted platform's row permits it.
    const formatSets = rows.map((r) => new Set(r.allowedFormats.split(',').map((f) => f.trim().toLowerCase())));
    const allowedFormats = [...formatSets[0]].filter((fmt) => formatSets.every((set) => set.has(fmt)));

    req.postUploadLimits = {
      maxFileSizeMb,
      allowedFormats: allowedFormats.length > 0 ? allowedFormats : FALLBACK_LIMIT.allowedFormats,
    };
    next();
  } catch (err) {
    // Fail open to the fallback rather than blocking uploads on a DB hiccup —
    // postController.uploadVideo still enforces some limit either way.
    console.error('[resolvePostUploadLimits] Failed to load PlatformLimit rows:', err);
    req.postUploadLimits = FALLBACK_LIMIT;
    next();
  }
};

module.exports = resolvePostUploadLimits;
