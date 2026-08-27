// Thin query layer over CockroachDB Serverless (Postgres wire-protocol
// compatible). This IS the persistence layer for photos now — no more git
// commits, no more manifest files. Uses postgres.js rather than a
// Neon-specific driver, since CockroachDB isn't Neon — it's a separate
// database that happens to speak the same wire protocol, so a standard
// Postgres client is what's needed here. `max: 1` keeps each warm
// serverless function instance to a single connection, reused across
// invocations rather than opening a pool per request.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

// Everything the admin dashboard needs on load — every photo, newest first.
export async function getAllPhotosForAdmin() {
  return sql`
    SELECT id, category, title, aspect, src, created_at AS "createdAt"
    FROM photos
    ORDER BY created_at DESC
  `;
}

// For the public Galleries page — same flat shape, no admin-only fields.
export async function getPublicPhotos() {
  return sql`
    SELECT id, category, title, aspect, src
    FROM photos
    ORDER BY created_at DESC
  `;
}

// Inserts one row per statement rather than a single multi-row INSERT or
// transaction — now() is stable for the lifetime of a single statement in
// both Postgres and CockroachDB, so a batched insert would give every
// photo in one upload the identical created_at and make their relative
// order (the admin/public lists' newest-first sort) arbitrary. Running
// each INSERT separately gives each row a strictly increasing timestamp
// matching upload order.
//
// ON CONFLICT DO NOTHING makes retries safe: if a batch partially failed
// client-side (e.g. a network blip after 3 of 5 rows landed), re-POSTing
// the same 5 just skips the 3 that already exist instead of erroring.
export async function createPhotos(photos) {
  const created = [];
  for (const p of photos) {
    const [row] = await sql`
      INSERT INTO photos (id, category, title, aspect, src)
      VALUES (${p.id}, ${p.category}, ${p.title}, ${p.aspect}, ${p.src})
      ON CONFLICT (id) DO NOTHING
      RETURNING id, category, title, aspect, src, created_at AS "createdAt"
    `;
    if (row) created.push(row);
  }
  return created;
}

// Partial update — only touches whichever field(s) are actually provided.
export async function updatePhoto(id, { category, title }) {
  const [row] = await sql`
    UPDATE photos
    SET category = COALESCE(${category ?? null}, category),
        title = COALESCE(${title ?? null}, title)
    WHERE id = ${id}
    RETURNING id, category, title, aspect, src
  `;
  return row || null;
}

// RETURNING src in the same statement avoids a race between a separate
// SELECT and DELETE — the row's blob URL comes back atomically with its
// removal, for the caller to best-effort clean up in Blob storage.
export async function deletePhoto(id) {
  const [row] = await sql`DELETE FROM photos WHERE id = ${id} RETURNING src`;
  return row || null;
}
