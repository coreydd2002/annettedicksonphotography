import { getAlbumBySlug } from "../_lib/db.js";

// Public, unauthenticated — replaces the old build-time
// `import galleryItems from "content/gallery.json"` (filtered by albumId)
// in AlbumDetail.jsx. `req.query.id` is Vercel's own Functions routing
// resolving this file's [id] bracket segment — no framework required for
// that, it works the same in a plain Node Functions project as it does in
// Next.js.
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id } = req.query;

  try {
    const result = await getAlbumBySlug(id);
    if (!result) {
      return res.status(404).json({ error: "Album not found" });
    }
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=300",
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error("albums/[id]: failed to read from database", error);
    return res.status(502).json({ error: "Failed to reach the database" });
  }
}
