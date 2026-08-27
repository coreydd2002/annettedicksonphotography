-- Removes the album layer entirely. Every photo already carries its own
-- (denormalized) category, so nothing above photos is needed anymore: no
-- grouping, no manual ordering, no cover-crop focal point.
--
-- Run by hand against the live CockroachDB Serverless database:
--   psql "$DATABASE_URL" -f db/migrations/002_remove_albums.sql
-- Not executed by app code.
--
-- Deploy the new application code BEFORE running this migration, not
-- after — the new code's reads only select columns that already exist
-- pre-migration, so it works unchanged against the old schema. Running
-- this migration first, while the old code (which still queries
-- albums/album_id) is live, would break the entire site immediately.
-- The only thing that doesn't work until this has run is creating a new
-- photo (INSERT omits album_id, still NOT NULL until the column is
-- dropped below).
--
-- VERIFY THE CONSTRAINT NAME FIRST — don't assume it blindly:
--   SHOW CONSTRAINTS FROM photos;    -- CockroachDB
--   \d photos                        -- psql, either database
-- The inline `REFERENCES albums(id)` in db/schema.sql was never given an
-- explicit name, so Postgres/CockroachDB auto-generated one — expected to
-- be `photos_album_id_fkey`, but confirm before running DROP CONSTRAINT.

ALTER TABLE photos DROP CONSTRAINT IF EXISTS photos_album_id_fkey;
DROP INDEX IF EXISTS photos_album_id_position_idx;

ALTER TABLE photos DROP COLUMN IF EXISTS album_id;
ALTER TABLE photos DROP COLUMN IF EXISTS "position";
ALTER TABLE photos DROP COLUMN IF EXISTS focus_x;
ALTER TABLE photos DROP COLUMN IF EXISTS focus_y;

DROP TABLE IF EXISTS albums;

-- Replaces the dropped (album_id, position) index. Serves both the flat
-- admin list and the public grid's ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS photos_category_created_at_idx
  ON photos (category, created_at DESC);
