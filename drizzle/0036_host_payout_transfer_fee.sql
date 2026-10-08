-- Freeze the pre-dispatch fee reserve and reconcile the provider's actual fee per payout.
-- Nullable for historical claims and netted bookings that never made a transfer.
ALTER TABLE "host_payout_ledger"
  ADD COLUMN "fee_budget_cents" integer CHECK ("fee_budget_cents" IS NULL OR "fee_budget_cents" >= 0),
  ADD COLUMN "actual_fee_cents" integer CHECK ("actual_fee_cents" IS NULL OR "actual_fee_cents" >= 0);
