import { checkAuthHeader } from "../_lib/auth.js";
import { deleteFile, getFile, getManifest, putManifest } from "../_lib/github.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkAuthHeader(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.body || {};
  if (id === undefined || id === null || id === "") {
    return res.status(400).json({ error: "id is required" });
  }

  let items;
  let sha;
  try {
    ({ items, sha } = await getManifest());
  } catch (error) {
    console.error("delete: failed to read manifest", error);
    return res.status(502).json({ error: "Failed to reach GitHub" });
  }

  const index = items.findIndex((item) => String(item.id) === String(id));
  if (index === -1) {
    return res.status(404).json({ error: "Photo not found" });
  }

  const [entry] = items.splice(index, 1);

  if (entry.src) {
    const imagePath = `public${entry.src}`;
    try {
      const file = await getFile(imagePath);
      if (file) {
        await deleteFile({
          path: imagePath,
          sha: file.sha,
          message: `Remove gallery photo: ${entry.title}`,
        });
      }
    } catch (error) {
      console.error("delete: failed to delete image file", error);
      return res.status(502).json({ error: "Failed to delete the image from GitHub" });
    }
  }

  try {
    await putManifest(items, sha, `Update gallery manifest: remove ${entry.title}`);
  } catch (error) {
    console.error("delete: failed to update manifest", error);
    if (error.status === 409) {
      return res.status(409).json({
        error: "The gallery changed since you loaded it — please refresh and retry.",
      });
    }
    return res.status(502).json({ error: "Failed to update the gallery manifest" });
  }

  return res.status(200).json({ ok: true, deletedId: entry.id });
}
