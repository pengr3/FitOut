-- Custom SQL migration (Phase 9, OC-01, RESEARCH Pitfall 2 / 55P04) — add 'open_capacity' to the EXISTING
-- occupancy_mode enum. This file does NOTHING ELSE: an `ALTER TYPE ... ADD VALUE` and the FIRST USE of the
-- new value CANNOT share a transaction (Postgres 55P04 "unsafe use of new enum value"), and drizzle-orm's
-- migrator wraps ALL pending migrations in ONE transaction. The value is therefore ONLY added here; NOTHING
-- in ANY migration ever USES it — 0022 narrows booking_no_overlap on the BOOLEAN booking.open_capacity for
-- exactly that reason, and the first real use of 'open_capacity' is a runtime UPDATE from the publish action
-- (src/app/actions/listing.ts), never a migration. IF NOT EXISTS + the unqualified type name keep the
-- integration harness (tests/helpers/db.ts) replaying this idempotently into every isolated schema (the type
-- resolves via the schema-first search_path). Postgres appends the value at the enum tail — matching schema.ts.
ALTER TYPE "occupancy_mode" ADD VALUE IF NOT EXISTS 'open_capacity';
