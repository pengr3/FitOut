"use client";

// RequestCountdown (D-64/D-65/D-66) — an HOURS-scale expiry countdown, a direct structural clone of
// hold-countdown.tsx retuned from a 15-minute to a 24-hour horizon. Reused on the host inbox (the approval
// SLA — "Expires in {N}h {M}m") and the booker `approved` state (the payment window — "Pay within {N}h {M}m").
//
// DISPLAY CUE ONLY: the DB now() vs expires_at is the SOLE authority (the atomic `AND expires_at > now()`
// guard in approveRequest / the webhook / the 06-06 sweep). A host clicking Approve one second past the SLA
// is refused server-side regardless of what this shows; on reaching 0 it flips to an "Expired" label and
// fires onExpire — the row is removed on the next revalidatePath, it does NOT silently vanish.
//
// Timer discipline copied from HoldCountdown exactly (eslint react-hooks/set-state-in-effect): the
// setInterval callback is the ONLY setState site; onExpire is read through a ref synced in its own effect;
// suppressHydrationWarning on the digits; role="timer" aria-live="off" so a screen reader is not spammed —
// only the final-hour threshold + expiry announce. Retuned to a PER-MINUTE tick (the horizon is 24h, so a
// per-second tick would be wasteful and jitter the digits).

import * as React from "react";
import { ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
/** Per-MINUTE tick (60_000ms) — NOT per-second: the horizon is up to 24h. */
const TICK_MS = 60_000;

/** "{N}h {M}m" from a remaining-ms count; under 1h drop the hours → "{M}m". Ceil so 1..59s still shows 1m. */
function formatRemaining(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / MINUTE_MS));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours <= 0 ? `${minutes}m` : `${hours}h ${minutes}m`;
}

export function RequestCountdown({
  expiresAt,
  label,
  expiredLabel = "Expired",
  onExpire,
}: {
  expiresAt: string | Date;
  /** The prefix — "Expires in" (host inbox SLA) / "Pay within" (booker payment window). */
  label: string;
  /** Shown once the window lapses (display cue only — the DB clock is the authority). */
  expiredLabel?: string;
  onExpire?: () => void;
}) {
  const target = React.useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [remaining, setRemaining] = React.useState(() => target - Date.now());

  // onExpire is read through a ref so a new callback identity each render never re-subscribes (restarts)
  // the interval. The ref is synced in its own effect (never assigned during render — react-hooks/refs).
  const onExpireRef = React.useRef(onExpire);
  React.useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  React.useEffect(() => {
    // The interval is the ONLY place state is set — never synchronously in the effect body (that would
    // trip react-hooks/set-state-in-effect and loop). It ticks once a minute and fires onExpire once at 0.
    let fired = false;
    const id = window.setInterval(() => {
      const r = target - Date.now();
      setRemaining(r);
      if (r <= 0 && !fired) {
        fired = true;
        window.clearInterval(id);
        onExpireRef.current?.();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [target]);

  const expired = remaining <= 0;
  const finalHour = remaining > 0 && remaining <= HOUR_MS;
  // Announce ONLY when the final hour opens and on expiry — never per-minute (the digits are aria-live="off").
  const announcement = expired
    ? "This window has closed."
    : remaining <= HOUR_MS && remaining > HOUR_MS - TICK_MS
      ? "Under one hour left."
      : "";

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
      <span role="timer" aria-live="off">
        {expired ? (
          expiredLabel
        ) : (
          <>
            {label}{" "}
            {/* suppressHydrationWarning: the server-render minute can differ from the hydration minute. */}
            <span
              className={cn("tabular-nums", finalHour && "text-destructive")}
              suppressHydrationWarning
            >
              {formatRemaining(remaining)}
            </span>
          </>
        )}
      </span>
      {/* SR-only threshold/expiry cue — polite, updated ONLY at the boundary (never every minute). */}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </span>
  );
}
