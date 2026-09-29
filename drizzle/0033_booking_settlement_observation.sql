-- Phase 26's sole additive settlement migration. Existing bookings remain unknown.
CREATE TABLE "booking_settlement_observation" (
  "id" integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "booking_id" text NOT NULL REFERENCES "booking"("id") ON DELETE restrict,
  "payment_id" text NOT NULL,
  "payout_id" text NOT NULL,
  "transaction_id" text NOT NULL,
  "transaction_type" text NOT NULL,
  "provider_status" text NOT NULL,
  "provider_status_at" timestamp with time zone NOT NULL,
  "deposited_at" timestamp with time zone,
  "verified_at" timestamp with time zone NOT NULL,
  "wallet_destination_matched" boolean NOT NULL,
  "mapping_verified" boolean NOT NULL,
  "live_mode" boolean NOT NULL,
  "currency" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "booking_settlement_observation_version_uq" UNIQUE ("booking_id", "payout_id", "transaction_id", "provider_status", "provider_status_at"),
  CONSTRAINT "booking_settlement_observation_status_ck" CHECK ("provider_status" IN ('pending', 'on_hold', 'in_transit', 'deposited', 'returned', 'cancelled')),
  CONSTRAINT "booking_settlement_observation_deposit_ck" CHECK ("provider_status" <> 'deposited' OR "deposited_at" = "provider_status_at")
);
--> statement-breakpoint
CREATE INDEX "booking_settlement_observation_current_idx" ON "booking_settlement_observation" ("booking_id", "provider_status_at" DESC, "id" DESC);
--> statement-breakpoint
CREATE INDEX "booking_settlement_observation_payout_idx" ON "booking_settlement_observation" ("payout_id");
--> statement-breakpoint
CREATE TABLE "booking_settlement_current" (
  "booking_id" text PRIMARY KEY NOT NULL REFERENCES "booking"("id") ON DELETE restrict,
  "observation_id" integer NOT NULL REFERENCES "booking_settlement_observation"("id") ON DELETE restrict,
  "provider_status_at" timestamp with time zone NOT NULL,
  "status_priority" integer NOT NULL,
  "verified_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE FUNCTION "booking_settlement_observation_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'settlement observations are append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "booking_settlement_observation_no_mutation" BEFORE UPDATE OR DELETE ON "booking_settlement_observation"
FOR EACH ROW EXECUTE FUNCTION "booking_settlement_observation_immutable"();
