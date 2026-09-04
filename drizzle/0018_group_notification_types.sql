-- Custom SQL migration (Phase 8, D-122, RESEARCH Pitfall 7 / 55P04) — add the three group-RSVP enum values
-- to the EXISTING notification_type. This file does NOTHING ELSE: an `ALTER TYPE ... ADD VALUE` and the
-- FIRST USE of the new value CANNOT share a transaction (Postgres 55P04 "unsafe use of new enum value"),
-- and drizzle-kit's migrator runs all pending migrations in ONE transaction. The values are therefore ONLY
-- added here; nothing in ANY migration ever USES them — the first use is a runtime INSERT from the notify
-- emitter (08-06), never a migration. IF NOT EXISTS + the unqualified type name keep the integration harness
-- (tests/helpers/db.ts) replaying this idempotently into every isolated schema (the type resolves via the
-- schema-first search_path). Postgres appends each value at the enum tail — matching the schema.ts order.
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'group_rsvp_received';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'group_rsvp_confirmed';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'group_cancelled';
