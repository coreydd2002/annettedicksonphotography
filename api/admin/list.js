import { checkAuthHeader } from "../_lib/auth.js";
import {
  ALBUMS_MANIFEST_PATH,
  GALLERY_MANIFEST_PATH,
  getManifest,
} from "../_lib/github.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkAuthHeader(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const [{ items }, { items: albums }] = await Promise.all([
      getManifest(GALLERY_MANIFEST_PATH),
      getManifest(ALBUMS_MANIFEST_PATH),
    ]);
    return res.status(200).json({ items, albums });
  } catch (error) {
    console.error("list: failed to read manifest", error);
    return res.status(502).json({ error: "Failed to reach GitHub" });
  }
}
