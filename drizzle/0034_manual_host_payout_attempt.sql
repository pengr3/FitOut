-- One operator-controlled attempt per booking. The existing payout ledger remains the money lock.
CREATE TABLE "manual_host_payout_attempt" (
  "booking_id" text PRIMARY KEY REFERENCES "booking"("id") ON DELETE restrict,
  "claim_id" text NOT NULL UNIQUE REFERENCES "host_payout_ledger"("id") ON DELETE restrict,
  "staff_id" text NOT NULL REFERENCES "user"("id") ON DELETE restrict,
  "wallet_id" text NOT NULL,
  "institution_bic" text NOT NULL,
  "account_name_ciphertext" text NOT NULL,
  "account_number_ciphertext" text NOT NULL,
  "amount_cents" integer NOT NULL CHECK ("amount_cents" > 0),
  "max_debit_cents" integer NOT NULL CHECK ("max_debit_cents" >= "amount_cents"),
  "transfer_id" text UNIQUE,
  "state" text NOT NULL DEFAULT 'prepared' CHECK ("state" IN ('prepared', 'submitted', 'failed')),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
