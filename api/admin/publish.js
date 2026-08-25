import { checkAuthHeader } from "../_lib/auth.js";
import {
  ALBUMS_MANIFEST_PATH,
  GALLERY_MANIFEST_PATH,
  deleteFile,
  getFile,
  getManifest,
  putManifest,
} from "../_lib/github.js";
import { CATEGORY_KEYS } from "../../shared/categories.js";

const ASPECT_PATTERN = /^\d+ \/ \d+$/;

function isValidItem(item) {
  if (!item || typeof item !== "object") return false;
  if (item.id === undefined || item.id === null || item.id === "") return false;
  if (typeof item.albumId !== "string" || !item.albumId) return false;
  if (!CATEGORY_KEYS.has(item.category)) return false;
  if (typeof item.title !== "string" || !item.title.trim()) return false;
  if (typeof item.aspect !== "string" || !ASPECT_PATTERN.test(item.aspect)) return false;
  if (item.src !== undefined && typeof item.src !== "string") return false;
  return true;
}

function isValidAlbum(album) {
  if (!album || typeof album !== "object") return false;
  if (typeof album.id !== "string" || !album.id) return false;
  if (typeof album.title !== "string" || !album.title.trim()) return false;
  if (!CATEGORY_KEYS.has(album.category)) return false;
  return true;
}

// The one action behind "Save and Redeploy". The client stages every add,
// delete, and reorder locally (see Admin.jsx) — this endpoint is the single
// point where that staged state actually becomes the live manifests. New
// photos' image files are already committed by upload.js by the time this
// runs, so the payload here is just the final ordered items/albums lists,
// not image data.
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
  // category must match that album's category — keeps the two manifests from
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

  let liveItems;
  let gallerySha;
  let albumsSha;
  try {
    [{ items: liveItems, sha: gallerySha }, { sha: albumsSha }] = await Promise.all([
      getManifest(GALLERY_MANIFEST_PATH),
      getManifest(ALBUMS_MANIFEST_PATH),
    ]);
  } catch (error) {
    console.error("publish: failed to read manifest", error);
    return res.status(502).json({ error: "Failed to reach GitHub" });
  }

  const submittedIds = new Set(submittedItems.map((item) => String(item.id)));
  const removedItems = liveItems.filter((item) => !submittedIds.has(String(item.id)));

  const finalAlbums = submittedAlbums.map((album) => ({
    id: album.id,
    title: album.title.trim(),
    category: album.category,
  }));

  const finalItems = submittedItems.map((item) => {
    const clean = {
      id: item.id,
      albumId: item.albumId,
      category: item.category,
      title: item.title.trim(),
      aspect: item.aspect,
    };
    if (item.src) clean.src = item.src;
    if (item.variant !== undefined) clean.variant = item.variant;
    return clean;
  });

  // Write albums.json first: if only this write succeeds, the failure mode
  // is a harmless unused album (filtered out of Galleries automatically,
  // since nothing references it yet). Writing gallery.json first would risk
  // photos pointing at an album that doesn't exist yet, producing dead
  // /albums/:slug links — worse.
  try {
    await putManifest(
      finalAlbums,
      albumsSha,
      "Publish gallery changes",
      ALBUMS_MANIFEST_PATH,
    );
  } catch (error) {
    console.error("publish: failed to update albums manifest", error);
    if (error.status === 409) {
      return res.status(409).json({
        error: "The gallery changed since you loaded it — please refresh and retry.",
      });
    }
    return res.status(502).json({ error: "Failed to update the albums manifest" });
  }

  try {
    await putManifest(
      finalItems,
      gallerySha,
      "Publish gallery changes",
      GALLERY_MANIFEST_PATH,
    );
  } catch (error) {
    console.error("publish: failed to update gallery manifest", error);
    if (error.status === 409) {
      return res.status(409).json({
        error: "The gallery changed since you loaded it — please refresh and retry.",
      });
    }
    return res.status(502).json({ error: "Failed to update the gallery manifest" });
  }

  // Best-effort cleanup of removed photos' image files, AFTER both manifests
  // (the part visitors actually see) are already safely updated. A failure
  // here just leaves a harmless orphaned file, not a broken site.
  for (const item of removedItems) {
    if (!item.src) continue;
    const imagePath = `public${item.src}`;
    try {
      const file = await getFile(imagePath);
      if (file) {
        await deleteFile({
          path: imagePath,
          sha: file.sha,
          message: `Remove gallery photo: ${item.title}`,
        });
      }
    } catch (error) {
      console.error(`publish: failed to delete orphaned image ${imagePath}`, error);
    }
  }

  return res.status(200).json({ ok: true, items: finalItems, albums: finalAlbums });
}
