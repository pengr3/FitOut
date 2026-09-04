-- Custom SQL migration (Phase 9, D-123, RESEARCH Pattern 3 / Pitfall 1) — NARROW the double-booking keystone
-- to EXCLUSIVE bookings only. Postgres has no `ALTER CONSTRAINT ... WHERE`, so the EXCLUDE is DROPped and
-- re-ADDed. Mirrors 0005/0012's GiST shape EXACTLY (unqualified cols, half-open '[)' tstzrange);
-- btree_gist is ALREADY installed by 0005 — do NOT re-create that extension here.
--
-- WHY: every open-capacity booking on one date carries the SAME unit (1) and the IDENTICAL
-- [dayOpen, dayClose) window (OC-02/OC-03), so under the un-narrowed predicate the SECOND open booking of a
-- date is rejected 23P01 as a double-book. Open rows are arbitrated instead by the per-(listing,date)
-- advisory-lock admissions counter (D-123, src/lib/availability/units.ts createOpenCapacityHold).
--
-- WHY A BOOLEAN, NOT THE ENUM: index predicates require IMMUTABLE expressions (0012's rule). A boolean
-- literal is IMMUTABLE; naming the open_capacity ENUM VALUE added in 0020 would raise 55P04 because
-- drizzle-orm's migrator runs all pending migrations in ONE transaction. Hence booking.open_capacity — the
-- occurrences of open_capacity below are the BOOLEAN COLUMN, never the enum value. (The quoted enum literal
-- is deliberately absent even from these comments so the phase's grep gate stays a real tripwire.)
--
-- The occupying (slot-holding) status set is UNCHANGED and still written as the COMPLEMENT of the free set
-- {cancelled, declined, completed} — do not rewrite it as a positive IN list (0012's rationale).
ALTER TABLE "booking" DROP CONSTRAINT "booking_no_overlap";--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,
    "unit" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" NOT IN ('cancelled', 'declined', 'completed') AND "open_capacity" = false);
