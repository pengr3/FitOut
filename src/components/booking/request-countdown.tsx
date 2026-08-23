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
// suppressHydrationWarning on the digits. Retuned to a PER-MINUTE tick (the horizon is 24h, so a
// per-second tick would be wasteful and jitter the digits).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// GATE-03 RULE 3 — THE SECOND TICKING REGION, BROUGHT TO THE MODEL'S SHAPE (plan 13-14)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `live-regions.ts`'s NOT-COVERED footer named this file by name for a year: *"Phase 13's
// `request-countdown.tsx` is a SECOND ticking region and rule 3 applies to it identically."* This is
// that discharge. Rule 3 is two mechanisms and they are separate on purpose:
//
//   1. THE DIGITS ARE NOT A LIVE REGION. `role="timer"` + `aria-live="off"`, so the "{N}h {M}m"
//      redraws every minute and announces none of those updates. The role is on the TICKING branch
//      only — an expired window is not counting anything, and `role="timer"` on a frozen "Expired"
//      announces the element as a live timer that will never move again (hold-countdown.tsx makes
//      the same split, and `tests/booking/hold-countdown.test.tsx` case (4) is what pins it there).
//
//   2. THE THRESHOLD MESSAGE LATCHES. Set once, when a tick lands inside the final hour, and NEVER
//      cleared. The shipped version derived it from a one-MINUTE window
//      (`remaining <= HOUR_MS && remaining > HOUR_MS - TICK_MS`), so its text went "" → message → ""
//      — two changes, and the second is a live-region update to empty. A latch changes it once.
//
// THE EXPIRY ARM IS DELETED, AND ITS DELETION IS THE POINT (rule 6, and 13-UI-SPEC § Live Regions
// says it in as many words: "exactly ONE announcement, at the 1-hour mark, and NONE at expiry").
// It used to say "This window has closed." Every surface that mounts this component replaces itself
// when the window closes — `ExpiredApprovalState` on the booker's detail page, the `holdOver` copy in
// `not-completed-state.tsx`, the row `revalidatePath` removes from the host inbox — so keeping the arm
// meant TWO regions reporting ONE event on the same paint. The countdown reports TIME; the state that
// replaced the page reports the EXPIRY.
//
// ON EXPIRY THE REGION KEEPS ITS TEXT AND DROPS ITS `aria-live`, which is the one non-obvious line
// below. Unmounting it would also be silent, but it would make the region's text "change" to nothing
// at exactly the moment the gate measures for a change — a node that disappears is indistinguishable,
// to a text-change counter, from a node that was rewritten.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TWO LAYOUTS, ONE DIGITS NODE (plan 14-03 · D-146)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `emphasis` is the second opt-in prop this component has taken, added exactly the way
// `finalHourEmphasis` was: it DEFAULTS to today's rendering, so the two shipped booker call sites (the
// `approved` payment window and `not-completed-state.tsx`'s hold) are byte-identical after this change.
// Only the host request inbox asks for `"lead"`, where HFLOW-01 requires the deadline to be the loudest
// element on the row and the largest type in it — a hierarchy instruction, not a colour one.
//
// ⚠ THE BRANCH IS ON THE LAYOUT CONTAINER, AND THE DIGITS ELEMENT IS HOISTED SO BOTH ARMS RENDER THE
// SAME ONE. That is a hard constraint rather than a tidiness preference:
// `tests/design/phase13-surface-gates.test.ts` pins this file at ONE line carrying an alarm-hue
// spelling and counts LINES, so a second digits node with its own conditional emphasis expression
// takes the count to two and turns a design gate red for a reason with nothing to do with the design.
// The glyph is hoisted for a smaller reason: one element means one place where it is hidden from
// assistive technology, in both arms, by construction.
//
// The `lead` arm adds NO emphasis expression of its own — the final-hour treatment it renders is the
// hoisted node's, which D-146 explicitly RETAINS on this hours-scale surface.
//
// A COUNTDOWN THAT ARRIVES ALREADY INSIDE ITS FINAL HOUR SAYS NOTHING, and that is this file's one
// departure from the model rather than a gap in it. A fifteen-minute hold NEVER mounts inside its
// threshold, so `hold-countdown.tsx` never had to answer the question; an hours-scale window mounts
// below the line constantly — a booker opening `/bookings/[id]` with 40 minutes left is the ordinary
// case. Announcing "Under one hour left." a minute after that page arrived would be announcing a
// change that did not happen, which is 13-UI-SPEC's rule for this whole phase: *a live region
// announces a CHANGE, and a freshly navigated page is not a change — it is a page.* So the latch can
// only close on a tick that CROSSES the line, and `startedAboveThreshold` records which side of it the
// first render was on. `not-completed-state.tsx` reuses this component on a 15-minute hold, where that
// flag is false at every mount and this region is therefore silent for its whole life.

import * as React from "react";
import { ClockIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
/** Per-MINUTE tick (60_000ms) — NOT per-second: the horizon is up to 24h. */
const TICK_MS = 60_000;

/**
 * THE ONE ANNOUNCEMENT. Latched at the threshold, never cleared, never joined by a second.
 *
 * Deliberately label-agnostic: this component renders under three prefixes ("Expires in", "Pay
 * within", "Slot held for") and a sentence naming any one of them would be wrong on the other two.
 */
const FINAL_HOUR_ANNOUNCEMENT = "Under one hour left.";

/**
 * The `lead` arm's first line — the prefix, muted, at the label role, with the glyph beside it.
 *
 * Hoisted because the expired render and the ticking render both draw it and they sit in different
 * branches; one constant is what keeps the two lines the same line.
 */
const LEAD_LABEL_CLASS = "flex items-center gap-1.5 text-label text-muted-foreground";

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
  finalHourEmphasis = true,
  emphasis = "inline",
  onExpire,
}: {
  expiresAt: string | Date;
  /** The prefix — "Expires in" (host inbox SLA) / "Pay within" (booker payment window). */
  label: string;
  /** Shown once the window lapses (display cue only — the DB clock is the authority). */
  expiredLabel?: string;
  /**
   * Whether the digits take the final-hour emphasis. DEFAULTS TO TODAY'S BEHAVIOUR, so both shipped
   * call sites (the host inbox SLA and the booker payment window) are unchanged in every respect.
   *
   * ⚠ WHY IT EXISTS (plan 13-07). This component was retuned from a 15-minute clone to a 24-hour
   * horizon, and the emphasis below marks the moment a window ENTERS its last hour — a real threshold
   * on an hours-scale window. Mounted on a fifteen-minute hold it is not a threshold at all: the
   * condition is true from the first paint to the last, so the emphasis is permanent, and permanent
   * emphasis is not emphasis. It is also an alarm colour, and 13-UI-SPEC § Color states that this
   * phase's surfaces render none — a checkout that did not finish is not an error the booker caused.
   * `not-completed-state.tsx` is the one call site that opts out, and it says so at the line.
   */
  finalHourEmphasis?: boolean;
  /**
   * Which LAYOUT the countdown draws. DEFAULTS TO TODAY'S BEHAVIOUR, so both shipped booker call
   * sites (the `approved` payment window and the not-completed hold) render byte-identically.
   *
   *   `"inline"` — one line: the glyph, the prefix and the digits, all at the shipped muted label
   *                scale. What every call site got before this prop existed.
   *   `"lead"`   — two lines: the prefix above at the label role in muted ink with the glyph beside
   *                it, the digits beneath at the heading role with tabular figures.
   *
   * ⚠ WHY IT EXISTS (plan 14-03 · D-146). HFLOW-01 asks the host request inbox to be a triage queue
   * whose SLA deadline is the LOUDEST element on the row — outranking the money and the guest name.
   * "Loudest" is a comparison, so it is carried by scale and reading order rather than by a hue: the
   * digits become the largest type in the row and the first thing in it. That is a claim about ONE
   * surface, and the booker's two surfaces would be wrong to make it — a payment window inside a
   * payment page is not competing with anything — so it is opt-in and the host inbox is its only
   * caller.
   *
   * See the header for the one implementation constraint this prop carries: the digits element is
   * hoisted and shared, and only the layout container branches.
   */
  emphasis?: "inline" | "lead";
  onExpire?: () => void;
}) {
  const target = React.useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [remaining, setRemaining] = React.useState(() => target - Date.now());

  // Which side of the threshold the FIRST render was on, seeded from that same single clock reading
  // (`useState(x)` ignores `x` on every render after the first, so this is the mount value and stays
  // it). A lazy initializer rather than a `Date.now()` in the render body — `react-hooks/purity` fails
  // the build on the latter — and a state rather than a ref, because assigning a ref during render
  // trips `react-hooks/refs`. See the header: a window that ARRIVES inside its final hour has not
  // changed, so nothing about it is announced.
  const [startedAboveThreshold] = React.useState(remaining > HOUR_MS);
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
    // trip react-hooks/set-state-in-effect and loop). It ticks once a minute and fires onExpire once at 0.
    let fired = false;
    const id = window.setInterval(() => {
      const r = target - Date.now();
      setRemaining(r);
      // `r > 0` is load-bearing, not a null guard: a tick that jumps STRAIGHT PAST the final hour (a
      // backgrounded tab, a laptop lid) must not announce "under one hour left" about a window that
      // has already closed. `startedAboveThreshold` is the other guard — see the header.
      if (startedAboveThreshold && r > 0 && r <= HOUR_MS) setAnnounced(true);
      if (r <= 0 && !fired) {
        fired = true;
        window.clearInterval(id);
        onExpireRef.current?.();
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [target, startedAboveThreshold]);

  const expired = remaining <= 0;
  const finalHour = remaining > 0 && remaining <= HOUR_MS;
  const lead = emphasis === "lead";

  // THE ONE DIGITS NODE. Hoisted rather than written once per layout arm — see the header: the design
  // gate counts LINES carrying an alarm-hue spelling in this file and pins it at one, so a second
  // conditional emphasis expression is a red gate, and two nodes drifting apart is the defect under
  // that. `suppressHydrationWarning`: the server-render minute can differ from the hydration minute.
  const digits = (
    <span
      className={cn(
        lead ? "text-heading tabular-nums" : "tabular-nums",
        finalHour && finalHourEmphasis && "text-destructive",
      )}
      suppressHydrationWarning
    >
      {formatRemaining(remaining)}
    </span>
  );

  // Hoisted for the same reason in miniature: ONE element, so it is hidden from assistive technology
  // in both arms by construction rather than by two authors remembering.
  const glyph = <ClockIcon className="size-4 shrink-0" aria-hidden="true" />;

  // THE ONE TIMER ELEMENT, hoisted for a reason the design system enforces rather than for symmetry.
  // `live-regions.ts` declares exactly ONE timer region in this file (`request-countdown-digits`,
  // `kind: "timer", at: 1`) and `tests/design/live-regions.test.tsx` reads the SOURCE, not the render —
  // so a second `role="timer"` written into the other layout arm is an UNDECLARED live region even
  // though the two can never be on screen together. Watched failing on this plan's first draft:
  //
  //   PRESENT BUT UNDECLARED (a live region shipped with no stated reason):
  //   src/components/booking/request-countdown.tsx:271 — timer#2 on <span> (role="timer")
  //
  // Only the layout branches; the role, its politeness and its contents are written once.
  const ticking = (
    <span role="timer" aria-live="off" className={lead ? "block" : undefined}>
      {lead ? (
        <span className={LEAD_LABEL_CLASS}>
          {glyph}
          {label}
        </span>
      ) : (
        <>{label} </>
      )}
      {digits}
    </span>
  );

  // THE ONE REGION. Its text changes at most once — at the threshold, and only for a countdown that
  // was above it when it mounted — and the expiry drops the `aria-live` attribute while leaving the
  // text alone. See the header for all three halves. Hoisted so that both layout arms render exactly
  // one of it; `tests/booking/request-countdown.test.tsx`'s `regionOf` fails loudly on two.
  const announcement = (
    <span className="sr-only" aria-live={expired ? undefined : "polite"}>
      {announced ? FINAL_HOUR_ANNOUNCEMENT : ""}
    </span>
  );

  if (lead) {
    // The host inbox's two-line block (D-146). The prefix and the glyph on the first line at the
    // label role, the digits beneath at the heading role — the largest type in the row, and first in
    // its reading order. The expired/ticking split below is the SAME split the inline arm makes, for
    // the same rule-3 reason: an expired window counts nothing, so there is no timer to identify.
    return (
      <span className="block">
        {expired ? (
          <span className={LEAD_LABEL_CLASS}>
            {glyph}
            {expiredLabel}
          </span>
        ) : (
          ticking
        )}
        {announcement}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      {glyph}
      {expired ? (
        // No role and no live region — just the fact. An expired window counts nothing, so there is
        // no timer here to identify (rule 3, and hold-countdown.tsx's expired branch does the same).
        <span>{expiredLabel}</span>
      ) : (
        ticking
      )}
      {announcement}
    </span>
  );
}
