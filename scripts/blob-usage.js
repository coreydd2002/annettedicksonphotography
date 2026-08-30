// One-off: reports the ACTUAL current size and file count of the Vercel
// Blob store, plus the largest files. Use this to sanity-check the Vercel
// dashboard, whose usage figure lags real deletions by hours.
//
//   node scripts/blob-usage.js
//
// Reads BLOB_READ_WRITE_TOKEN from .env.local (falls back to the ambient
// env, e.g. after `vercel env pull`).
import { readFileSync } from "node:fs";
import { list } from "@vercel/blob";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
      const match = line.match(/^\s*BLOB_READ_WRITE_TOKEN\s*=\s*(.+?)\s*$/);
      if (match) process.env.BLOB_READ_WRITE_TOKEN = match[1].replace(/^["']|["']$/g, "");
    }
  } catch {
    // no .env.local — rely on the ambient environment
  }
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set (checked .env.local and the environment).");
  process.exit(1);
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

let cursor;
let total = 0;
let count = 0;
const all = [];

do {
  const page = await list({ cursor, limit: 1000 });
  for (const blob of page.blobs) {
    total += blob.size;
    count += 1;
    all.push(blob);
  }
  cursor = page.cursor;
} while (cursor);

all.sort((a, b) => b.size - a.size);

console.log(`\nFiles:  ${count}`);
console.log(`Total:  ${mb(total)} MB  (${(total / 1024 / 1024 / 1024).toFixed(3)} GB)\n`);
console.log("Largest 20:");
for (const blob of all.slice(0, 20)) {
  console.log(`  ${mb(blob.size).padStart(8)} MB  ${blob.pathname}`);
}
