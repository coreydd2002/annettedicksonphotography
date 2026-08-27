import { getPublicPhotos } from "./_lib/db.js";

// Public, unauthenticated — the flat replacement for the old
// api/albums.js. Since a photo change is now an instant database write
// with no rebuild to trigger a cache purge, this Cache-Control header is
// the actual mechanism that balances "not hitting Postgres on every
// visitor" against "a fresh upload shows up reasonably quickly."
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const photos = await getPublicPhotos();
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=300",
    );
    return res.status(200).json({ photos });
  } catch (error) {
    console.error("photos: failed to read from database", error);
    return res.status(502).json({ error: "Failed to reach the database" });
  }
}
