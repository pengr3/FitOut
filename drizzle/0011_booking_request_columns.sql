-- Custom SQL migration (Phase 6) — the request-to-book column + default, split BETWEEN the enum-add (0010)
-- and its first USE (0012) per Pitfall 2. (a) booking.booking_mode: a nullable, backfill-free ADD COLUMN
-- (mirrors 0006 — no existing rows depend on it; D-61 creation-time booking-mode snapshot for display/audit,
-- lifecycle correctness rests on `status`). (b) listing.booking_mode default flip 'request' -> 'instant'
-- (D-62 demand-first): a forward-only SET DEFAULT that does NOT touch existing rows (mirrors 0009). Neither
-- statement USES the new booking_status values, so it is safe to run before 0012. Unqualified table/column +
-- enum type so the integration harness (tests/helpers/db.ts) replays it idempotently into every isolated
-- schema (the booking_mode type resolves via the schema-first search_path).
ALTER TABLE "booking" ADD COLUMN "booking_mode" "booking_mode";--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "booking_mode" SET DEFAULT 'instant';
