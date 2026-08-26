-- Run this once against the CockroachDB Serverless database (its SQL
-- shell in the CockroachDB Cloud console, or
-- `psql "$DATABASE_URL" -f db/schema.sql`). Not executed by app code.
-- Standard Postgres syntax throughout — CockroachDB is wire-protocol
-- compatible, but doesn't implement every Postgres extension, so this file
-- deliberately avoids anything beyond core SQL (no DISTINCT ON, etc. — see
-- api/_lib/db.js for where that mattered).
--
-- The category CHECK constraints below must be kept in sync BY HAND with
-- shared/categories.js's CATEGORY_KEYS — a SQL constraint can't import a JS
-- file. If the category list ever changes, ALTER both constraints to match.

CREATE TABLE albums (
  id         TEXT PRIMARY KEY,                 -- slug, same value used in URLs today
  title      TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('wedding','portrait','product','family')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE photos (
  id         TEXT PRIMARY KEY,                 -- slugify(title) + "-" + uuid8, generated client-side
  album_id   TEXT NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  category   TEXT NOT NULL CHECK (category IN ('wedding','portrait','product','family')),
  title      TEXT NOT NULL,
  aspect     TEXT NOT NULL,                    -- e.g. "4 / 5"
  src        TEXT NOT NULL,                    -- Vercel Blob public URL
  "position" INTEGER NOT NULL DEFAULT 0,        -- 0-based order within its album (0 = cover photo)
  -- Focal point (0..1 fraction of the photo's width/height) used as the
  -- CSS object-position when this photo is square-cropped as an album
  -- cover on the public Galleries page — set via the admin's crop picker.
  -- Stored per-photo (not per-album) so each photo remembers its own best
  -- crop point even if it isn't the current cover.
  focus_x    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  focus_y    DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX photos_album_id_position_idx ON photos (album_id, "position");
