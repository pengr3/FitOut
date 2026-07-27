-- Generated migration (Phase 8, GROUP-01/03/05) — the group-booking foundation: the occupancy_mode /
-- rsvp_status TYPES, the booking_group / rsvp TABLES, the pax-pricing COLUMNS and the RSVP de-dup INDEXES.
-- Hand-edited after `drizzle-kit generate` in two load-bearing ways:
--
-- (a) NO 55P04 SPLIT NEEDED. Both types here are BRAND-NEW `CREATE TYPE ... AS ENUM`, and a brand-new type
-- may be created and USED in the same transaction. The two-migration split in 0010/0012 exists ONLY because
-- `ALTER TYPE ... ADD VALUE` on an EXISTING type cannot be used in the transaction that adds it (Postgres
-- 55P04, and drizzle-orm's migrator wraps ALL pending migrations in ONE transaction). That hazard is
-- exclusive to ADD VALUE — it does not apply to any statement below, so occupancy_mode/rsvp_status are
-- created and first-used (listing.occupancy_mode / rsvp.status) in this single file. This migration does
-- NOT touch the notification_type enum or the NotificationPayload union (owned by the later 08-04 migration).
--
-- (b) BACKFILL-FREE. Every column added is nullable or carries a DEFAULT: booking.declared_pax /
-- listing.included / listing.extra_head_fee are nullable; listing.occupancy_mode defaults 'exclusive' (the
-- only v1 value, D-109) so every existing listing backfills by construction. No payment/booking column is
-- changed (D-107) — the hold-until-session rail is untouched.
--
-- Unqualified table/type names throughout (the schema-qualified `"public".` prefixes drizzle-kit emits were
-- stripped, mirroring drizzle/0013) so the integration harness (tests/helpers/db.ts) replays this
-- idempotently into every isolated schema — unqualified objects resolve via the schema-first search_path.
CREATE TYPE "occupancy_mode" AS ENUM('exclusive');--> statement-breakpoint
CREATE TYPE "rsvp_status" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TABLE "booking_group" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"capacity_snapshot" integer NOT NULL,
	"access_token" text NOT NULL,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_group_booking_id_unique" UNIQUE("booking_id"),
	CONSTRAINT "booking_group_access_token_unique" UNIQUE("access_token")
);
--> statement-breakpoint
CREATE TABLE "rsvp" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text,
	"guest_name" text NOT NULL,
	"guest_email_norm" text,
	"manage_token" text,
	"status" "rsvp_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "declared_pax" integer;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "occupancy_mode" "occupancy_mode" DEFAULT 'exclusive' NOT NULL;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "included" integer;--> statement-breakpoint
ALTER TABLE "listing" ADD COLUMN "extra_head_fee" integer;--> statement-breakpoint
ALTER TABLE "booking_group" ADD CONSTRAINT "booking_group_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "booking"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp" ADD CONSTRAINT "rsvp_group_id_booking_group_id_fk" FOREIGN KEY ("group_id") REFERENCES "booking_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvp" ADD CONSTRAINT "rsvp_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_group_user_uq" ON "rsvp" USING btree ("group_id","user_id") WHERE user_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_group_email_uq" ON "rsvp" USING btree ("group_id","guest_email_norm") WHERE guest_email_norm IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "rsvp_manage_token_uq" ON "rsvp" USING btree ("manage_token") WHERE manage_token IS NOT NULL;
