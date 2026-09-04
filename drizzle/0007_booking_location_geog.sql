-- Custom SQL migration — Drizzle cannot express a functional GiST index over `(location::geography)`,
-- so this optional radius-search perf index is hand-authored (mirrors 0001/0005). The existing
-- `listing_location_gist` (0002) is a GEOMETRY index and does NOT serve the `::geography` cast that
-- Phase-4 search uses (ST_DWithin / ST_Distance in meters); this adds the geography variant so the
-- radius query can index-scan instead of seq-scanning. IF NOT EXISTS + unqualified table/column are
-- MANDATORY so the integration harness (tests/helpers/db.ts) replays this idempotently into every
-- isolated schema — PostGIS lands in public and the `geography` cast resolves via the schema-first
-- search_path ("<schema>,public"). Optional at single-city / bookable-only scale (A4).
CREATE INDEX IF NOT EXISTS listing_location_geog_gist ON listing USING gist ((location::geography));