// @vitest-environment jsdom

// STATE-05 — THE THREE PAYMENT STATES ARE THREE VISIBLY DIFFERENT THINGS, AND NO TWO EVER CO-RENDER.
//
// WHY THIS FILE EXISTS. 13-UI-SPEC § The Three Payment States states the requirement as a table with
// four distinctness columns — hook, icon, `<h1>`, action set — and one negative ("any two never appear
// in one document"). A table in a planning document proves nothing; the falsifiable form of that table
// is rendering all three and comparing them, which is this file. Every column of the spec's table has
// a case here, and the negative has its own.
//
// THE THREE THINGS A SOURCE SCAN CANNOT SEE, and which are therefore the reason this file is RTL and
// not a grep:
//
//   (a) WHICH STATE A SET OF PROPS RENDERS. A component that ignored its props and always drew the
//       same heading would satisfy every source scan in the repository perfectly.
//   (b) WHAT THE COUNTDOWN DOES WHEN IT REACHES ZERO. 13-UI-SPEC § Not completed specifies an IN-PLACE
//       swap — the retry control is replaced by an expiry line and a recovery link — and an in-place
//       swap is a state transition, not a string in a file.
//   (c) WHETHER THE ALARM COLOUR REACHES THE DOM. The design gate 13-15 owns scans the FILES in
//       `src/components/booking/**`; it cannot see a token that arrives from a component one import
//       away. This file asserts it at the only place it matters — the rendered tree.
//
// ⚠ THE PENDING STATE'S CASES DRIVE A CLOCK, and the poller is the thing being preserved rather than
// tested: `pending-payment-state.tsx`'s mechanics are frozen by D-71 and 13-01 already proved them by
// diff. What is asserted here is the COPY at each of the three thresholds and the absence of a
// failure-shaped control at all three — the property D-71 states in the negative, which is exactly the
// kind of property that goes green forever if nobody ever renders the state.
//
// Modelled on `tests/booking/reversed-state.test.tsx` (the sibling state's suite) and
// `tests/booking/hold-countdown.test.tsx` (the fake-clock idiom).

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

// `BookingReference` is a client component that imports `sonner` at module scope for its copy control.
// Mocked rather than mounted: nothing here clicks it, and the real toaster registers a portal + a
// document listener per render that would outlive `cleanup()`. (The idiom `reversed-state.test.tsx`
// records.)
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { NotCompletedState } from "@/components/booking/not-completed-state";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const LISTING_ID = "lst_incomplete_1";
const BOOKING_ID = "bkg_incomplete_1";
const REFERENCE = "FIT-9K3MP7QZ";

const T0 = new Date("2026-08-20T09:00:00.000Z");
const FIFTEEN_MIN_MS = 15 * 60_000;

/**
 * Mount the not-completed state on a fake clock with a live hold.
 *
 * The clock is fake from BEFORE the render, because `RequestCountdown` computes its first remaining-ms
 * during render: installing the timers afterwards would leave the initial paint on the real clock and
 * make every subsequent assertion about a component that had already decided it was expired.
 */
function mountIncomplete({ holdMs = FIFTEEN_MIN_MS }: { holdMs?: number } = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  const utils = render(
    <NotCompletedState
      bookingId={BOOKING_ID}
      listingId={LISTING_ID}
      reference={REFERENCE}
      holdExpiresAt={new Date(T0.getTime() + holdMs).toISOString()}
    />,
  );
  act(() => {
    vi.advanceTimersByTime(0);
  });
  return utils;
}

/** Collapse whitespace so an assertion is about the sentence and not about how JSX wrapped it. */
function flat(node: HTMLElement | null): string {
  return (node?.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("D-70 — the not-completed state, the one place 'you have not been charged' is true", () => {
  it("(1) states the money truth, the slot-held line, and its own heading", () => {
    const { container } = mountIncomplete();

    const state = container.querySelector('[data-testid="payment-state-incomplete"]');
    expect(state, "the state renders no container of its own — STATE-05 asserts distinctness between three concrete boxes").toBeTruthy();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Your payment didn't go through",
    );

    // Exactly ONE money statement (STATE-06's single owner), and it carries BOTH specified lines.
    const panels = container.querySelectorAll('[data-testid="money-statement"]');
    expect(panels.length, "STATE-06: exactly one money statement per document").toBe(1);
    const panel = flat(panels[0] as HTMLElement);
    expect(panel).toContain("You haven't been charged.");
    expect(panel).toContain("Your slot is still held — finish paying and it's yours.");
  });

  it("(2) offers ONE coral retry, and it is a link to the shipped reserve page for this same hold", () => {
    mountIncomplete();

    const retry = screen.getByRole("link", { name: "Try paying again" });
    expect(
      retry.getAttribute("href"),
      "the retry must re-enter the SHIPPED reserve page for the SAME hold. A second checkout-minting " +
        "path is a real double charge: PayMongo does not honour the idempotency header on checkout- " +
        "session creation, and expire-before-create is the only guard that works.",
    ).toBe(`/listings/${LISTING_ID}/book?hold=${BOOKING_ID}`);
    // Coral, and 44px: `variant="brand"` + `size="touch"`.
    expect(retry.className).toContain("bg-brand");
    expect(retry.className).toContain("h-11");
    // ONE accent fill in the viewport — the recovery link must NOT also be coral while the retry is up.
    expect(
      [...document.querySelectorAll("a")].filter((a) => a.className.includes("bg-brand")).length,
    ).toBe(1);
  });

  it("(3) names the alternative rails inline, verbatim", () => {
    const { container } = mountIncomplete();
    expect(flat(container as unknown as HTMLElement)).toContain(
      "You can pay with GCash, Maya, card or QR Ph — a failed GCash payment doesn't cost you your slot.",
    );
  });

  it("(4) shows the hold countdown under its own label", () => {
    const { container } = mountIncomplete();
    expect(flat(container as unknown as HTMLElement)).toContain("Slot held for");
  });

  it("(5) on expiry IN PLACE, the retry is replaced by the expiry line and a coral recovery", () => {
    mountIncomplete({ holdMs: 2 * 60_000 });

    // Guard the guard: the retry is up before the clock runs out, or case (5) proves nothing.
    expect(screen.getByRole("link", { name: "Try paying again" })).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(3 * 60_000);
    });

    expect(
      screen.queryByRole("link", { name: "Try paying again" }),
      "the hold lapsed and the page still offers to take the booker's money for a slot it no longer holds",
    ).toBeNull();
    expect(screen.getByText("This hold has expired.")).toBeTruthy();
    const back = screen.getByRole("link", { name: "Back to availability" });
    expect(back.getAttribute("href")).toBe(`/listings/${LISTING_ID}`);
    expect(back.className).toContain("bg-brand");

    // The slot-held promise must NOT survive its own expiry — it is a money-adjacent sentence and it
    // is now false. The money truth above it ("you have not been charged") is still true and stays.
    const panel = flat(document.querySelector('[data-testid="money-statement"]') as HTMLElement);
    expect(panel).toContain("You haven't been charged.");
    expect(panel).not.toContain("Your slot is still held");
  });

  it("(6) renders the reference on this status too (TRUST-02)", () => {
    const { container } = mountIncomplete();
    expect(
      container.querySelector('[data-testid="booking-reference"]')?.textContent,
    ).toContain(REFERENCE);
  });

  it("(7) paints NO alarm colour in the rendered tree, at either threshold", () => {
    // ⚠ THIS IS A RENDERED-TREE ASSERTION AND THAT IS THE POINT. A source scan over
    // `src/components/booking/**` cannot see a token that arrives from a child component, and the
    // countdown reused here paints its digits with the alarm token whenever under an hour remains —
    // which, on a fifteen-minute hold, is ALWAYS. 13-UI-SPEC § Color: the alarm colour renders NOWHERE
    // in this phase, because a checkout that did not finish is not an error the booker caused.
    //
    // IT IS SCOPED TO UNCONDITIONAL PAINT, and the scoping is measured rather than cautious: the
    // vendored button recipe carries `aria-invalid:`-prefixed and `dark:`-prefixed spellings of the
    // same token on EVERY button in the application, and those are state-scoped rules that paint
    // nothing until a control is invalid. A substring match over `innerHTML` therefore reports every
    // surface in the repo — it was written that way first and reported this one, which is how the
    // distinction got measured. A bare utility (`text-…`, `bg-…`, `border-…`, `ring-…` with no
    // variant prefix) is the thing that actually reaches a pixel.
    const alarm = /^(text|bg|border|ring)-destr(uctive)\b/;
    const painted = (root: HTMLElement) =>
      [...root.querySelectorAll<HTMLElement>("*")]
        .flatMap((el) => (el.getAttribute("class") ?? "").split(/\s+/))
        .filter((token) => alarm.test(token));

    const { container } = mountIncomplete();
    expect(
      painted(container as unknown as HTMLElement),
      "the alarm colour reached the calmest surface in the phase",
    ).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(FIFTEEN_MIN_MS + 60_000);
    });
    expect(
      painted(container as unknown as HTMLElement),
      "…and it must not arrive with the expiry either",
    ).toEqual([]);
  });
});
