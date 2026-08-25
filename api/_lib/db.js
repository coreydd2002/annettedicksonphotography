// Thin query layer over CockroachDB Serverless (Postgres wire-protocol
// compatible). This IS the persistence layer for albums/photos now — no
// more git commits, no more manifest files. Mirrors the shape of the old
// api/_lib/github.js (one small module, plain functions, no ORM) so the
// rest of the admin code barely had to change.
//
// Uses postgres.js rather than a Neon-specific driver, since CockroachDB
// isn't Neon — it's a separate database that happens to speak the same
// wire protocol, so a standard Postgres client is what's needed here.
// `max: 1` keeps each warm serverless function instance to a single
// connection, reused across invocations rather than opening a pool per
// request.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

// Everything the admin dashboard needs on load — same flat { items, albums }
// shape api/admin/list.js has always returned, so Admin.jsx needed no
// changes here. Photos come back ordered by position within each album;
// filtering a flat array by albumId preserves that relative order.
export async function getAllForAdmin() {
  const [albums, photos] = await Promise.all([
    sql`SELECT id, title, category FROM albums ORDER BY created_at ASC`,
    sql`
      SELECT id, album_id AS "albumId", category, title, aspect, src
      FROM photos
      ORDER BY album_id, "position" ASC
    `,
  ]);
  return { items: photos, albums };
}

// For the public Galleries page: every album plus its cover photo (lowest
// position) and photo count, computed here instead of client-side.
//
// Uses a LATERAL join (not DISTINCT ON) to fetch each album's first photo
// — DISTINCT ON is a Postgres extension CockroachDB doesn't implement,
// while LATERAL joins are supported.
export async function getAlbumsWithCovers() {
  const rows = await sql`
    SELECT
      a.id, a.title, a.category,
      cover.id AS cover_id, cover.src AS cover_src, cover.aspect AS cover_aspect,
      COALESCE(counts.photo_count, 0)::int AS photo_count
    FROM albums a
    LEFT JOIN LATERAL (
      SELECT id, src, aspect FROM photos
      WHERE album_id = a.id
      ORDER BY "position" ASC
      LIMIT 1
    ) cover ON true
    LEFT JOIN (
      SELECT album_id, COUNT(*) AS photo_count FROM photos GROUP BY album_id
    ) counts ON counts.album_id = a.id
    ORDER BY a.created_at ASC
  `;

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    coverPhoto: row.cover_id
      ? { id: row.cover_id, src: row.cover_src, aspect: row.cover_aspect }
      : null,
    photoCount: row.photo_count,
  }));
}

// For the public AlbumDetail page: one album plus its photos, in order.
export async function getAlbumBySlug(id) {
  const [albums, photos] = await Promise.all([
    sql`SELECT id, title, category FROM albums WHERE id = ${id}`,
    sql`
      SELECT id, category, title, aspect, src
      FROM photos
      WHERE album_id = ${id}
      ORDER BY "position" ASC
    `,
  ]);

  if (albums.length === 0) return null;
  return { album: albums[0], photos };
}

// The one action behind "Publish Changes" — replaces the old two-git-commit
// publish with a single atomic transaction. The admin always sends the full
// staged arrays (same full-replace semantics as the old JSON manifests), so
// this diffs against what's currently in the DB to find removed rows, then
// deletes/upserts everything inside one sql.begin() transaction. Position
// is recomputed from each photo's index within its album's slice of the
// submitted array, replacing "array order" as the ordering mechanism now
// that there's no array to order.
//
// Returns the photos that were removed (id + src) so the caller can clean
// up their now-orphaned Blob files — fetched before the transaction runs,
// since their rows won't exist to query afterward.
export async function publishChanges({ albums, photos }) {
  const submittedAlbumIds = new Set(albums.map((a) => a.id));
  const submittedPhotoIds = new Set(photos.map((p) => p.id));

  const [existingAlbums, existingPhotos] = await Promise.all([
    sql`SELECT id FROM albums`,
    sql`SELECT id, src FROM photos`,
  ]);

  const albumsToDelete = existingAlbums
    .map((row) => row.id)
    .filter((id) => !submittedAlbumIds.has(id));
  const removedPhotos = existingPhotos.filter(
    (row) => !submittedPhotoIds.has(row.id),
  );

  const positionByAlbum = new Map();
  const positionedPhotos = photos.map((p) => {
    const position = positionByAlbum.get(p.albumId) ?? 0;
    positionByAlbum.set(p.albumId, position + 1);
    return { ...p, position };
  });

  await sql.begin(async (tx) => {
    for (const photo of removedPhotos) {
      await tx`DELETE FROM photos WHERE id = ${photo.id}`;
    }
    for (const id of albumsToDelete) {
      await tx`DELETE FROM albums WHERE id = ${id}`;
    }
    for (const a of albums) {
      await tx`
        INSERT INTO albums (id, title, category, updated_at)
        VALUES (${a.id}, ${a.title}, ${a.category}, now())
        ON CONFLICT (id) DO UPDATE
          SET title = EXCLUDED.title,
              category = EXCLUDED.category,
              updated_at = now()
      `;
    }
    for (const p of positionedPhotos) {
      await tx`
        INSERT INTO photos (id, album_id, category, title, aspect, src, "position")
        VALUES (${p.id}, ${p.albumId}, ${p.category}, ${p.title}, ${p.aspect}, ${p.src}, ${p.position})
        ON CONFLICT (id) DO UPDATE
          SET album_id = EXCLUDED.album_id,
              category = EXCLUDED.category,
              title = EXCLUDED.title,
              aspect = EXCLUDED.aspect,
              src = EXCLUDED.src,
              "position" = EXCLUDED."position"
      `;
    }
  });

  return { removedPhotos };
}
