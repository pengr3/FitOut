// @vitest-environment jsdom

// T-08-79 (quick task 260801-kv2) — the BOOKER-FACING half of the checkout lease.
//
// The server refusing a concurrent second attempt is only half a fix. If the refusal surfaced as the
// existing `checkout` reason, reserve-view.tsx would flip the whole page to <HoldExpiredState> — telling a
// booker whose hold is perfectly alive that it expired, and destroying the page they would retry from. So
// `in-flight` is its own reason, and ReserveActions renders it INLINE while leaving the page intact. These
// three cases pin exactly that: the sentence appears, the CTA comes back, and the scoping to `in-flight`
// is real rather than incidental.
//
// The constant is IMPORTED here and asserted against — that is where the assertion belongs. The component
// itself must NOT import it (checkout-lease.ts pulls in drizzle + the schema, and this is a "use client"
// component); it renders the SERVER-SUPPLIED result.error, which is what makes drift structurally
// impossible. A verify gate greps the component's executable lines for `checkout-lease` and must find none.
//
// The server action module is stubbed for the reason every component test in this suite stubs it: the real
// module is "use server" and pulls auth + db, which must never be imported into jsdom.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";

// `vi.hoisted` because vi.mock's factory is hoisted above every top-level binding — declaring the spy with a
// plain `const` above it throws "Cannot access 'confirmBooking' before initialization".
const { confirmBooking } = vi.hoisted(() => ({ confirmBooking: vi.fn() }));
vi.mock("@/app/actions/booking", () => ({ confirmBooking }));

import { ReserveActions } from "@/components/booking/reserve-actions";
import { CHECKOUT_IN_FLIGHT_MESSAGE } from "@/lib/payments/checkout-lease";

afterEach(() => {
  cleanup();
  confirmBooking.mockReset();
});

const IN_FLIGHT = {
  ok: false as const,
  reason: "in-flight" as const,
  error: CHECKOUT_IN_FLIGHT_MESSAGE,
};

/**
 * BOTH confirm controls, since plan 12-11.
 *
 * Checkout renders the terminal action TWICE — inline in the rail at `lg:` and up, and in the fixed
 * bottom bar below it — from ONE `pending`, through ONE `handleConfirm`, with `hidden` leaving exactly
 * one reachable at any width. jsdom applies no Tailwind (D-131), so both are in this tree: a singular
 * query throws outright, and quietly picking the first would leave the other box — a control that spends
 * money — asserted by nothing at all. Every case below drives `cta()` and then checks the pair.
 */
function renderActions() {
  const onResult = vi.fn();
  const view = render(<ReserveActions holdId="hold_1" totalLabel="₱735.00" onResult={onResult} />);
  const ctas = () => screen.getAllByRole("button", { name: /confirm & pay/i });
  return { ...view, onResult, ctas, cta: () => ctas()[0] };
}

describe("ReserveActions — the checkout-lease refusal is calm, inline, and leaves the page usable", () => {
  it("(1) renders the in-flight sentence inline, re-enables the CTA, and still surfaces the result", async () => {
    confirmBooking.mockResolvedValue(IN_FLIGHT);
    const { onResult, cta, ctas } = renderActions();

    // Nothing before the click — the notice is a consequence of an action, not a standing state.
    expect(screen.queryByText(CHECKOUT_IN_FLIGHT_MESSAGE)).toBeNull();

    // Two boxes, and exactly two: the inline rail control and the bottom bar's (plan 12-11). A third
    // would mean somebody added a confirm path rather than a confirm box, which on this surface is a
    // second way to mint a payable PayMongo session for one booking.
    expect(ctas()).toHaveLength(2);
    // ONE live region for the pair — the refusal is announced once no matter which box was pressed.
    expect(screen.queryAllByRole("status")).toHaveLength(0);

    fireEvent.click(cta());

    await waitFor(() => {
      expect(screen.getByText(CHECKOUT_IN_FLIGHT_MESSAGE)).toBeTruthy();
    });

    // Announced, because it lands after an action the booker took.
    expect(screen.getByRole("status").textContent).toBe(CHECKOUT_IN_FLIGHT_MESSAGE);

    // "Try again" has to be actionable, or the copy is a lie (rule O7: name the state, give a way out).
    // BOTH boxes come back, because both read the one `pending` this component owns — a booker who was
    // refused on a phone must find the bar's control usable again, not just the one they cannot see.
    expect(screen.getAllByRole("status")).toHaveLength(1);
    for (const button of ctas()) {
      expect(button.hasAttribute("disabled")).toBe(false);
      expect(button.textContent).toMatch(/confirm & pay/i);
    }

    // The parent still hears about it — reserve-view.tsx ignores `in-flight`, and that is its choice to
    // make, not this component's to pre-empt.
    expect(onResult).toHaveBeenCalledWith(IN_FLIGHT);
  });

  it("(2) does NOT render a notice for `checkout` — that reason is the whole-page recovery path", async () => {
    const CALM_RETRY = "We couldn't start checkout. Please try again.";
    confirmBooking.mockResolvedValue({ ok: false, reason: "checkout", error: CALM_RETRY });
    const { onResult, cta } = renderActions();

    fireEvent.click(cta());

    await waitFor(() => {
      expect(onResult).toHaveBeenCalled();
    });

    // The inline notice is scoped to `in-flight` ONLY. Showing it here as well would give the booker two
    // competing recoveries — the parent's HoldExpiredState and a stray line under the CTA.
    expect(screen.queryByText(CALM_RETRY)).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("(3) a second attempt CLEARS the previous notice before the next result lands", async () => {
    confirmBooking.mockResolvedValue(IN_FLIGHT);
    const { cta } = renderActions();

    fireEvent.click(cta());
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());

    // The retry the copy invites: this time the lease is free, so the action redirects and resolves nothing.
    // A stale sentence left on screen while checkout is opening would be actively misleading.
    confirmBooking.mockResolvedValue(undefined);
    fireEvent.click(cta());

    await waitFor(() => {
      expect(screen.queryByRole("status")).toBeNull();
    });
    expect(screen.queryByText(CHECKOUT_IN_FLIGHT_MESSAGE)).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// BFLOW-07 (plan 12-11) — THE BOOKER IS TOLD WHERE THEY ARE GOING BEFORE THEY GO
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The requirement's whole gap was ONE WORD. `Confirm & pay` has redirected to a PayMongo hosted checkout
// since D-57, and the pressed label read `Taking you to checkout…` — true, and naming no destination at
// all: "checkout" is the screen the booker is already looking at. What arrives next is a domain they
// were never told about, at the moment their card comes out.
//
// WHAT THESE CASES CAN AND CANNOT CLAIM, stated so nobody reads more into them than they hold. They
// assert the two STRINGS and the absence of a second step. They do NOT assert the redirect: the tail
// past `Confirm & pay` is a hosted checkout Playwright cannot drive (`e2e/search-and-book.spec.ts`'s own
// header records this, and it is why the automatable booker path ends at this button). This phase's
// claim therefore stops exactly at "the booker is told where they are going", which is the claim
// BFLOW-07 actually makes; the tail is human UAT and is not faked here.
//
// THE NEGATIVE CASE IS THE ONE THAT WILL EARN ITS KEEP. D-51 refuses an "are you sure / you're about to
// be redirected" interstitial, and the reason is not minimalism: a 15-minute hold is expiring while the
// booker reads it, and they have already decided — pressing a terminal action IS the decision. A dialog
// is the single most likely thing a future well-meaning change adds to this surface, and it would look
// like care while costing a tap and some of a hold.
describe("BFLOW-07 — the confirm names its destination, and adds no step in front of it", () => {
  const TOTAL = "₱735.00";
  /** The four rails PayMongo actually settles for this app (CLAUDE.md § Payments). */
  const RAILS = ["card", "GCash", "Maya", "QR Ph"] as const;

  function renderAtRest() {
    confirmBooking.mockReturnValue(new Promise(() => {})); // never resolves: the pressed state is durable
    return render(<ReserveActions holdId="hold_1" totalLabel={TOTAL} onResult={vi.fn()} />);
  }

  it("(4) the at-rest line names the amount, the destination and all four rails", () => {
    const { container } = renderAtRest();

    // Read the LINE, not the document: `toContain` over `container.textContent` would also be satisfied
    // by the word appearing in a button label, which is the other half of this requirement and is
    // asserted separately below. The line is the element whose text is the sentence.
    const line = [...container.querySelectorAll("p")]
      .map((p) => p.textContent ?? "")
      .find((text) => text.includes("You'll pay"));

    expect(line, "the reassurance line beneath the CTA is not rendered at all").toBeTruthy();
    expect(line, "the line does not name the amount the booker is agreeing to").toContain(TOTAL);
    expect(
      line,
      "the line does not name PayMongo. BFLOW-07's gap was exactly this word: a booker who is not " +
        "told where they are going meets an unfamiliar domain with their card out.",
    ).toContain("PayMongo");
    for (const rail of RAILS) {
      expect(line, `the line does not name the ${rail} rail`).toContain(rail);
    }
  });

  it("(5) the PRESSED label names PayMongo — on BOTH boxes, from the one pending state", async () => {
    const { container } = renderAtRest();

    const ctas = () => screen.getAllByRole("button", { name: /confirm & pay|taking you to/i });
    expect(ctas(), "checkout renders the inline control and the sticky bar's").toHaveLength(2);

    fireEvent.click(ctas()[0]);

    await waitFor(() => {
      for (const button of ctas()) {
        expect(
          button.textContent,
          "a pressed confirm that does not name its destination is the shipped defect BFLOW-07 " +
            "names — `Taking you to checkout…` describes no movement at all.",
        ).toContain("PayMongo");
        // The courtesy pair, on both boxes, from one `pending` — see the component's handleConfirm note
        // for why this is a courtesy and where the real guard lives.
        expect(button.hasAttribute("disabled")).toBe(true);
        expect(button.getAttribute("aria-disabled")).toBe("true");
      }
    });

    // …and pressing it did NOT also swap the at-rest line out from under the booker.
    expect(container.textContent).toContain("PayMongo");
  });

  it("(6) pressing the CTA opens NO dialog and inserts NO second confirmation step (D-51)", async () => {
    const { container, baseElement } = renderAtRest();

    // Guard the guard: an absence assertion is free against a tree that rendered nothing, and free
    // again against a tree that never reached the pressed state.
    expect(screen.queryAllByRole("dialog")).toHaveLength(0);
    const buttonsBefore = [...baseElement.querySelectorAll("button")].length;
    expect(buttonsBefore).toBe(2);

    fireEvent.click(screen.getAllByRole("button", { name: /confirm & pay/i })[0]);
    await waitFor(() => {
      expect(container.textContent).toContain("PayMongo");
    });

    // `baseElement` rather than `container`: a Radix dialog PORTALS to `document.body`, so a scan of
    // the component's own subtree is exactly the scan a real interstitial would escape.
    expect(
      screen.queryAllByRole("dialog"),
      "a confirmation dialog appeared between the booker and the payment. D-51 refuses one: a hold is " +
        "expiring while they read it, and they already decided — pressing the terminal action IS the " +
        "decision. Name the destination in the line beneath the CTA instead, where it can still change " +
        "one.",
    ).toHaveLength(0);
    expect(screen.queryAllByRole("alertdialog")).toHaveLength(0);
    expect(
      [...baseElement.querySelectorAll("button")].length,
      "the pressed state grew a control. A second step on the money path is the thing this case exists " +
        "to notice, and it does not have to call itself a dialog to be one.",
    ).toBe(buttonsBefore);
  });
});
