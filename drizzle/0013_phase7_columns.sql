-- Generated migration (Phase 7) — the cancellation/service-fee/notification COLUMNS, TYPES, TABLES and
-- INDEXES. Hand-edited after `drizzle-kit generate` in three ways, each load-bearing:
--
-- (a) NO 55P04 SPLIT NEEDED. All five types here are BRAND-NEW `CREATE TYPE ... AS ENUM`, and a brand-new
-- type may be created and USED in the same transaction. The two-migration split in 0010/0011/0012 exists
-- ONLY because `ALTER TYPE ... ADD VALUE` on an EXISTING type cannot be used in the transaction that adds
-- it (Postgres 55P04, and drizzle-orm's migrator wraps ALL pending migrations in ONE transaction). That
-- hazard is exclusive to ADD VALUE; it does not apply to any statement below. No booking_status value is
-- added in Phase 7 (D-79 deliberately keeps the single `cancelled` status).
--
-- (b) BACKFILL-FREE. Every column added is nullable or carries a DEFAULT, so no existing row needs
-- rewriting to satisfy a constraint. host_payout_ledger.kind defaults to 'payout', which backfills every
-- pre-existing ledger row by construction — that is what makes 0014's composite unique safe.
--
-- (c) THE GiST EXCLUDE IS NOT TOUCHED. The booking-overlap EXCLUDE constraint (drizzle/0005, widened in
-- drizzle/0012) is the SOLE double-booking authority (D-21 keystone). None of the columns below appears in
-- its predicate (listing_id, unit, starts_at, ends_at, status), and no statement in this file names that
-- constraint at all. The `host_payout_ledger_booking_id_unique` DROP + composite re-ADD that drizzle-kit
-- emitted into this file was MOVED to the hand-authored 0014 so the constraint swap and the backfill it
-- depends on read as one reviewable unit.
--
-- Unqualified table/type names throughout (the schema-qualified prefixes drizzle-kit emits were stripped)
-- so the integration harness (tests/helpers/db.ts) replays this idempotently into every isolated schema —
-- unqualified objects resolve via the schema-first search_path.
CREATE TYPE "cancellation_policy" AS ENUM('flexible', 'standard', 'strict');--> statement-breakpoint
CREATE TYPE "cancelled_by" AS ENUM('booker', 'host', 'system');--> statement-breakpoint
CREATE TYPE "ledger_kind" AS ENUM('payout', 'host_cancel_fee');--> statement-breakpoint
CREATE TYPE "notification_type" AS ENUM('booking_confirmed', 'request_received', 'request_approved', 'request_declined', 'new_request_to_host', 'booking_cancelled_by_booker', 'booking_cancelled_by_host', 'refund_issued', 'reminder_pre_expiry', 'reminder_pre_session', 'reminder_pre_sla');--> statement-breakpoint
CREATE TYPE "reminder_kind" AS ENUM('pre_expiry', 'pre_session_booker', 'pre_session_host', 'pre_sla_host');--> statement-breakpoint
CREATE TABLE "booking_reminder" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"kind" "reminder_kind" NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"recipient_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"booking_id" text,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "cancellation_policy" "cancellation_policy";--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "space_price_cents" integer;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "service_fee_cents" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "refund_cents" integer;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "retained_space_cents" integer;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "cancelled_by" "cancelled_by";--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "decline_reason" text;--> statement-breakpoint
ALTER TABLE "host_payout_ledger" ADD COLUMN "kind" "ledger_kind" DEFAULT 'payout' NOT NULL;--> statement-breakpoint
ALTER TABLE "host_payout_ledger" ADD COLUMN "recovered_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "cancellation_policy" "cancellation_policy";--> statement-breakpoint
ALTER TABLE "booking_reminder" ADD CONSTRAINT "booking_reminder_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_reminder_uq" ON "booking_reminder" USING btree ("booking_id","kind");--> statement-breakpoint
CREATE INDEX "notification_unread_idx" ON "notification" USING btree ("recipient_id") WHERE read_at IS NULL;--> statement-breakpoint
CREATE INDEX "notification_recipient_created_idx" ON "notification" USING btree ("recipient_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "booking_booker_idx" ON "booking" USING btree ("booker_id","starts_at" DESC NULLS LAST);
