"use server";

// Legacy compatibility boundary. FitOut used to create PayMongo Linked Accounts here, but that
// integration cannot safely deliver earnings to a host's chosen bank/e-wallet. Keep the export while
// old pages and bookmarked return URLs age out, but make every direct Server Action POST inert.

export type OnboardingResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const RETIRED_RESULT: OnboardingResult = {
  ok: false,
  error: "Payout setup has moved. Choose your payout destination from your host dashboard.",
};

/** @deprecated External payout destinations are configured at /host/payouts. Never creates a provider account. */
export async function startPayoutOnboarding(): Promise<OnboardingResult> {
  return RETIRED_RESULT;
}

/** @deprecated Hosted linked-account links are no longer minted. */
export async function refreshOnboardingLink(): Promise<OnboardingResult> {
  return RETIRED_RESULT;
}
