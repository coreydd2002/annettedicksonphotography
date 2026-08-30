// One-off: backs up every row in `photos` to a timestamped JSON file,
// then empties the table. Run after the Blob store was wiped (Aug 2026),
// since every row's `src` now points at a deleted blob and renders as a
// broken placeholder on the public site.
//
//   node scripts/clear-photos.js
//
// The backup keeps the old titles / categories / order so the re-upload
// can be matched to how the galleries were organised. Reads DATABASE_URL
// from .env.local.
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const match = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/);
  if (match) process.env.DATABASE_URL = match[1].replace(/^["']|["']$/g, "");
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const rows = await sql`
  SELECT id, category, title, aspect, src, created_at AS "createdAt"
  FROM photos
  ORDER BY created_at
`;

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = new URL(`../db/photos-backup-${stamp}.json`, import.meta.url);
writeFileSync(backupPath, JSON.stringify(rows, null, 2));
console.log(`Backed up ${rows.length} rows -> db/photos-backup-${stamp}.json`);

const deleted = await sql`DELETE FROM photos`;
console.log(`Deleted ${deleted.count} rows.`);

const [{ count }] = await sql`SELECT count(*)::int AS count FROM photos`;
console.log(`Rows remaining: ${count}`);

await sql.end();
