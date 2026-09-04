-- Custom SQL migration (Phase 7) — (a) the Finding-2 price-split BACKFILL and (b) the D-71 at-most-once
-- gate widening. Both are hand-authored because drizzle-kit emits neither a data backfill nor a reviewed
-- constraint swap.
--
-- (a) BACKFILL: every pre-Phase-7 booking predates the service fee, so space = total and fee = 0 reproduces
-- reality EXACTLY and losslessly. quoted_total_cents keeps its meaning (the amount actually charged);
-- space_price_cents becomes the PAYOUT basis so the sweep never pays the host 90% of the platform's own fee.
-- Both UPDATEs are scoped `WHERE ... IS NULL`, so they are idempotent and can never overwrite a value that
-- a Phase-7 write path has already frozen (T-07-03).
--
-- (b) CONSTRAINT SWAP: host_payout_ledger's UNIQUE(booking_id) is the at-most-once payout lock. D-71 adds a
-- SECOND row kind per booking (a signed host_cancel_fee debit), so the gate widens to (booking_id, kind).
-- Postgres has no ALTER CONSTRAINT for this, so the unique is DROPped and re-ADDed — the same shape as
-- 0012's EXCLUDE swap. Every existing row is backfilled to kind='payout' by the column DEFAULT added in
-- 0013, so the new composite unique is satisfied by construction and the payout gate is preserved exactly:
-- a booking still holds at most ONE kind='payout' row. The DROP and the re-ADD run inside the SAME migrator
-- transaction, so there is no window in which the ledger is unprotected.
--
-- The booking-overlap GiST EXCLUDE constraint (D-21 keystone, drizzle/0005 + drizzle/0012) is NOT named or
-- referenced by any statement in this file.
--
-- Unqualified table names so the integration harness (tests/helpers/db.ts) replays this into every isolated
-- schema via the schema-first search_path.
UPDATE "booking" SET "space_price_cents" = "quoted_total_cents" WHERE "space_price_cents" IS NULL;--> statement-breakpoint
UPDATE "booking" SET "service_fee_cents" = 0 WHERE "service_fee_cents" IS NULL;--> statement-breakpoint
ALTER TABLE "host_payout_ledger" DROP CONSTRAINT "host_payout_ledger_booking_id_unique";--> statement-breakpoint
ALTER TABLE "host_payout_ledger" ADD CONSTRAINT "host_payout_ledger_booking_id_kind_unique" UNIQUE("booking_id", "kind");
