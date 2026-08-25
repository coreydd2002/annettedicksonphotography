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

// Vercel Blob has no meaningful size ceiling for photos (5TB max), so this
// is a product choice, not a platform workaround: comfortably covers
// full-resolution camera JPEGs (typically 5-15MB) while still catching an
// accidentally-selected RAW/TIFF file.
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
