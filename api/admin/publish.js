import { checkAuthHeader } from "../_lib/auth.js";
import { deleteFile, getFile, getManifest, putManifest } from "../_lib/github.js";

const CATEGORIES = new Set(["wedding", "portrait", "product"]);
const ASPECT_PATTERN = /^\d+ \/ \d+$/;

function isValidItem(item) {
  if (!item || typeof item !== "object") return false;
  if (item.id === undefined || item.id === null || item.id === "") return false;
  if (!CATEGORIES.has(item.category)) return false;
  if (typeof item.title !== "string" || !item.title.trim()) return false;
  if (typeof item.aspect !== "string" || !ASPECT_PATTERN.test(item.aspect)) return false;
  if (item.src !== undefined && typeof item.src !== "string") return false;
  return true;
}

// The one action behind "Save and Redeploy". The client stages every add,
// delete, and reorder locally (see Admin.jsx) — this endpoint is the single
// point where that staged state actually becomes the live manifest. New
// photos' image files are already committed by upload.js by the time this
// runs, so the payload here is just the final ordered item list, not image
// data — keeping it well under Vercel's request body limit no matter how
// many photos were staged in one sitting.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkAuthHeader(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { items: submittedItems } = req.body || {};
  if (!Array.isArray(submittedItems) || submittedItems.length === 0) {
    return res.status(400).json({ error: "items must be a non-empty array" });
  }
  if (!submittedItems.every(isValidItem)) {
    return res.status(400).json({ error: "One or more photos are missing required fields" });
  }

  let liveItems;
  let sha;
  try {
    ({ items: liveItems, sha } = await getManifest());
  } catch (error) {
    console.error("publish: failed to read manifest", error);
    return res.status(502).json({ error: "Failed to reach GitHub" });
  }

  const submittedIds = new Set(submittedItems.map((item) => String(item.id)));
  const removedItems = liveItems.filter((item) => !submittedIds.has(String(item.id)));

  const finalItems = submittedItems.map((item) => {
    const clean = {
      id: item.id,
      category: item.category,
      title: item.title.trim(),
      aspect: item.aspect,
    };
    if (item.src) clean.src = item.src;
    if (item.variant !== undefined) clean.variant = item.variant;
    return clean;
  });

  try {
    await putManifest(finalItems, sha, "Publish gallery changes");
  } catch (error) {
    console.error("publish: failed to update manifest", error);
    if (error.status === 409) {
      return res.status(409).json({
        error: "The gallery changed since you loaded it — please refresh and retry.",
      });
    }
    return res.status(502).json({ error: "Failed to update the gallery manifest" });
  }

  // Best-effort cleanup of removed photos' image files, AFTER the manifest
  // (the part visitors actually see) is already safely updated. A failure
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

  return res.status(200).json({ ok: true, items: finalItems });
}
