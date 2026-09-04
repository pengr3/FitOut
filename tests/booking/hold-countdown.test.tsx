// @vitest-environment jsdom

// GATE-03 / D-49 (plan 12-03) — THE ANNOUNCE-ONCE PROOF for the checkout header's hold countdown.
//
// WHAT THIS FILE IS FOR, IN ONE SENTENCE. A fifteen-minute countdown is the easiest possible place to
// ship a screen-reader denial of service: put `aria-live` on ticking numerals and the booker hears a
// number spoken over whatever they were reading, once a second, nine hundred times. That defect has no
// visual symptom at all — the page looks perfect — so the only thing that can catch it is a machine
// counting how often a live region's text changed.
//
// THE FOUR CLAIMS, and each one is a separate way the same defect arrives:
//
//   (1) The digits are a `role="timer"` with `aria-live="off"`. The role is what makes the element
//       announce ITSELF as a timer when a user navigates to it; the `off` is what stops it announcing
//       every tick. Both, or neither is worth having.
//   (2) There is EXACTLY ONE polite region in the whole component. Two regions is the double-
//       announcement shape, and it is the realistic one — a second surface adds its own "one minute
//       left" and nobody notices, because both are invisible.
//   (3) The region's text changes EXACTLY ONCE across a full fifteen-minute drive, at the sixty-second
//       threshold. `toBe(1)` and never `toBeGreaterThan(0)`: the whole property is the UPPER bound.
//   (4) The EXPIRED render carries no `role="timer"` and no `aria-live` anywhere. GATE-03 rule 6 gives
//       the expiry announcement to `HoldExpiredState` — the thing that actually replaced the page —
//       and two regions reporting one event is the defect this gate exists to catch.
//
// ⚠️ THE SUBTLETY IN (3) AND (4) TOGETHER, because they look contradictory and are not. The region is
// NOT unmounted at expiry: it keeps its text and loses its `aria-live` attribute. Unmounting would be
// equally silent to a screen reader but would make the region's text "change" to nothing at exactly the
// moment this file is counting changes — a node that disappears is indistinguishable, to a text-change
// counter, from a node that was rewritten. Keeping the node and dropping the attribute is silent AND
// measurable. `hold-countdown.tsx`'s header carries the same argument beside the code.
//
// THE COMPONENT TAKES NO PROPS. It reads the deadline from `HoldProvider`, because in production it
// renders in the checkout LAYOUT's header while the deadline is read in the PAGE — see
// `components/booking/hold-provider.tsx`. So the harness below is the real composition: a provider, the
// page's publisher, and the countdown as siblings.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

import { HoldProvider, useHold } from "@/components/booking/hold-provider";
import { PublishExpiresAt } from "@/components/booking/hold-publisher";
import { HoldCountdown } from "@/components/booking/hold-countdown";

const T0 = new Date("2026-08-18T09:00:00.000Z");
const FIFTEEN_MIN_MS = 15 * 60_000;
const EXPIRES_AT = new Date(T0.getTime() + FIFTEEN_MIN_MS).toISOString();

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Harness({ expiresAt }: { expiresAt: string }) {
  return (
    <HoldProvider>
      <PublishExpiresAt expiresAt={expiresAt} />
      <HoldCountdown />
    </HoldProvider>
  );
}

/**
 * Mount with fake timers already installed and the publisher's effect already flushed.
 *
 * `act` around the render is what runs the publisher's `useEffect`; without it the context is still
 * `null` and the countdown renders its empty box, which would make every assertion below pass or fail
 * for a reason that has nothing to do with the countdown.
 */
function mount(expiresAt = EXPIRES_AT) {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  const utils = render(<Harness expiresAt={expiresAt} />);
  act(() => {
    vi.advanceTimersByTime(0);
  });
  return utils;
}

/** The slot. Exactly one per document — the D-49 contract, asserted before anything is read out of it. */
function slotOf(container: HTMLElement): HTMLElement {
  const slots = container.querySelectorAll('[data-testid="hold-countdown"]');
  expect(
    slots.length,
    `the tree rendered ${slots.length} elements carrying the hold-countdown hook; expected exactly 1. ` +
      `0 means the publisher never wrote a deadline into the context (every assertion in this file ` +
      `would then be about an empty box) or the hook was renamed off the slot.`,
  ).toBe(1);
  return slots[0] as HTMLElement;
}

/**
 * The ONE polite region: a DIRECT child of the slot.
 *
 * The child combinator is doing real work. The timer paragraph holds its own `sr-only` span — the
 * accessible name "Time left to confirm" — and a `.sr-only` query that matched both would report the
 * name's disappearance at expiry as a change in the announcement.
 */
function regionOf(slot: HTMLElement): HTMLElement {
  const region = slot.querySelector(":scope > span.sr-only");
  expect(region, "no sr-only announcement region as a direct child of the countdown slot").not.toBeNull();
  return region as HTMLElement;
}

describe("GATE-03 — the hold countdown announces once and only once", () => {
  it("(1) the digits are a timer that does NOT announce every tick", () => {
    const { container } = mount();
    const slot = slotOf(container);

    const timers = slot.querySelectorAll('[role="timer"]');
    expect(timers.length, "expected exactly one role=timer inside the countdown slot").toBe(1);
    expect(
      timers[0].getAttribute("aria-live"),
      "the digits must be aria-live=off. Anything else announces the mm:ss once a second for the " +
        "whole hold — the specific defect GATE-03 exists to catch.",
    ).toBe("off");

    // Guard the guard: the digits must actually be digits, or "the timer does not announce" is a
    // statement about an empty element.
    expect(slot.textContent, "the timer rendered no mm:ss").toMatch(/\d+:\d{2}/);
  });

  it("(2) there is exactly ONE polite live region in the whole component", () => {
    const { container } = mount();
    const slot = slotOf(container);

    const polite = slot.querySelectorAll('[aria-live="polite"]');
    expect(
      polite.length,
      `the countdown holds ${polite.length} polite regions. Two regions is the double-announcement ` +
        `shape: both are invisible, so a second one is added and nobody notices until a screen-reader ` +
        `user hears the same sentence twice.`,
    ).toBe(1);
    // …and it is the one this file measures.
    expect(polite[0]).toBe(regionOf(slot));
  });

  it("(3) the region's text changes EXACTLY ONCE across a full 15-minute drive, at the threshold", () => {
    const { container } = mount();
    const slot = slotOf(container);
    const region = regionOf(slot);

    const observed: { minuteMark: number; text: string }[] = [
      { minuteMark: 15, text: region.textContent ?? "" },
    ];
    for (let step = 1; step <= 15; step++) {
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      observed.push({ minuteMark: 15 - step, text: region.textContent ?? "" });
    }

    // Guard the guard #1: the drive must actually have reached expiry, or "no change at expiry" is a
    // claim about a step that never happened.
    expect(
      slot.textContent,
      "the 15-minute drive did not reach the expired render — the timer is still ticking, so the " +
        "expiry step below was never taken.",
    ).toContain("Hold expired");

    const changes = observed.filter((s, i) => i > 0 && s.text !== observed[i - 1].text);

    // Guard the guard #2: SOMETHING must have been said, or `toBe(1)` would be one assertion away
    // from passing on a component that announces nothing at all.
    expect(
      changes.length,
      `the region never changed text across the whole 15 minutes. The threshold announcement is the ` +
        `one thing this countdown is allowed to say; zero changes means it says nothing. Observed: ` +
        `${JSON.stringify(observed)}`,
    ).toBeGreaterThan(0);

    expect(
      changes.length,
      `the region's text changed ${changes.length} times. It must change EXACTLY ONCE — this is an ` +
        `UPPER bound, which is why it is toBe(1) and not toBeGreaterThan(0). Every extra change is an ` +
        `extra thing spoken over the booker. Observed: ${JSON.stringify(observed)}`,
    ).toBe(1);

    expect(
      changes[0].minuteMark,
      `the one change landed at ${changes[0].minuteMark} minutes remaining; it must land at 1 (the ` +
        `60-second threshold). Observed: ${JSON.stringify(observed)}`,
    ).toBe(1);
    expect(changes[0].text).toBe("One minute left to confirm your booking.");

    // And the expiry step specifically produced NO change — stated separately from the count, because
    // "1 change somewhere" and "1 change, and it was not at expiry" are different claims.
    const atExpiry = observed[observed.length - 1];
    const beforeExpiry = observed[observed.length - 2];
    expect(
      atExpiry.text,
      `the expiry step changed the region's text from "${beforeExpiry.text}" to "${atExpiry.text}". ` +
        `HoldExpiredState owns the expiry announcement (GATE-03 rule 6); a second region reporting the ` +
        `same event is the defect this file exists to catch.`,
    ).toBe(beforeExpiry.text);
  });

  it("(4) the EXPIRED render carries no role=timer and no aria-live attribute at all", () => {
    const { container } = mount();
    const slot = slotOf(container);

    act(() => {
      vi.advanceTimersByTime(FIFTEEN_MIN_MS + 2_000);
    });

    expect(slot.textContent, "the drive did not reach the expired render").toContain("Hold expired");
    expect(
      slot.querySelectorAll('[role="timer"]').length,
      "an expired hold is not counting down; a role=timer here announces the element as a live timer " +
        "that will never move again.",
    ).toBe(0);
    expect(
      slot.querySelectorAll("[aria-live]").length,
      "the expired render still holds a live region. The page has been replaced by HoldExpiredState, " +
        "whose assertive region announces the expiry — this one would say it a second time.",
    ).toBe(0);
    // The digits are gone with it: the box holds a fact, not a frozen 0:00.
    expect(slot.textContent).not.toMatch(/\d+:\d{2}/);
  });

  it("(5) a tick that jumps STRAIGHT PAST the final minute announces nothing", () => {
    // The backgrounded-tab / closed-lid case. Announcing "one minute left" about a hold that has
    // already expired would be worse than silence, so the threshold latch requires a POSITIVE
    // remainder. Nobody announces the threshold; HoldExpiredState announces the expiry.
    //
    // ⚠️ THE JUMP IS `setSystemTime` + ONE tick, and the distinction is the whole case.
    // `advanceTimersByTime(15min)` RUNS every scheduled tick in order — 900 of them — so it walks
    // through the final minute exactly like a foregrounded tab and case (3) is what that measures.
    // Moving the wall clock and then firing a SINGLE interval is the real laptop-lid shape: one
    // callback, one enormous delta.
    const { container } = mount();
    const slot = slotOf(container);
    const region = regionOf(slot);

    act(() => {
      vi.setSystemTime(new Date(T0.getTime() + FIFTEEN_MIN_MS + 1_000));
      vi.advanceTimersByTime(1_000);
    });

    expect(slot.textContent, "the jump did not reach the expired render").toContain("Hold expired");
    expect(
      region.textContent,
      "a hold that skipped from 15 minutes straight to expiry announced a threshold that never " +
        "arrived.",
    ).toBe("");
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// 12-REVIEW WR-02 — THE HEADER AND THE REST OF THE PAGE AGREE FROM THE FIRST PAINT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A different property from the four above, in the same component, so it gets its own block.
//
// The displayed `expired` state comes from a clock reading taken in a lazy `useState` initializer, so
// this component can render "Hold expired" on its VERY FIRST paint — the hold ran out while the page was
// hydrating. But the thing that tells the REST of the document — `markExpired()` on the shared hold
// context, which is the only input to `ReserveView`'s D-44 whole-page swap — used to be reachable only
// from inside the `setInterval` callback, which does not run until roughly a second after mount. In that
// window the header read "Hold expired" while the price breakdown, the cancellation disclosure and
// `Confirm & pay` were still rendered and pressable.
//
// The cases below are a pair, and the negative is the load-bearing one: the mount check must fire ONLY
// for a deadline that has already passed. A version that reported an expiry on every mount would flip
// every ordinary checkout render into the expiry interstitial — which is both a wrong page and a change
// to a photographed surface.
//
// The probe reads the context rather than the DOM on purpose. What the header PAINTS is case (3)/(4)'s
// subject; what the rest of the page is TOLD is this one's, and they were the two halves that disagreed.

describe("WR-02 — an already-expired deadline is reported to the page at mount, not a tick later", () => {
  const PROBE_ID = "hold-expired-probe";

  /**
   * What `ReserveView` would read, RENDERED rather than captured.
   *
   * Writing the context value into a variable declared outside the component is the obvious shape and
   * the lint rule `react-hooks/immutability` rejects it outright (it is a render-phase write to
   * module-adjacent state — the exact pattern the compiler cannot reason about). Rendering it is also
   * simply more honest: the assertion then reads a value React actually committed, not one a render
   * happened to leave behind. Plain `id`, never a `data-testid`: those are a declared GATE-04 contract
   * over `src/`, and a test fixture has no business appearing in one.
   */
  function Probe() {
    const { expired } = useHold();
    return <span id={PROBE_ID}>{String(expired)}</span>;
  }

  /** Renders the real composition plus that probe. */
  function mountWithProbe(expiresAt: string) {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    const utils = render(
      <HoldProvider>
        <PublishExpiresAt expiresAt={expiresAt} />
        <HoldCountdown />
        <Probe />
      </HoldProvider>,
    );
    // Flushes the publisher's effect, exactly as `mount()` above does. It advances the clock by NOTHING,
    // so the 1-second interval has still never run when the assertions below are made — which is the
    // whole point: the report must not depend on it.
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const seenExpired = () => utils.container.querySelector(`#${PROBE_ID}`)?.textContent ?? null;
    return { ...utils, seenExpired };
  }

  it("(6) reports the expiry before the first interval tick", () => {
    const { container, seenExpired } = mountWithProbe(new Date(T0.getTime() - 1_000).toISOString());

    // Guard the guard: the header must actually be in its expired render, or "the page was told" is a
    // claim about a state nobody is in.
    expect(
      slotOf(container).textContent,
      "the countdown is not showing the expired render, so the disagreement this case is about cannot " +
        "arise and the assertion below would pass for the wrong reason.",
    ).toContain("Hold expired");

    expect(
      seenExpired(),
      "the header renders `Hold expired` and the hold context still says the hold is live. For as long " +
        "as that holds, ReserveView keeps the reserve form on screen — the price, the cancellation " +
        "rungs and a pressable `Confirm & pay` — under a header saying the hold is over. The client " +
        "timer is only a display cue (the server re-checks expires_at on confirm), but one document " +
        "must not contradict itself about whether the booker still has a hold.",
    ).toBe("true");
  });

  it("(7) a LIVE deadline reports nothing at mount", () => {
    const { container, seenExpired } = mountWithProbe(EXPIRES_AT);

    expect(slotOf(container).textContent, "the countdown rendered no mm:ss").toMatch(/\d+:\d{2}/);
    expect(
      seenExpired(),
      "mounting a countdown on a hold with 15 minutes left reported an expiry. That would swap every " +
        "ordinary checkout render for the expiry interstitial — the mount check is conditional on the " +
        "deadline having ALREADY passed, and this is the case that pins the condition.",
    ).toBe("false");
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • jsdom PERFORMS NO LAYOUT. Nothing here says the slot measures 96px, that the header does not
//     reflow between states, or that "Hold expired" fits the reservation. Those are geometry claims and
//     they are measured in a real browser by `e2e/hold-countdown.spec.ts`.
//   • Nothing here proves a screen reader actually stays quiet. A text-change count is a PROXY for an
//     announcement — a good one, because a live region with unchanged text cannot announce, but it is
//     not an AT recording. Phase 17's a11y pass owns breadth.
//   • The drive advances a minute at a time, so it samples 16 of the ~900 renders a real hold produces.
//     A component that announced on some second OTHER than a minute boundary would be invisible here.
//     The mechanism makes that impossible (the message is a latched constant, not a per-tick
//     derivation), which is why the sampling is acceptable rather than merely convenient.
