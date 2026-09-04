// @vitest-environment jsdom

// D-109 — ONE PROBE, AFTER THE CAP, ONCE PER MOUNT. AND THE POLLER IS UNTOUCHED.
//
// `pending-payment-state.tsx` now fires `reconcilePaymentNow` when the poller gives up. Three of the
// four things that can go wrong with an effect like that are invisible to every other suite over this
// surface, because they are all about WHEN and HOW OFTEN a call happens rather than about what renders:
//
//   • firing BEFORE the cap turns a settling page into a provider round trip per mount for every booker
//     whose webhook is perfectly healthy — thousands of pointless PayMongo reads on the happy path;
//   • firing TWICE (React 19 double-invokes effects in development) doubles that and burns the action's
//     own budget on legitimate use;
//   • firing after UNMOUNT is a call on behalf of somebody who left.
//
// The fourth is what the frozen suites already cover: what the surface SAYS. `payment-states.test.tsx`
// and `tests/design/pending-copy.test.ts` both pass here with an EMPTY `git diff --stat`, and that is
// the whole D-102 half of this plan discharged behaviourally — a probe that learns nothing renders
// exactly what shipped before it existed, because there is no new string in the file to render.
//
// ⚠ THE ACTION IS MOCKED, and the mock is the measuring instrument: what is asserted here is the CALL
// COUNT and its timing, never anything about reconciliation, which `tests/booking/reconcile-fast-path.
// test.ts` owns against a real database and a real provider stub. Mocking it also keeps this jsdom file
// from importing the server graph it would otherwise pull in.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════
// TWO DELIBERATE BREAKS, OBSERVED 2026-08-22 — AND THE FIRST ONE DID NOT DO WHAT WAS PREDICTED
// ════════════════════════════════════════════════════════════════════════════════════════════════════
// Both were applied to `src/components/booking/pending-payment-state.tsx`, run, and reverted from a
// saved copy in the scratchpad (never `git checkout --`).
//
// ── BREAK A: the `useRef` latch removed ──────────────────────────────────────────────────────────────
//   if (!slow || !bookingId || probeFired.current) return;  probeFired.current = true;
//     →  if (!slow || !bookingId) return;
//
//    Test Files  1 passed (1)
//         Tests  8 passed (8)
//
//   ⚠ ALL EIGHT STAYED GREEN, INCLUDING CASE (6). The prediction — that StrictMode's double-invoke is
//   what the latch is for, and that removing it would show two probes — is WRONG about this component,
//   and the reason is worth carrying forward: React's double-invoke happens at MOUNT, and at mount
//   `slow` is still false, so the effect returns before it calls anything. The only run that reaches
//   the call is the single update when `slow` flips. The latch is DEFENCE IN DEPTH here, not the
//   load-bearing part, and the component's header now says so rather than repeating the prediction.
//
// ── BREAK B: the effect made to fire on MOUNT (the `!slow` guard removed as well) ─────────────────────
//   if (!bookingId) return;
//
//    ❯ tests/booking/pending-fast-path.test.tsx (8 tests | 6 failed)
//      × (1) …one tick short of it…  AssertionError: expected 8 to be 7
//      × (2) exactly once AT the cap…  expected "vi.fn()" to be called 1 times, but got 2 times
//      × (6) under StrictMode's development double-invoke it is STILL exactly one
//        AssertionError: StrictMode's double-invoke produced two probes…: expected 1 times, got 3 times
//
//   THIS IS THE MEASUREMENT THAT MATTERS. Non-strict read 2 and StrictMode read 3 in the same run, off
//   the same source — so this harness DOES exercise the development double-invoke, case (6) is capable
//   of failing, and the count it asserts is a real one rather than a mount that never doubles. Cases
//   (1), (3), (4) and (5) reddened alongside them, which is also how they are known to be measuring
//   the effect's timing and not just its existence.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// `BookingReference` imports `sonner` at module scope for its copy control (the idiom
// `payment-states.test.tsx` records). Nothing here clicks it.
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// The router is mocked so the poll — and the ONE extra refresh this plan adds after the action settles —
// are both observable AND harmless.
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

// THE MEASURING INSTRUMENT. A resolved closed-enum member, exactly as the real action returns.
const { reconcilePaymentNow } = vi.hoisted(() => ({
  // Typed through the generic rather than by an unused parameter, so `mock.calls[0][0]` is a `string`
  // for case (2) without leaving a lint warning behind.
  reconcilePaymentNow: vi.fn<(bookingId: string) => Promise<"unchanged">>(async () => "unchanged"),
}));
vi.mock("@/app/actions/reconcile-payment", () => ({ reconcilePaymentNow }));

import { PendingPaymentState } from "@/components/booking/pending-payment-state";

const REFERENCE = "FIT-ABCD1234";
const EMAIL = "jane@example.com";
const BOOKING_ID = "bk_fastpath_1";
const T0 = new Date("2026-08-22T04:00:00.000Z");

// Read from the component, not chosen: MAX_ATTEMPTS (8) x POLL_INTERVAL_MS (2500).
const POLL_CAP_MS = 8 * 2500;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  refresh.mockReset();
  reconcilePaymentNow.mockReset();
  reconcilePaymentNow.mockResolvedValue("unchanged");
});

/** Mount on a fake clock, before any threshold has fired. `payment-states.test.tsx`'s harness. */
function mountPending({ omitBookingId = false, strict = false } = {}) {
  // ⚠ NOT a `bookingId = BOOKING_ID` default parameter: passing `undefined` explicitly SELECTS the
  // default in JavaScript, so case (7) would have mounted WITH an id and asserted nothing. Measured.
  const bookingId = omitBookingId ? undefined : BOOKING_ID;
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  const element = (
    <PendingPaymentState reference={REFERENCE} email={EMAIL} bookingId={bookingId} />
  );
  const utils = render(strict ? <React.StrictMode>{element}</React.StrictMode> : element);
  act(() => {
    vi.advanceTimersByTime(0);
  });
  return utils;
}

/**
 * Advance the fake clock AND drain the microtask queue.
 *
 * Both halves are load-bearing: `slow` flips inside an interval callback (timers), and the effect it
 * releases calls a promise-returning action whose `.finally(refresh)` lands in a microtask (not a
 * timer). Advancing alone would leave the refresh unobserved and case (4) would measure nothing.
 */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe("D-109 — the fast path fires exactly once, and only after the poller has given up", () => {
  it("(1) NOT before the cap — one tick short of it, the provider has not been asked on anyone's behalf", async () => {
    mountPending();

    await advance(POLL_CAP_MS - 1);

    // The poller really ran, so the zero below is a decision and not a component that never mounted.
    expect(
      refresh.mock.calls.length,
      "the poller did not tick, so this case is measuring a dead render rather than the fast path's " +
        "timing — every count in this file would then be trivially zero.",
    ).toBe(7);
    expect(
      reconcilePaymentNow,
      "the fast path fired BEFORE the poll cap. On the happy path the webhook lands in seconds, so an " +
        "early probe is a PayMongo round trip per booker for nothing — and the sweep, not this, is what " +
        "guarantees the late ones.",
    ).toHaveBeenCalledTimes(0);
  });

  it("(2) exactly once AT the cap, with the booking id it was handed", async () => {
    mountPending();

    await advance(POLL_CAP_MS);

    expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(8); // the poller's 8, plus the fast path's
    expect(reconcilePaymentNow).toHaveBeenCalledTimes(1);
    expect(
      reconcilePaymentNow.mock.calls[0][0],
      "the effect passed something other than the server-derived id it was given. Nothing on this " +
        "surface may compose an id out of the browser's URL (D-104 / TRUST-02).",
    ).toBe(BOOKING_ID);
  });

  it("(3) and never again — two further minutes past the cap produce no second call", async () => {
    const { container } = mountPending();

    await advance(POLL_CAP_MS);
    expect(reconcilePaymentNow).toHaveBeenCalledTimes(1);

    // Past the escalation threshold too (SUPPORT_ESCALATION_MS = 120s), which re-renders the component
    // — a re-render is exactly the event a latch has to survive.
    await advance(120_000);

    expect(
      reconcilePaymentNow,
      "the probe fired more than once for one mount. D-109 says ONE, and the action's own budget is " +
        "sized for one per mount: a second call per re-render turns a legitimate booker into the " +
        "rate-limited case.",
    ).toHaveBeenCalledTimes(1);
    // …and the escalation threshold really did fire, so the re-render being survived is a real one.
    // (The reference appears TWICE past this threshold — the sentence and `BookingReference` itself —
    // so this reads the escalation line's own wording rather than the string they share.)
    expect(container.textContent).toContain("we've recorded it against this booking");
  });

  it("(4) `router.refresh` is called ONE more time after the action settles — that is the whole output", async () => {
    mountPending();

    // A SYNCHRONOUS `act`, deliberately: `await act(async () => …)` drains the microtask queue on its
    // way out, which would settle the action inside this step and make the count below 9 — measuring
    // the two refreshes together and attributing neither.
    act(() => {
      vi.advanceTimersByTime(POLL_CAP_MS);
    });
    // The poller's own eight, measured BEFORE the microtask queue is drained, so the extra one below is
    // attributable to the action settling and to nothing else.
    const afterPoller = refresh.mock.calls.length;
    expect(afterPoller).toBe(8);

    await act(async () => {
      await Promise.resolve();
    });

    expect(
      refresh.mock.calls.length - afterPoller,
      "the fast path did not ask the RSC to re-read the database after its probe. Without that refresh " +
        "a reconcile that just confirmed the booking would leave the booker on the settling screen " +
        "until the poller's manual control or the next navigation — the accelerant would have " +
        "accelerated nothing.",
    ).toBe(1);
  });

  it("(5) unmounted before the cap — zero calls, because nobody is watching any more", async () => {
    const { unmount } = mountPending();

    await advance(POLL_CAP_MS - 2500);
    unmount();
    await advance(POLL_CAP_MS);

    expect(
      reconcilePaymentNow,
      "a probe fired on behalf of a booker who had already left the page. The poller's own cleanup " +
        "clears its interval on unmount and this effect must not reintroduce work behind it.",
    ).toHaveBeenCalledTimes(0);
  });

  it("(6) under StrictMode's development double-invoke it is STILL exactly one", async () => {
    // The condition the `useRef` latch exists for, asserted rather than assumed: React 19 mounts,
    // unmounts and remounts every effect in development, so an unlatched one-shot fires twice — and
    // "twice in development only" is the shape of bug that reaches production as a support ticket
    // about the rate limiter rather than as a red test.
    mountPending({ strict: true });

    await advance(POLL_CAP_MS);

    expect(
      reconcilePaymentNow,
      "StrictMode's double-invoke produced two probes. The latch is the only thing that makes ONCE " +
        "true rather than usually-true.",
    ).toHaveBeenCalledTimes(1);
  });

  it("(7) with no booking id the accelerant is simply absent — and the surface is unchanged", async () => {
    // The prop is optional (see its own note in the component). This pins what that costs: the fast
    // path does not run, nothing else changes, and the guarantee — the 5-minute sweep — is untouched
    // because it never depended on this surface at all.
    mountPending({ omitBookingId: true });

    await advance(POLL_CAP_MS);

    expect(reconcilePaymentNow).toHaveBeenCalledTimes(0);
    expect(refresh.mock.calls.length).toBe(8); // the poller alone, exactly as it shipped
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Confirming your payment");
  });
});

describe("the real call site passes the id — so `optional` cannot quietly become nobody-passes-it", () => {
  it("(8) the pending checkout-return branch of bookings/[id]/page.tsx hands down `bk.id`", () => {
    // A source assertion deliberately, because the alternative is rendering an RSC that reads a session,
    // a database and a provider. What it protects is narrow and real: the prop's optionality exists to
    // keep a frozen suite typechecking, NOT to make the fast path opt-in, and a call site that dropped
    // it would lose the accelerant with nothing anywhere going red.
    const src = readFileSync(
      resolve(process.cwd(), "src/app/(app)/bookings/[id]/page.tsx"),
      "utf8",
    );
    const branch = src.slice(src.indexOf("<PendingPaymentState"));
    expect(
      branch.slice(0, branch.indexOf("/>")).includes("bookingId={bk.id}"),
      "the pending branch renders <PendingPaymentState> without `bookingId={bk.id}`, so the settling " +
        "screen silently stops probing. The booker still gets their booking — the sweep is the " +
        "guarantee — but up to five minutes later, which is exactly the gap this plan closes.",
    ).toBe(true);
  });
});
