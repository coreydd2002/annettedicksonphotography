import { checkAuthHeader } from "../_lib/auth.js";
import { getAllPhotosForAdmin, createPhotos } from "../_lib/db.js";
import { CATEGORY_KEYS } from "../../shared/categories.js";

const ASPECT_PATTERN = /^\d+ \/ \d+$/;

function isValidPhoto(photo) {
  if (!photo || typeof photo !== "object") return false;
  if (typeof photo.id !== "string" || !photo.id) return false;
  if (!CATEGORY_KEYS.has(photo.category)) return false;
  if (typeof photo.title !== "string" || !photo.title.trim()) return false;
  if (typeof photo.aspect !== "string" || !ASPECT_PATTERN.test(photo.aspect)) return false;
  if (typeof photo.src !== "string" || !photo.src) return false;
  return true;
}

// GET returns every photo for the admin dashboard's flat list. POST is
// called once per "Upload" click in the Add Photos panel, after the
// browser has already uploaded each file straight to Blob storage (see
// api/admin/blob-upload.js) — this endpoint only creates the database
// rows pointing at those already-uploaded files.
export default async function handler(req, res) {
  if (!checkAuthHeader(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "GET") {
    try {
      const items = await getAllPhotosForAdmin();
      return res.status(200).json({ items });
    } catch (error) {
      console.error("admin/photos: failed to read from database", error);
      return res.status(502).json({ error: "Failed to reach the database" });
    }
  }

  if (req.method === "POST") {
    const { photos: submittedPhotos } = req.body || {};
    if (!Array.isArray(submittedPhotos) || submittedPhotos.length === 0) {
      return res.status(400).json({ error: "photos must be a non-empty array" });
    }
    if (!submittedPhotos.every(isValidPhoto)) {
      return res
        .status(400)
        .json({ error: "One or more photos are missing required fields" });
    }

    const finalPhotos = submittedPhotos.map((photo) => ({
      id: photo.id,
      category: photo.category,
      title: photo.title.trim(),
      aspect: photo.aspect,
      src: photo.src,
    }));

    try {
      const items = await createPhotos(finalPhotos);
      return res.status(200).json({ items });
    } catch (error) {
      console.error("admin/photos: failed to write to database", error);
      return res.status(502).json({ error: "Failed to update the database" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
