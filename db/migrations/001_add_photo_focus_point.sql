-- Adds the per-photo crop focal point used by the admin's cover crop
-- picker. Additive and backward compatible — existing rows all get the
-- centered default (0.5, 0.5), matching the object-fit: cover behavior
-- the public site already had before this column existed.
--
-- Run once against the existing CockroachDB Serverless database (already
-- applied directly via `vercel dev` + DATABASE_URL on 2026-08-25 — this
-- file exists so schema.sql's CREATE TABLE and the live database stay in
-- sync and so a fresh `db/schema.sql` install doesn't need this file).

ALTER TABLE photos ADD COLUMN IF NOT EXISTS focus_x DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS focus_y DOUBLE PRECISION NOT NULL DEFAULT 0.5;
