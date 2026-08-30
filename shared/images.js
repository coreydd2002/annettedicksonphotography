// Single source of truth for accepted image types and the per-photo size
// cap, shared by the admin frontend (src/pages/Admin/) and the Blob upload
// route (api/admin/blob-upload.js). Same "code, not data" reasoning as
// shared/categories.js — safe to import from both sides.

export const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const ALLOWED_CONTENT_TYPES = Object.keys(MIME_EXTENSIONS);

// This is the ceiling on the *input* file the admin selects, checked
// before the browser downscales it (see src/pages/Admin/resizeImage.js) —
// what actually lands in Blob is the ~1-2MB web-sized re-encode, not this.
// 20MB comfortably covers full-resolution camera JPEGs (typically 5-15MB)
// while still catching an accidentally-selected RAW/TIFF file, which would
// also be too large for the browser to decode reliably.
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
