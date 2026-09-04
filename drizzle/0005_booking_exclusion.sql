-- Custom SQL migration — Drizzle cannot express EXCLUDE (issues #2813/#3388), so the double-booking
-- keystone is hand-authored here (mirrors the 0001_enable_postgis.sql pattern). Runs AFTER 0004
-- creates the booking table (filenames sort lexically). IF NOT EXISTS + WITH SCHEMA public are
-- MANDATORY so the integration harness (tests/helpers/db.ts) replays this idempotently into every
-- isolated schema — the extension's opclasses land in public and resolve via the schema-first
-- search_path ("<schema>,public"); the constraint columns stay UNQUALIFIED for the same reason.
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,
    "unit" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" IN ('pending', 'confirmed'));
