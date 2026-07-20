-- Custom SQL migration (Phase 6, D-63, Pitfall 2) — add the two request-to-book slot-holding enum values
-- to booking_status. This file does NOTHING ELSE: an `ALTER TYPE ... ADD VALUE` and the FIRST USE of the
-- new value CANNOT share a transaction (Postgres 55P04 "unsafe use of new enum value"), so the values are
-- added here and first USED in the widened booking_no_overlap EXCLUDE WHERE of a SEPARATE later file
-- (drizzle/0012). IF NOT EXISTS + unqualified type keep the integration harness (tests/helpers/db.ts)
-- replaying this idempotently into every isolated schema (the type resolves via the schema-first
-- search_path). Postgres appends each value at the enum tail — matching the schema.ts declaration order.
ALTER TYPE "booking_status" ADD VALUE IF NOT EXISTS 'requested';--> statement-breakpoint
ALTER TYPE "booking_status" ADD VALUE IF NOT EXISTS 'approved';
