-- Custom SQL migration file, put your code below! --
-- Enable PostGIS BEFORE the listing table (0002) so the geometry(point,4326) type + GiST index exist.
-- Drizzle cannot express CREATE EXTENSION in schema.ts, so this is a hand-authored custom migration
-- ordered first (RESEARCH Pattern 1 note + Pitfall 7). IF NOT EXISTS is MANDATORY so the integration
-- test harness (tests/helpers/db.ts) can replay it idempotently into every isolated schema across
-- parallel Vitest workers without failing.
CREATE EXTENSION IF NOT EXISTS postgis;
