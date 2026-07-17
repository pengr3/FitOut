-- Custom SQL migration (WR-05) — flip the booking.status column DEFAULT from 'confirmed' to the SAFE
-- 'pending'. A column-default change does NOT touch existing rows (each real caller already inserts an
-- explicit status), so this is purely forward-looking: once the payout sweep pays out 'confirmed' bookings
-- past ends_at + delay, a 'confirmed' default would let any insert that omits `status` mint a slot-occupying,
-- payout-eligible booking that was never paid for. 'pending' is the fail-safe default. Kept hand-authored
-- (mirrors 0007/0008): unqualified table/column so the integration harness (tests/helpers/db.ts) replays it
-- idempotently into every isolated schema, and ALTER ... SET DEFAULT is itself idempotent.
ALTER TABLE "booking" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
