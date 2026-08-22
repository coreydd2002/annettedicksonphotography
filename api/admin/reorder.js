import { checkAuthHeader } from "../_lib/auth.js";
import { getManifest, putManifest } from "../_lib/github.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkAuthHeader(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return res.status(400).json({ error: "orderedIds must be a non-empty array" });
  }

  let items;
  let sha;
  try {
    ({ items, sha } = await getManifest());
  } catch (error) {
    console.error("reorder: failed to read manifest", error);
    return res.status(502).json({ error: "Failed to reach GitHub" });
  }

  // The client only sends the desired ORDER of ids — the server stays the
  // source of truth for the actual item data. Reject if the id set doesn't
  // exactly match the current manifest (e.g. someone else added/deleted a
  // photo since this admin session loaded its list).
  const currentIds = items.map((item) => String(item.id));
  const requestedIds = orderedIds.map(String);
  const sameSet =
    currentIds.length === requestedIds.length &&
    new Set(requestedIds).size === requestedIds.length &&
    requestedIds.every((id) => currentIds.includes(id));

  if (!sameSet) {
    return res.status(409).json({
      error: "The gallery changed since you loaded it — please refresh and retry.",
    });
  }

  const itemsById = new Map(items.map((item) => [String(item.id), item]));
  const reordered = requestedIds.map((id) => itemsById.get(id));

  try {
    await putManifest(reordered, sha, "Reorder gallery photos");
  } catch (error) {
    console.error("reorder: failed to update manifest", error);
    if (error.status === 409) {
      return res.status(409).json({
        error: "The gallery changed since you loaded it — please refresh and retry.",
      });
    }
    return res.status(502).json({ error: "Failed to update the gallery manifest" });
  }

  return res.status(200).json({ items: reordered });
}
