-- Custom SQL migration (Phase 6, D-63, T-06-01) — WIDEN the double-booking keystone. Postgres has no
-- `ALTER CONSTRAINT ... WHERE`, so the EXCLUDE is DROPped and re-ADDed with the occupying-status set
-- widened to include the two request-to-book holding states. This is the FIRST USE of the 'requested' /
-- 'approved' enum values added in 0010 — it MUST be a SEPARATE migration file (transaction) from that
-- ADD VALUE or Postgres raises 55P04 (unsafe use of new enum value, Pitfall 2). Mirrors 0005 EXACTLY
-- (unqualified cols, half-open '[)' tstzrange, same GiST shape); btree_gist is ALREADY installed by 0005
-- — do NOT re-CREATE EXTENSION. The GiST EXCLUDE is the SOLE double-booking authority: a requested/approved
-- slot now blocks a conflicting booking exactly like pending/confirmed. Unqualified table/column so the
-- integration harness (tests/helpers/db.ts) replays it idempotently into every isolated schema (0005 ADDs,
-- this DROPs + re-ADDs, in journal order).
ALTER TABLE "booking" DROP CONSTRAINT "booking_no_overlap";--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_no_overlap"
  EXCLUDE USING gist (
    "listing_id" WITH =,
    "unit" WITH =,
    tstzrange("starts_at", "ends_at", '[)') WITH &&
  )
  WHERE ("status" IN ('pending', 'confirmed', 'requested', 'approved'));
