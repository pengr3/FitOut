ALTER TABLE "booking" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "quoted_total_cents" integer;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "currency" text DEFAULT 'php' NOT NULL;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_idem_uq" ON "booking" USING btree ("idempotency_key") WHERE idempotency_key IS NOT NULL;