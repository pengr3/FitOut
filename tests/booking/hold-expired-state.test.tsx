// @vitest-environment jsdom

// GATE-03 RULE 7 — THE HOLD-EXPIRY FOCUS MOVE, AS A RUNTIME ASSERTION (12-REVIEW CR-01).
//
// WHY THIS FILE EXISTS AT ALL. Three separate places state, as part of the accessibility contract, that
// when a booker's hold runs out focus moves to the primary recovery CTA: `hold-expired-state.tsx`'s
// header, `hold-countdown.tsx`'s rule-6 paragraph, and the `hold-expired-state` row of
// `src/lib/design/live-regions.ts`. That move is what BUYS the absence of the interrupting politeness
// level on this route — rule 7 is "polite region PLUS moved focus", and the polite half alone is not the
// rule. For two plans only the polite half shipped. There was no `useEffect`, no `.focus()` and no
// `tabIndex` anywhere on this path, and every gate stayed green:
//
//   • `tests/design/live-regions.test.tsx` is a SOURCE SCAN. It reads the file's text for a missing
//     `aria-live` and a present `role="status"` — both of which were true — and it has no way to know
//     whether a focus move exists, because a focus move is not a string in a file.
//   • `tests/booking/reserve-actions.test.tsx` and `tests/booking/hold-countdown.test.tsx` mount their
//     own component in isolation, never the expiry state, so neither can see the missing wiring.
//   • `tsc`, `next build` and the full suite cannot fail on behaviour nothing executes.
//
// So the only thing that can catch this class of defect is a test that RENDERS the state and reads
// `document.activeElement`. That is the whole of this file, and it is deliberately three cases rather
// than one, because "focus moved" is three separate claims:
//
//   (1) THE COMPONENT MOVES IT, ON ITS OWN MOUNT. This is the path `book/page.tsx` takes when a hold is
//       already dead on arrival — it renders `HoldExpiredState` directly, with no `ReserveView` above
//       it, so a move owned by the parent would never fire here.
//   (2) THE LIVE-EXPIRY SWAP MOVES IT TOO. `ReserveView` replacing the reserve content mid-checkout is
//       the case the contract is actually about: the booker's focus is somewhere inside a form that is
//       being unmounted from under them, plausibly on `Confirm & pay`.
//   (3) A LIVE HOLD MOVES NOTHING. The negative is not padding. A focus move that fired on every mount
//       of this route would paint a focus ring on the ordinary checkout render — which is a photographed
//       surface (`/listings/[id]/book`, both themes, frozen clock at a NON-expired time) — and would
//       also yank focus away from a booker who is filling the page in. The move is conditional on the
//       hold being over, and that condition is what this case pins.
//
// THE TARGET IS THE CTA, NOT THE REGION, and the distinction is asserted rather than assumed. The
// contract names "the primary recovery CTA" twice in those three places; `collision-notice.tsx` aims its
// own rule-7 move at its region instead, because ITS row declares a different target. Asserting the
// element identity here is what stops the two being quietly swapped.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// `ReserveActions` — reached through `ReserveView`'s LIVE branch in case (3) — imports the confirm
// server action at module scope. `vi.hoisted` because vi.mock's factory is hoisted above every
// top-level binding (the idiom `reserve-actions.test.tsx` records).
const { confirmBooking } = vi.hoisted(() => ({ confirmBooking: vi.fn() }));
vi.mock("@/app/actions/booking", () => ({ confirmBooking }));

import { HoldExpiredState } from "@/components/booking/hold-expired-state";
import { HoldProvider, useHold } from "@/components/booking/hold-provider";
import { ReserveView } from "@/components/booking/reserve-view";

afterEach(() => {
  cleanup();
  confirmBooking.mockReset();
});

const LISTING_ID = "lst_1";

/** The one element the contract names. Queried by its accessible name, not by a test hook. */
function recoveryCta(): HTMLElement {
  return screen.getByRole("link", { name: "Back to availability" });
}

/**
 * The live-expiry swap, driven the way production drives it.
 *
 * `ReserveView` reads `expired` from the hold context and nothing else can flip it, so the harness
 * mounts a real `HoldProvider` and calls the real `markExpired()` from a child — the same one-way latch
 * `HoldCountdown` calls when it reaches zero. Faking the context object instead would prove the swap
 * against a stub of the very thing under test.
 */
function ExpireOnMount() {
  const { markExpired } = useHold();
  React.useEffect(() => {
    markExpired();
  }, [markExpired]);
  return null;
}

function renderReserveView({ expire }: { expire: boolean }) {
  return render(
    <HoldProvider>
      {expire ? <ExpireOnMount /> : null}
      <ReserveView
        holdId="hold_1"
        listingId={LISTING_ID}
        totalLabel="₱735.00"
        summary={<p>What you are booking</p>}
        breakdown={<p>The frozen quote</p>}
        wayBack={<a href={`/listings/${LISTING_ID}`}>Back to the listing</a>}
      />
    </HoldProvider>,
  );
}

describe("GATE-03 rule 7 — an expired hold moves focus to the primary recovery CTA", () => {
  it("(1) HoldExpiredState focuses the recovery CTA on its own mount (the already-dead-on-arrival path)", () => {
    render(<HoldExpiredState listingId={LISTING_ID} />);

    // Guard the guard: the CTA must exist before "focus is on it" means anything, and it must be the
    // link the contract names rather than the neutral secondary beside it.
    const cta = recoveryCta();
    expect(cta.getAttribute("href")).toBe(`/listings/${LISTING_ID}`);

    expect(
      document.activeElement,
      "the expiry interstitial mounted without moving focus. Rule 7 drops the interrupting politeness " +
        "level on this route SPECIFICALLY because a focus move replaces it, so the polite region on " +
        "its own is not the contract — it is half of it. `hold-expired-state.tsx`, " +
        "`hold-countdown.tsx` and `live-regions.ts` all state this move as load-bearing.",
    ).toBe(cta);
  });

  it("(2) the ReserveView live-expiry swap lands focus on that same CTA", () => {
    renderReserveView({ expire: true });

    // The swap actually happened — otherwise the focus assertion below would be about the reserve form.
    expect(
      screen.queryByText("The frozen quote"),
      "the hold expired and the frozen quote is still on screen; ReserveView did not swap (D-44).",
    ).toBeNull();
    expect(screen.getByText("Your hold expired")).toBeTruthy();

    expect(
      document.activeElement,
      "the page swapped to the expiry state and left the booker's focus wherever it was — plausibly on " +
        "a `Confirm & pay` button that has just been unmounted from under them. The move must fire on " +
        "THIS path too, not only when the state is rendered directly by the RSC.",
    ).toBe(recoveryCta());
  });

  it("(3) a LIVE hold moves no focus at all", () => {
    renderReserveView({ expire: false });

    // Guard the guard: this is the reserve form, not the interstitial.
    expect(screen.getByText("The frozen quote")).toBeTruthy();
    expect(screen.queryByText("Your hold expired")).toBeNull();

    expect(
      document.activeElement,
      "something moved focus on an ordinary, non-expired checkout render. That is a visible change to a " +
        "photographed surface (a focus ring on `/listings/[id]/book`) and it takes focus away from a " +
        "booker who is still working. The rule-7 move is conditional on the hold being OVER.",
    ).toBe(document.body);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • WHETHER A SCREEN READER ACTUALLY SPEAKS THE REGION, and whether it does so before or after the
//     moved focus. Announcement order is browser + AT behaviour, not a DOM property. What is mechanically
//     checkable here is that focus lands on the named element; the listening pass is Phase 17's.
//   • jsdom PERFORMS NO LAYOUT, so nothing here says the focus ring is visible, sized, or contrasting.
//     DS-05 owns the ring recipe and `tests/design` owns its contrast.
//   • THE SECOND ROUTE INTO THE SAME STATE — a `Confirm & pay` that comes back `expired`/`denied`/
//     `checkout` — sets the same internal flag as case (2) and reaches the same branch, so it is covered
//     by construction rather than by a fourth case. `tests/booking/reserve-actions.test.tsx` owns the
//     mapping from a server verdict to that flag.
