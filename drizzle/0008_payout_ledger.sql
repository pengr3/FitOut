CREATE TYPE "public"."payout_ledger_state" AS ENUM('held', 'processing', 'paid', 'refunded', 'failed');--> statement-breakpoint
CREATE TABLE "host_payout_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"host_id" text NOT NULL,
	"payment_id" text,
	"gross_cents" integer NOT NULL,
	"commission_rate_bps" integer NOT NULL,
	"commission_cents" integer NOT NULL,
	"net_cents" integer NOT NULL,
	"currency" text DEFAULT 'php' NOT NULL,
	"state" "payout_ledger_state" DEFAULT 'held' NOT NULL,
	"transfer_id" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "host_payout_ledger_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
ALTER TABLE "listing" ALTER COLUMN "currency" SET DEFAULT 'php';--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "payment_id" text;--> statement-breakpoint
ALTER TABLE "host_payout_ledger" ADD CONSTRAINT "host_payout_ledger_booking_id_booking_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."booking"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_payout_ledger" ADD CONSTRAINT "host_payout_ledger_host_id_user_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "host_payout_ledger_host_idx" ON "host_payout_ledger" USING btree ("host_id");--> statement-breakpoint
-- Hand-edit (D-46): a column DEFAULT change does NOT touch existing rows, so backfill any listing still
-- on the pre-D-46 'usd' default to 'php' — charge currency must be consistent end-to-end. Bookings have
-- no rows (A7), so no booking backfill is needed.
UPDATE "listing" SET "currency" = 'php' WHERE "currency" = 'usd';--> statement-breakpoint