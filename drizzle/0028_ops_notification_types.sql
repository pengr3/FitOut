-- Custom SQL migration (Phase 18, OPS-05 / D-245, RESEARCH § F3 / Pitfall 3 / 55P04) — add the six ops
-- decision kinds to the EXISTING notification_type. This file does NOTHING ELSE: an
-- `ALTER TYPE ... ADD VALUE` and the FIRST USE of the new value CANNOT share a transaction (Postgres
-- 55P04 "unsafe use of new enum value"), and both migrators — drizzle-kit's and drizzle-orm's
-- programmatic one — wrap ALL pending migrations in ONE transaction. The values are therefore ONLY added
-- here; NOTHING in ANY migration ever USES them. This is exactly the split drizzle/0018 took for the
-- three group kinds and drizzle/0027 took for the ops cancellation actor, and it is why this file is
-- separate from 0026 rather than folded into it.
--
-- ⚠ THE FIRST RUNTIME WRITE OF ALL SIX IS AN `emitNotify` FROM `src/app/actions/ops-review.ts` AND
-- `src/app/actions/cancel-booking.ts` (cancelBookingAsOps) — application code, long after this migration
-- commits, never a migration. `tests/design/enum-first-use-tripwire.test.ts` mechanises that rule: it
-- reads this directory off disk and fails if any of these literals appears in a second migration file,
-- or if this file grows a statement that is not an ADD VALUE.
--
-- ⚠ AND THE DEFECT THIS PREVENTS PASSES EVERY TEST. The isolated-schema harness (tests/helpers/db.ts)
-- replays each statement in its own implicit transaction, and a FRESH database CREATEs the type in the
-- same transaction it is then used in — so neither the suite nor a clean `npm run db:migrate` can
-- reproduce 55P04. It surfaces only where the type is already committed, i.e. production.
--
-- IF NOT EXISTS + the unqualified type name keep the harness replaying this idempotently into every
-- isolated schema (the type resolves via the schema-first search_path). Postgres appends each value at
-- the enum tail — matching the order in src/lib/db/schema.ts.
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'listing_review_approved';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'listing_review_rejected';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'host_verification_approved';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'host_verification_rejected';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'host_suspended';--> statement-breakpoint
ALTER TYPE "notification_type" ADD VALUE IF NOT EXISTS 'booking_cancelled_by_ops';
