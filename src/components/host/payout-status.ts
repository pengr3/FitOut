// Pure payout-state derivation — a NON-client module so Server Components (the host dashboard
// and the payout return page) can CALL derivePayoutStatus. A "use client" module's exports become
// client references when imported by a Server Component and cannot be invoked server-side — doing
// so crashed /host in UAT ("derivePayoutStatus is not a function"). Keep this file free of
// "use client" and of any client-only imports.

/** The host's live payout state, derived server-side from host_payout and passed to the banner. */
export type PayoutStatus = "not_started" | "incomplete" | "enabled" | "paused";

/** Derive the banner state from a host_payout row (or its absence). Shared by the dashboard + pages. */
export function derivePayoutStatus(
  row:
    | { paymongoAccountId: string | null; payoutsEnabled: boolean; activationStatus: string }
    | undefined
    | null,
): PayoutStatus {
  // A host_payout row is created only by an explicit setup attempt.  Older rows may carry a legacy
  // PayMongo linked-account id; newer parent-merchant rows intentionally do not.  Both mean setup
  // has started, while an absent row remains the only honest "not started" state.
  if (!row) return "not_started";
  if (row.payoutsEnabled) return "enabled";
  if (row.activationStatus === "declined") return "paused";
  return "incomplete";
}
