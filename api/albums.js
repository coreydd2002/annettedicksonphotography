import { getAlbumsWithCovers } from "./_lib/db.js";

// Public, unauthenticated — replaces the old build-time
// `import albums from "content/albums.json"` in Galleries.jsx. Since a
// publish is now an instant database write with no rebuild to trigger a
// cache purge, this Cache-Control header is the actual mechanism that
// balances "not hitting Postgres on every visitor" against "a fresh
// publish shows up reasonably quickly."
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const albums = await getAlbumsWithCovers();
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=300",
    );
    return res.status(200).json({ albums });
  } catch (error) {
    console.error("albums: failed to read from database", error);
    return res.status(502).json({ error: "Failed to reach the database" });
  }
}
