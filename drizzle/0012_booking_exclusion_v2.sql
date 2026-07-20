-- Custom SQL migration (Phase 6, D-63, T-06-01) — WIDEN the double-booking keystone so the two
-- request-to-book holding states also block a conflicting booking. Postgres has no
-- `ALTER CONSTRAINT ... WHERE`, so the EXCLUDE is DROPped and re-ADDed. Mirrors 0005's GiST shape
-- EXACTLY (unqualified cols, half-open '[)' tstzrange); btree_gist is ALREADY installed by 0005 — do
-- NOT re-CREATE EXTENSION.
--
-- OCCUPYING (slot-holding) status set = {pending, confirmed, requested, approved}. That is what MUST
-- participate in the exclusion. It is written here as the COMPLEMENT of the FREE set
-- {cancelled, declined, completed} — i.e. `status NOT IN ('cancelled','declined','completed')` — which
-- is SET-EQUIVALENT to `status IN ('pending','confirmed','requested','approved')`.
--
-- WHY the complement (load-bearing): drizzle-orm's postgres-js migrator wraps ALL pending migrations in
-- ONE transaction (pg-core/dialect `session.transaction(...)`). On any DB where booking_status was
-- already committed by an earlier run (this dev DB, staging, production), the 'requested'/'approved'
-- values ADDed in 0010 are NOT yet committed inside that shared transaction, so naming them as ENUM
-- literals here would raise Postgres 55P04 "unsafe use of new enum value" and roll back the whole
-- `npm run db:migrate`. The complement names ONLY the three ALREADY-COMMITTED free statuses, so the
-- constraint applies in a single transaction on fresh AND already-migrated DBs alike. (A text cast
-- `status::text IN (...)` is NOT an option — enum->text is STABLE, and index predicates require
-- IMMUTABLE expressions.) Bonus correctness: the complement is the SAFE default for the double-booking
-- guarantee — any future status defaults to OCCUPYING (blocks) until explicitly added to the free set.
-- Unqualified table/column so the integration harness (tests/helpers/db.ts) replays it idempotently
-- into every isolated schema (0005 ADDs, this DROPs + re-ADDs, in journal order).
ALTER TABLE "booking" DROP CONSTRAINT "booking_no_overlap";--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,
    "unit" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('cancelled', 'declined', 'completed'));
