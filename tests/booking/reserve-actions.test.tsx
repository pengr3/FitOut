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
