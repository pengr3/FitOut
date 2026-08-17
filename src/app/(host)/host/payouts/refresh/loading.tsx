// STATE-01 — the loading state for `/host/payouts/refresh`, and the SECOND of the two routes in this
// phase that deliberately get NO skeleton. See `(host)/host/listings/new/loading.tsx` for the full
// argument; the shape of this one is the same and the reason is one step subtler.
//
// ── WHY NO SKELETON ───────────────────────────────────────────────────────────────────────────────
// PayMongo sends the host here when a hosted onboarding link expires or is revisited. The page mints
// a fresh single-use link and `redirect()`s straight back into onboarding — so on the path this route
// exists for, it renders NOTHING. It has markup only for the failure case (rate-limited or a
// transient error), and skeletoning that would be drawing a placeholder for the outcome nobody is
// waiting for: the host would watch a title-shaped bar resolve into an apology on the rare path, and
// see it flash before an off-site redirect on the common one.
//
// It still needs the file, and here more than anywhere: the await is a network call to a payments
// provider, which is the slowest wait in the app and the one most likely to leave a host staring at a
// frozen screen with nothing announced.
//
// VOICE (D-12): never "PayMongo", "KYC" or "webhook" — the sentence says payouts, in the host's
// words, exactly as every other surface in this flow does.

import { PANEL_MIN_HEIGHT } from "@/lib/design/measurements";
import { cn } from "@/lib/utils";

const ANNOUNCEMENT = "Reopening payout setup";

export default function PayoutRefreshLoading() {
  return (
    // Container is the page's own fallback container, verbatim, so the rare error path lands in the
    // same column the sentence occupied.
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <div
        role="status"
        aria-busy="true"
        aria-label={ANNOUNCEMENT}
        className={cn(PANEL_MIN_HEIGHT, "flex items-center justify-center")}
      >
        <p className="text-sm text-muted-foreground">{ANNOUNCEMENT}…</p>
      </div>
    </div>
  );
}
