import { del } from "@vercel/blob";
import { checkAuthHeader } from "../../_lib/auth.js";
import { updatePhoto, deletePhoto } from "../../_lib/db.js";
import { CATEGORY_KEYS } from "../../../shared/categories.js";

// PATCH renames a photo and/or changes its category — fired immediately
// from the admin list's "..." row menu, no separate save step. DELETE
// removes one photo, best-effort cleaning up its now-orphaned Blob file
// afterward (a failure there just leaves a harmless orphaned blob, not a
// broken site, since the database — the part the public site reads — is
// already updated by the time that cleanup runs).
export default async function handler(req, res) {
  if (!checkAuthHeader(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  if (req.method === "PATCH") {
    const { category, title } = req.body || {};
    if (category === undefined && title === undefined) {
      return res.status(400).json({ error: "category or title is required" });
    }
    if (category !== undefined && !CATEGORY_KEYS.has(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }
    if (title !== undefined && (typeof title !== "string" || !title.trim())) {
      return res.status(400).json({ error: "title must be a non-empty string" });
    }

    try {
      const row = await updatePhoto(id, {
        category,
        title: title !== undefined ? title.trim() : undefined,
      });
      if (!row) return res.status(404).json({ error: "Photo not found" });
      return res.status(200).json(row);
    } catch (error) {
      console.error("admin/photos/[id]: failed to update", error);
      return res.status(502).json({ error: "Failed to update the database" });
    }
  }

  if (req.method === "DELETE") {
    let row;
    try {
      row = await deletePhoto(id);
    } catch (error) {
      console.error("admin/photos/[id]: failed to delete", error);
      return res.status(502).json({ error: "Failed to update the database" });
    }
    if (!row) return res.status(404).json({ error: "Photo not found" });

    try {
      await del(row.src);
    } catch (error) {
      console.error("admin/photos/[id]: failed to delete orphaned blob", error);
    }

    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
