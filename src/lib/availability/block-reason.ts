// Human copy for a block's reason (T9). ONE pure, directive-free mapper so the client blocks-editor can
// import it: it re-labels the single host-cancellation sentinel and passes a host's own free-text reason
// through untouched (trimmed). Directive-free on purpose — no "use client"/"use server" — so it stays
// isomorphic and testable.

// Mirror of HOST_CANCEL_BLOCK_REASON in src/app/actions/cancel-booking.ts — the sentinel a host-side
// cancellation writes into the auto-created block. Duplicated as a literal (not imported) to keep this
// module free of the "use server" graph cancel-booking.ts pulls in.
const HOST_CANCEL_BLOCK_REASON = "host_cancellation";

/**
 * Turn a stored block reason into display copy.
 * - the `host_cancellation` sentinel → "Cancelled by host"
 * - a host's free-text reason → itself, trimmed
 * - null / empty / whitespace-only → null (so callers emit no " · <reason>" fragment)
 */
export function blockReasonLabel(reason: string | null): string | null {
  if (reason === null) return null;
  const trimmed = reason.trim();
  if (trimmed === "") return null;
  if (trimmed === HOST_CANCEL_BLOCK_REASON) return "Cancelled by host";
  return trimmed;
}
