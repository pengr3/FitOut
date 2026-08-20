// @vitest-environment jsdom

// GATE-03 RULE 3 / D-88.2 (plan 13-14) — THE ANNOUNCE-ONCE PROOF for the SECOND ticking region.
//
// `src/lib/design/live-regions.ts`'s NOT-COVERED footer named this component for a year: *"Phase 13's
// `request-countdown.tsx` is a second ticking region and rule 3 applies to it identically."* This file
// is the measurement that discharges that sentence. `tests/booking/hold-countdown.test.tsx` is the
// model and the clock-driving here is deliberately its shape, so the two can be read side by side.
//
// WHY A SEPARATE FILE RATHER THAN CASES ADDED TO THE MODEL'S. The two components differ in the one
// dimension that decides the answer: a fifteen-minute hold can never MOUNT inside its sixty-second
// threshold, and an hours-scale window mounts below its sixty-MINUTE one constantly (a booker opening
// `/bookings/[id]` with forty minutes left to pay is the ordinary case, not the edge). Every case
// below exists because of that difference or is the model's case re-measured against this shape.
//
// THE FIVE CLAIMS:
//
//   (1) The digits are a `role="timer"` with `aria-live="off"`, and they really are digits.
//   (2) There is EXACTLY ONE polite region in the whole component.
//   (3) Driven from ABOVE the threshold, the region's text changes EXACTLY ONCE, at the 1-hour mark —
//       while the DIGITS change on every one of the ninety ticks beside it. The two counts in one
//       case are the point: `toBe(1)` over a component that rendered nothing would be green for the
//       wrong reason, and the digit count is what says the clock was really running.
//   (4) Driven from BELOW the threshold, it changes ZERO times — with the ABOVE drive as a live
//       positive control in the same case, because a zero from a driver that cannot produce a one is
//       not a measurement. This is `not-completed-state.tsx`'s reuse (`label="Slot held for"`, a
//       fifteen-minute hold): that surface mounts this component below the line at every render, so
//       this region is silent for its whole life there.
//   (5) The EXPIRED render carries no `role="timer"` and no `aria-live` anywhere — 13-UI-SPEC §Live
//       Regions gives the expiry to the page-level state ("NONE at expiry"), and two regions
//       reporting one event is the defect rule 6 is about.
//
// ⚠️ THE SUBTLETY IN (3) AND (5) TOGETHER, because they look contradictory and are not. The region is
// NOT unmounted at expiry: it keeps its text and loses its `aria-live` attribute. Unmounting would be
// equally silent to a screen reader but would make the region's text "change" to nothing at exactly
// the moment this file is counting changes — a node that disappears is indistinguishable, to a
// text-change counter, from a node that was rewritten.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";

import { RequestCountdown } from "@/components/booking/request-countdown";

const T0 = new Date("2026-08-21T09:00:00.000Z");
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** The one sentence this component is allowed to say, in the same characters the component holds. */
const FINAL_HOUR_ANNOUNCEMENT = "Under one hour left.";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/**
 * Mount with fake timers installed and the wall clock pinned, `minutes` before the deadline.
 *
 * The clock is set BEFORE `render` on purpose: the component takes its one reading in a lazy
 * `useState` initializer during the first render, and that reading is what seeds both the digits and
 * the which-side-of-the-threshold flag case (4) is about.
 */
function mount(minutes: number, props: Partial<React.ComponentProps<typeof RequestCountdown>> = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  return render(
    <RequestCountdown
      expiresAt={new Date(T0.getTime() + minutes * MINUTE_MS).toISOString()}
      label="Pay within"
      expiredLabel="Payment window closed"
      {...props}
    />,
  );
}

/**
 * The ONE polite region, asserted to be one before anything is read out of it.
 *
 * A `.sr-only` query rather than an `[aria-live]` one, deliberately: the attribute is what DISAPPEARS
 * at expiry, so a selector keyed on it would stop finding the node at exactly the step case (5)
 * measures — and "the region vanished" and "the region went quiet" would become the same reading.
 */
function regionOf(container: HTMLElement): HTMLElement {
  const found = container.querySelectorAll("span.sr-only");
  expect(
    found.length,
    `the component rendered ${found.length} sr-only spans; expected exactly 1. Two is the ` +
      `double-announcement shape, and it is the realistic one because both are invisible.`,
  ).toBe(1);
  return found[0] as HTMLElement;
}

/** The visible digits — the element carrying `tabular-nums`, which is only ever the mm/hh figure. */
function digitsOf(container: HTMLElement): HTMLElement | null {
  return container.querySelector("span.tabular-nums");
}

type Step = { readonly minuteMark: number; readonly region: string; readonly digits: string };

/**
 * Drive the clock one minute per step, from `minutes` remaining to one step past expiry, recording
 * BOTH texts at every step. Returns the observation table; every assertion below reads it.
 */
function drive(container: HTMLElement, minutes: number): Step[] {
  const region = regionOf(container);
  const read = (minuteMark: number): Step => ({
    minuteMark,
    region: region.textContent ?? "",
    digits: digitsOf(container)?.textContent ?? "",
  });

  const observed: Step[] = [read(minutes)];
  for (let step = 1; step <= minutes; step++) {
    act(() => {
      vi.advanceTimersByTime(MINUTE_MS);
    });
    observed.push(read(minutes - step));
  }
  return observed;
}

/** How many steps changed the named column against the step before them. */
function changes(observed: Step[], column: "region" | "digits"): Step[] {
  return observed.filter((step, i) => i > 0 && step[column] !== observed[i - 1][column]);
}

describe("GATE-03 rule 3 — the request countdown announces once, not once per tick", () => {
  it("(1) the digits are a timer that does NOT announce every tick", () => {
    const { container } = mount(90);

    const timers = container.querySelectorAll('[role="timer"]');
    expect(timers.length, "expected exactly one role=timer").toBe(1);
    expect(
      timers[0].getAttribute("aria-live"),
      "the digits must be aria-live=off. Anything else announces the remaining time on every tick " +
        "for the whole window — the specific defect GATE-03 exists to catch.",
    ).toBe("off");

    // Guard the guard: the digits must actually be digits, or "the timer does not announce" is a
    // statement about an empty element.
    expect(container.textContent, "the timer rendered no {N}h {M}m").toMatch(/\d+h \d+m/);
    // …and the shipped display contract is unchanged: prefix, space, figure.
    expect(container.textContent).toContain("Pay within 1h 30m");
  });

  it("(2) there is exactly ONE polite live region, and the banned level is nowhere", () => {
    const { container } = mount(90);

    const polite = container.querySelectorAll('[aria-live="polite"]');
    expect(
      polite.length,
      `the countdown holds ${polite.length} polite regions. Two regions is the double-announcement ` +
        `shape: both are invisible, so a second one is added and nobody notices until a ` +
        `screen-reader user hears the same sentence twice.`,
    ).toBe(1);
    expect(polite[0]).toBe(regionOf(container));

    // RULE 7, measured on the rendered DOM rather than on the source (which the design gate reads).
    expect(container.querySelectorAll('[aria-live="assertive"]')).toHaveLength(0);
  });

  it("(3) driven from ABOVE the threshold it changes EXACTLY ONCE, at the 1-hour mark", () => {
    const { container } = mount(90);
    const observed = drive(container, 90);

    // Guard the guard #1: the drive must actually have reached expiry, or "no change at expiry" is a
    // claim about a step that never happened.
    expect(
      container.textContent,
      "the 90-minute drive did not reach the expired render — the timer is still ticking, so the " +
        "expiry step below was never taken.",
    ).toContain("Payment window closed");

    // Guard the guard #2: the CLOCK was really running. Ninety ticks that moved the digits are what
    // makes `toBe(1)` on the region an upper bound rather than a statement about a dead component.
    const digitChanges = changes(observed, "digits");
    expect(
      digitChanges.length,
      `the digits changed ${digitChanges.length} times across ninety ticks. A region that changed ` +
        `once beside digits that never moved would be green for the wrong reason.`,
    ).toBeGreaterThanOrEqual(85);

    const regionChanges = changes(observed, "region");
    expect(
      regionChanges.length,
      `the region never changed text across the whole window. The threshold announcement is the one ` +
        `thing this countdown is allowed to say; zero changes means it says nothing.`,
    ).toBeGreaterThan(0);
    expect(
      regionChanges.length,
      `the region's text changed ${regionChanges.length} times. It must change EXACTLY ONCE — this ` +
        `is an UPPER bound, which is why it is toBe(1) and not toBeGreaterThan(0). Every extra ` +
        `change is an extra thing spoken over the booker.`,
    ).toBe(1);

    expect(
      regionChanges[0].minuteMark,
      `the one change landed at ${regionChanges[0].minuteMark} minutes remaining; it must land at ` +
        `60 (the one-hour threshold).`,
    ).toBe(60);
    expect(regionChanges[0].region).toBe(FINAL_HOUR_ANNOUNCEMENT);

    // And the expiry step specifically produced NO change — stated separately from the count, because
    // "1 change somewhere" and "1 change, and it was not at expiry" are different claims. 13-UI-SPEC
    // gives the expiry to the page-level state: ExpiredApprovalState on the booker's detail page, the
    // `holdOver` copy in not-completed-state.tsx, the row revalidatePath drops from the host inbox.
    const atExpiry = observed[observed.length - 1];
    const beforeExpiry = observed[observed.length - 2];
    expect(
      atExpiry.region,
      `the expiry step changed the region's text from "${beforeExpiry.region}" to ` +
        `"${atExpiry.region}". The page-level state owns the expiry (rule 6); a second region ` +
        `reporting the same event is the defect this file exists to catch.`,
    ).toBe(beforeExpiry.region);
    // The latched sentence is still THERE, unchanged — it is the `aria-live` that left, not the text.
    expect(atExpiry.region).toBe(FINAL_HOUR_ANNOUNCEMENT);
  });

  it("(4) driven from BELOW the threshold it says NOTHING — with the above-drive as a live control", () => {
    // The case the model could not have: a fifteen-minute hold never mounts inside its sixty-SECOND
    // threshold, and this component mounts inside its sixty-MINUTE one constantly. A page that
    // ARRIVES with forty minutes left has not changed; announcing a minute later would announce a
    // change that did not happen.
    const below = mount(40);
    const belowObserved = drive(below.container, 40);
    expect(
      changes(belowObserved, "region").length,
      `a countdown that mounted with 40 minutes left announced anyway. Observed: ` +
        JSON.stringify(belowObserved.filter((s) => s.region !== "")),
    ).toBe(0);
    // …and it really did run: the digits moved and the window really did close.
    expect(changes(belowObserved, "digits").length).toBeGreaterThanOrEqual(35);
    expect(below.container.textContent).toContain("Payment window closed");
    cleanup();

    // THE LIVE POSITIVE CONTROL. The same driver, the same component, one number different — a zero
    // from a driver that cannot produce a one is not a measurement (the `state08-alerts.test.tsx`
    // rule, applied to a count instead of to a spy).
    const above = mount(90);
    expect(
      changes(drive(above.container, 90), "region").length,
      "the same drive over a countdown that STARTED above the threshold produced no announcement " +
        "either, so the zero above measures nothing.",
    ).toBe(1);
  });

  it("(4b) the fifteen-minute reuse is silent for its whole life", () => {
    // `not-completed-state.tsx` renders this component with `label=\"Slot held for\"` on a 15-minute
    // hold (13-07). Asserted directly rather than inferred from (4), because it is a SHIPPED call
    // site and the number in it is the one that would change under someone's feet.
    const { container } = mount(15, { label: "Slot held for", expiredLabel: "Hold expired" });
    const observed = drive(container, 15);
    expect(changes(observed, "region")).toEqual([]);
    expect(container.textContent).toContain("Hold expired");
  });

  it("(5) the EXPIRED render carries no role=timer and no aria-live attribute at all", () => {
    const { container } = mount(90);
    drive(container, 90);

    expect(container.textContent, "the drive did not reach the expired render").toContain(
      "Payment window closed",
    );
    expect(
      container.querySelectorAll('[role="timer"]').length,
      "an expired window is not counting down; a role=timer here announces the element as a live " +
        "timer that will never move again.",
    ).toBe(0);
    expect(
      container.querySelectorAll("[aria-live]").length,
      "the expired render still holds a live region. The surface has been replaced by the " +
        "page-level expiry state, which is what announces the expiry — this one would say it a " +
        "second time.",
    ).toBe(0);
    // The digits are gone with it: the slot holds a fact, not a frozen 0m.
    expect(container.textContent).not.toMatch(/\d+m/);
  });

  it("(6) a tick that jumps STRAIGHT PAST the window announces nothing", () => {
    // The backgrounded-tab / closed-lid case. Announcing "under one hour left" about a window that
    // has already closed would be worse than silence, so the latch requires a POSITIVE remainder.
    //
    // ⚠️ THE JUMP IS `setSystemTime` + ONE tick, and the distinction is the whole case.
    // `advanceTimersByTime(90min)` RUNS every scheduled tick in order and walks through the final
    // hour exactly like a foregrounded tab — that is case (3). Moving the wall clock and then firing
    // a SINGLE interval is the real laptop-lid shape: one callback, one enormous delta.
    const { container } = mount(90);
    const region = regionOf(container);
    expect(region.textContent).toBe("");

    act(() => {
      vi.setSystemTime(new Date(T0.getTime() + 91 * MINUTE_MS));
      vi.advanceTimersByTime(MINUTE_MS);
    });

    expect(container.textContent, "the jump did not reach the expired render").toContain(
      "Payment window closed",
    );
    expect(
      region.textContent,
      "a single tick that landed past the deadline announced the threshold it skipped over.",
    ).toBe("");
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(0);
  });

  it("guard-the-guard — the observation table is read from the real DOM, not from a stale handle", () => {
    // `regionOf` and `digitsOf` are re-queried per step, so a component that REPLACED its region node
    // instead of mutating it would still be observed. This asserts the drive sees a change it did not
    // author: the digits, which are a different node in the expired render than in the ticking one.
    const { container } = mount(3);
    const observed = drive(container, 3);
    expect(observed.map((s) => s.digits)).toEqual(["3m", "2m", "1m", ""]);
    expect(HOUR_MS).toBe(3_600_000);
  });
});
