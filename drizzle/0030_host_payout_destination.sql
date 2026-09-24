-- Parent-merchant external payout destination.  The two sensitive columns contain AES-GCM ciphertext
-- only; no account number or account-holder name is stored in plaintext.
CREATE TABLE "host_payout_destination" (
  "user_id" text PRIMARY KEY NOT NULL,
  "institution_bic" text NOT NULL,
  "institution_name" text NOT NULL,
  "account_name_ciphertext" text NOT NULL,
  "account_number_ciphertext" text NOT NULL,
  "account_last4" text NOT NULL,
  "verification_status" text DEFAULT 'pending' NOT NULL,
  "verification_reference" text,
  "verified_at" timestamp with time zone,
  "verified_by" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "host_payout_destination_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action
);
