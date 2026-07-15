"use client";

// HoldCountdown (D-44/D-47) — a client 15-min countdown from the hold's expiresAt. The client timer is a
// DISPLAY CUE ONLY: the server re-checks expires_at > now() on confirm (the sole expiry authority — see
// confirmBooking). On reaching 0 it flips the page into the expiry state via onExpire (it does NOT silently
// vanish). Neutral by default; the ONLY optional --destructive use this phase is the numerals in the final
// 60s (icon + label persist — never color-only, a11y). role="timer" + aria-live="off" on the digits so a
// screen reader is not spammed every second; only the final-minute threshold + the expiry state announce.
//
// Structural analog: the availability-calendar "use client" state shell (78-139).

import * as React from "react";
import { ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const FINAL_MINUTE_MS = 60_000;

/** mm:ss from a remaining-millisecond count (clamped at 0; ceil so 1..999ms still shows 0:01). */
function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function HoldCountdown({
  expiresAt,
  onExpire,
}: {
  expiresAt: string | Date;
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
    // trip react-hooks/set-state-in-effect and loop). It ticks once a second and fires onExpire once at 0.
    let fired = false;
    const id = window.setInterval(() => {
      const r = target - Date.now();
      setRemaining(r);
      if (r <= 0 && !fired) {
        fired = true;
        window.clearInterval(id);
        onExpireRef.current?.();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const expired = remaining <= 0;
  const finalMinute = remaining > 0 && remaining <= FINAL_MINUTE_MS;
  // Announce ONLY at the 60s threshold and on expiry — never per-second (the digits are aria-live="off").
  const announcement = expired
    ? "Your hold has expired."
    : remaining <= FINAL_MINUTE_MS && remaining > FINAL_MINUTE_MS - 1000
      ? "One minute left to confirm your booking."
      : "";

  return (
    <div className="space-y-1">
      <p role="timer" aria-live="off" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
        <span>
          {finalMinute && "Finish soon — "}
          Held for{" "}
          {/* suppressHydrationWarning: the server-render second can differ from the hydration second. */}
          <span className={cn("tabular-nums", finalMinute && "text-destructive")} suppressHydrationWarning>
            {formatRemaining(remaining)}
          </span>
        </span>
      </p>
      <p className="text-xs text-muted-foreground">We&apos;re holding this slot while you review.</p>
      {/* SR-only threshold/expiry cue — polite, updated ONLY at the boundary (never every second). */}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
