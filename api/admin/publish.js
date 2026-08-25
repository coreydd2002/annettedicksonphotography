import { del } from "@vercel/blob";
import { checkAuthHeader } from "../_lib/auth.js";
import { publishChanges } from "../_lib/db.js";
import { CATEGORY_KEYS } from "../../shared/categories.js";

const ASPECT_PATTERN = /^\d+ \/ \d+$/;

function isValidItem(item) {
  if (!item || typeof item !== "object") return false;
  if (item.id === undefined || item.id === null || item.id === "") return false;
  if (typeof item.albumId !== "string" || !item.albumId) return false;
  if (!CATEGORY_KEYS.has(item.category)) return false;
  if (typeof item.title !== "string" || !item.title.trim()) return false;
  if (typeof item.aspect !== "string" || !ASPECT_PATTERN.test(item.aspect)) return false;
  if (typeof item.src !== "string" || !item.src) return false;
  return true;
}

function isValidAlbum(album) {
  if (!album || typeof album !== "object") return false;
  if (typeof album.id !== "string" || !album.id) return false;
  if (typeof album.title !== "string" || !album.title.trim()) return false;
  if (!CATEGORY_KEYS.has(album.category)) return false;
  return true;
}

// The one action behind "Publish Changes". The client stages every add,
// delete, and reorder locally (see Admin.jsx) — this endpoint is the single
// point where that staged state actually becomes live, in one atomic
// database transaction (see publishChanges() in api/_lib/db.js). Photos'
// image files are already uploaded to Blob storage by the time this runs
// (client-direct uploads, see api/admin/blob-upload.js), so the payload
// here is just the final ordered items/albums lists, no image data.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkAuthHeader(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { items: submittedItems, albums: submittedAlbums } = req.body || {};
  if (!Array.isArray(submittedItems) || submittedItems.length === 0) {
    return res.status(400).json({ error: "items must be a non-empty array" });
  }
  if (!Array.isArray(submittedAlbums) || submittedAlbums.length === 0) {
    return res.status(400).json({ error: "albums must be a non-empty array" });
  }
  if (!submittedItems.every(isValidItem)) {
    return res
      .status(400)
      .json({ error: "One or more photos are missing required fields" });
  }
  if (!submittedAlbums.every(isValidAlbum)) {
    return res
      .status(400)
      .json({ error: "One or more albums are missing required fields" });
  }

  // Every photo must belong to a real, submitted album, and its (denormalized)
  // category must match that album's category — keeps the two tables from
  // drifting out of sync.
  const albumsById = new Map(submittedAlbums.map((album) => [album.id, album]));
  for (const item of submittedItems) {
    const album = albumsById.get(item.albumId);
    if (!album) {
      return res
        .status(400)
        .json({ error: `Photo "${item.title}" references an unknown album` });
    }
    if (album.category !== item.category) {
      return res.status(400).json({
        error: `Photo "${item.title}"'s category doesn't match its album "${album.title}"`,
      });
    }
  }

  // Every album must have at least one photo — an album that exists with
  // zero photos would render an empty page, so reject the publish rather
  // than let one slip through.
  const photoCountByAlbum = new Map();
  for (const item of submittedItems) {
    photoCountByAlbum.set(item.albumId, (photoCountByAlbum.get(item.albumId) || 0) + 1);
  }
  const emptyAlbum = submittedAlbums.find((album) => !photoCountByAlbum.get(album.id));
  if (emptyAlbum) {
    return res.status(400).json({
      error: `Album "${emptyAlbum.title}" has no photos — add one or remove the album before publishing.`,
    });
  }

  const finalAlbums = submittedAlbums.map((album) => ({
    id: album.id,
    title: album.title.trim(),
    category: album.category,
  }));

  const finalItems = submittedItems.map((item) => ({
    id: item.id,
    albumId: item.albumId,
    category: item.category,
    title: item.title.trim(),
    aspect: item.aspect,
    src: item.src,
  }));

  let removedPhotos;
  try {
    ({ removedPhotos } = await publishChanges({
      albums: finalAlbums,
      photos: finalItems,
    }));
  } catch (error) {
    console.error("publish: failed to write to database", error);
    return res.status(502).json({ error: "Failed to update the database" });
  }

  // Best-effort cleanup of removed photos' Blob files, AFTER the database
  // (the part visitors actually see) is already safely updated. A failure
  // here just leaves a harmless orphaned blob, not a broken site.
  if (removedPhotos.length > 0) {
    try {
      await del(removedPhotos.map((photo) => photo.src));
    } catch (error) {
      console.error("publish: failed to delete orphaned blobs", error);
    }
  }

  return res.status(200).json({ ok: true, items: finalItems, albums: finalAlbums });
}
