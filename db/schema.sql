-- Run this once against the CockroachDB Serverless database (its SQL
-- shell in the CockroachDB Cloud console, or
-- `psql "$DATABASE_URL" -f db/schema.sql`). Not executed by app code.
-- Standard Postgres syntax throughout — CockroachDB is wire-protocol
-- compatible, but doesn't implement every Postgres extension.
--
-- This reflects the steady state AFTER db/migrations/002_remove_albums.sql
-- — a fresh install needs only this file, no migrations to replay.
--
-- The category CHECK constraint below must be kept in sync BY HAND with
-- shared/categories.js's CATEGORY_KEYS — a SQL constraint can't import a JS
-- file. If the category list ever changes, ALTER the constraint to match.

CREATE TABLE photos (
  id         TEXT PRIMARY KEY,                 -- slugify(title) + "-" + uuid8, generated client-side
  category   TEXT NOT NULL CHECK (category IN ('wedding','portrait','product','family')),
  title      TEXT NOT NULL,                    -- the uploaded file name
  aspect     TEXT NOT NULL,                    -- e.g. "4 / 5"
  src        TEXT NOT NULL,                    -- Vercel Blob public URL
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX photos_category_created_at_idx ON photos (category, created_at DESC);
