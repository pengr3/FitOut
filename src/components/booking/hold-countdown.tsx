"use client";

// HoldCountdown (D-44/D-47 · D-49 · GATE-03) — the checkout HEADER's live hold countdown. The client
// timer is a DISPLAY CUE ONLY: the server re-checks expires_at > now() on confirm (the sole expiry
// authority — see confirmBooking, T-12-03-CLIENTAUTH). On reaching 0 it publishes `expired` into the
// hold context (it does NOT silently vanish) and `ReserveView` flips the page into the calm expiry
// state.
//
// PLAN 12-03 — THIS RENDERS IN THE HEADER, NOT IN THE RAIL (D-49). It takes NO props: the deadline
// arrives through `useHold()` because a layout cannot receive props from its page, and the expiry
// travels back the same way through `markExpired()`. The whole composition argument lives in
// `components/booking/hold-provider.tsx`; it is not restated here, because one copy is the point.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// GATE-03 — ONE ANNOUNCEMENT IN THIS COMPONENT'S WHOLE LIFE, AND NONE AT EXPIRY
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A screen reader must hear from this countdown EXACTLY ONCE across a fifteen-minute hold: at the
// sixty-second threshold. Two mechanisms carry that, and they are separate on purpose.
//
//   1. THE DIGITS ARE NOT A LIVE REGION. `role="timer"` + `aria-live="off"` means the mm:ss updates
//      once a second and announces none of them. A naive `aria-live` on ticking numerals speaks over
//      the booker every second for fifteen minutes, which is the specific defect GATE-03 exists to
//      catch.
//   2. THE THRESHOLD MESSAGE LATCHES. It is set once, when a tick lands inside the final minute, and
//      is NEVER cleared. The shipped version derived it from a one-second WINDOW
//      (`remaining <= 60_000 && remaining > 59_000`), so its text went "" → message → "" — two changes,
//      and the second one is a live-region update to empty that some screen readers voice as silence
//      and others voice as an interruption. A latch changes the text once and leaves it.
//
// THE EXPIRY ARM OF THAT MESSAGE IS DELETED, AND ITS DELETION IS THE POINT (GATE-03 rule 6). It used
// to read `expired ? "Your hold has expired." : …`. The thing that actually replaced the page is
// `HoldExpiredState`, whose `role="status"` region announces the expiry and which also moves focus —
// so keeping the arm here meant TWO regions reporting ONE event on the same paint. That is the
// double-announcement GATE-03 is about, and it is not decorative: the booker hears the same fact
// twice, with a gap in between. The countdown reports TIME; the state that replaced the page reports
// the EXPIRY.
//
// WHEN THIS COMMENT WAS FIRST WRITTEN THE OTHER REGION ALSO USED THE INTERRUPTING POLITENESS LEVEL,
// which made the doubling worse still. Plan 12-06 banned that level across the whole booker path and
// `hold-expired-state.tsx` now carries the role alone; the sentence above is corrected rather than
// deleted because the argument for deleting the arm never depended on the level.
//
// ON EXPIRY THE REGION KEEPS ITS TEXT AND LOSES ITS `aria-live`, which is the one non-obvious line in
// this file. Unmounting it would ALSO be silent, but it would make the region's text "change" from the
// threshold message to nothing at exactly the moment the gate is measuring for a change — the
// automated proof of announce-once is a text-change count on a DOM node, and a node that disappears
// is indistinguishable from a node that was rewritten. Keeping the node with unchanged text and
// dropping the attribute is silent to a screen reader (an element that is no longer a live region
// announces nothing, and removing the attribute is not itself an update) AND measurable.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE BOX, AND WHY THERE ARE TWO COMPONENTS IN THIS FILE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The slot is `HOLD_COUNTDOWN_BOX` (32 × 96px, plan 12-01) and it is right-anchored inside the
// header's actions slot. All four states — empty, ticking, final minute, expired — live inside that
// one reservation, so the header cannot reflow once per session as the hold runs down. The
// `data-testid` is on the BOX and is a STRING LITERAL because the GATE-04 collector is an AST walk
// over literal JSX attribute values; a computed one is invisible to it and would fail three
// assertions at once (`src/lib/design/selector-contract.ts` carries the row and the reason).
//
// `expiresAt` is null on the server render and arrives AFTER mount (the page's publisher writes it in
// an effect), so the ticking half cannot seed its state at the outer component's first render. Its
// clock reading MUST come from a lazy `useState` initializer rather than from a `Date.now()` during
// render — `react-hooks/purity` fails the build on the latter, and it is right to. Splitting the
// ticking half out and giving it `key={expiresAt}` means it MOUNTS the moment the deadline lands, so
// its initializer runs then, with the real target already in hand. One deadline, one timer instance.
//
// The final 60s turns the numerals `text-destructive` — the ONLY destructive use on this path, and
// never the sole carrier of the meaning, because the threshold announcement fires at the same moment.

import * as React from "react";
import { ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOLD_COUNTDOWN_BOX } from "@/lib/design/measurements";
import { useHold } from "@/components/booking/hold-provider";

const FINAL_MINUTE_MS = 60_000;

/** The ONE announcement. Latched at the threshold, never cleared, never joined by a second. */
const FINAL_MINUTE_ANNOUNCEMENT = "One minute left to confirm your booking.";

/** mm:ss from a remaining-millisecond count (clamped at 0; ceil so 1..999ms still shows 0:01). */
function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function HoldCountdown() {
  const { expiresAt, markExpired } = useHold();

  return (
    <div
      data-testid="hold-countdown"
      className={cn(HOLD_COUNTDOWN_BOX, "flex items-center justify-end gap-1.5 text-sm")}
    >
      {expiresAt === null ? null : (
        <LiveCountdown key={expiresAt} expiresAt={expiresAt} onExpire={markExpired} />
      )}
    </div>
  );
}

function LiveCountdown({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const target = React.useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [remaining, setRemaining] = React.useState(() => target - Date.now());
  // The latch. Set once, from inside the tick, and never unset — see the header.
  const [announced, setAnnounced] = React.useState(false);

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
      // `r > 0` is load-bearing, not a null guard: a tick that jumps STRAIGHT PAST the final minute
      // (a backgrounded tab, a laptop lid) must not announce "one minute left" about a hold that has
      // already expired. In that case nobody announces the threshold and HoldExpiredState announces
      // the expiry, which is the correct pair of statements.
      if (r > 0 && r <= FINAL_MINUTE_MS) setAnnounced(true);
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

  return (
    <>
      {expired ? (
        // No role, no live region, no digits — just the fact, inside the same reserved box.
        <span className="whitespace-nowrap text-muted-foreground">Hold expired</span>
      ) : (
        <p
          role="timer"
          aria-live="off"
          className="flex items-center gap-1.5 text-muted-foreground"
        >
          <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
          {/* The name the digits alone cannot carry: "14:52" in a header says nothing about what is
              counting down. Visually the clock glyph says it; this is that glyph's text. */}
          <span className="sr-only">Time left to confirm</span>
          {/* suppressHydrationWarning: the server-render second can differ from the hydration second. */}
          <span
            className={cn("tabular-nums", finalMinute && "text-destructive")}
            suppressHydrationWarning
          >
            {formatRemaining(remaining)}
          </span>
        </p>
      )}
      {/* THE ONE REGION. Its text changes exactly once — at the threshold — and the expiry drops the
          `aria-live` attribute while leaving the text alone. See the header for both halves. */}
      <span className="sr-only" aria-live={expired ? undefined : "polite"}>
        {announced ? FINAL_MINUTE_ANNOUNCEMENT : ""}
      </span>
    </>
  );
}
