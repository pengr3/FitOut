-- One deliberately narrow, operator-created exception for a single live PHP 20 checkout proof.
-- It does not alter host payout state, listing visibility, identity verification, or review rules.
CREATE TABLE "controlled_checkout_grant" (
  "id" text PRIMARY KEY NOT NULL,
  "listing_id" text NOT NULL REFERENCES "listing"("id") ON DELETE restrict,
  "booker_id" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
  "authorization_reference" text NOT NULL,
  "max_amount_cents" integer NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "consumed_booking_id" text,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "controlled_checkout_grant_php20_cap" CHECK ("max_amount_cents" > 0 AND "max_amount_cents" <= 2000)
);
--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "controlled_checkout_grant_id" text;
--> statement-breakpoint
CREATE UNIQUE INDEX "booking_controlled_checkout_grant_uq"
  ON "booking" ("controlled_checkout_grant_id")
  WHERE "controlled_checkout_grant_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "controlled_checkout_grant_consumed_booking_uq"
  ON "controlled_checkout_grant" ("consumed_booking_id")
  WHERE "consumed_booking_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "controlled_checkout_grant_lookup_idx"
  ON "controlled_checkout_grant" ("listing_id", "booker_id", "expires_at");
