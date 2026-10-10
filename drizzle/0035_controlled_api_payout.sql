-- Preserve the original Dashboard claim while assigning its one allowed send to FitOut's API.
ALTER TABLE "manual_host_payout_attempt" DROP CONSTRAINT "manual_host_payout_attempt_state_check";
ALTER TABLE "manual_host_payout_attempt" ADD CONSTRAINT "manual_host_payout_attempt_state_check"
  CHECK ("state" IN ('prepared', 'submitted', 'failed', 'api_reserved', 'api_submitted', 'api_failed'));
ALTER TABLE "manual_host_payout_attempt"
  ADD COLUMN "actual_fee_cents" integer CHECK ("actual_fee_cents" IS NULL OR "actual_fee_cents" >= 0),
  ADD COLUMN "api_reserved_at" timestamp with time zone,
  ADD COLUMN "api_authorized_staff_id" text REFERENCES "user"("id") ON DELETE restrict;
