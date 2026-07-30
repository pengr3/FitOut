// @vitest-environment jsdom

// 09-UI-SPEC § 5b / § 5c — the drop-in CANCELLATION COPY forks, asserted against RENDERED output.
//
// WHY A RENDER TEST AND NOT A STRING TEST. Both facts here are wiring facts a refactor breaks silently:
//
//   § 5c / O8 — the host-cancel dialog must promise exactly TWO consequences for a drop-in booking, because
//   `cancelBookingAsHost` deliberately does not perform the third one (it would close the whole date for
//   every other pass-holder — 09-RESEARCH Pitfall 5). A dialog that still lists "Block {when} on this space"
//   is a false statement about the host's OWN calendar, made at the moment they are deciding whether to
//   break a paid booking. Only the rendered list can prove the bullet is gone; a props type cannot.
//   Case (3) also asserts the sr-only description, which used to hardcode "three" — a screen-reader user
//   must not be told to expect a consequence the list does not contain.
//
//   § 5b — the GENERIC policy disclosure must say "before the space opens" for a drop-in listing and
//   "before the session" for an hourly one, while the CONCRETE-instant strings stay byte-identical in both
//   modes (OC-03 already makes that instant the venue's opening time, so forking them would be drift, not
//   accuracy). Cases (1)/(2)/(4).
//
// ⚠️ NOT UNDER TEST HERE, DELIBERATELY: the ladder, the rungs, the percentages and every peso. They are
// byte-identical for a drop-in pass (OC-15) and tests/booking/cancellation-policy.test.ts owns them,
// derived from LADDER on both sides. This file is copy only.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

// HostCancelDialog is a client component whose only server coupling is the cancel action module
// (`"use server"` → pulls in the DB + next/headers). Stubbing that module and `sonner` keeps the render pure
// without touching the dialog's own markup — the same idiom as tests/booking/host-booking-row.test.tsx.
vi.mock("@/app/actions/cancel-booking", () => ({ cancelBookingAsHost: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// The Radix Select primitive is driven by Pointer Events, which jsdom does not implement — the same class
// of problem next/link poses in host-booking-row.test.tsx, and the same remedy: swap ONLY the untestable
// primitive for its native equivalent. The reason `select` is not what this file is about; the consequences
// list below it is, and that markup stays entirely real.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      aria-label="Reason"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import {
  CancellationPolicyDisclosure,
  policyDisclosureLines,
  policySummaryLine,
} from "@/components/booking/cancellation-policy-disclosure";
import { HostCancelDialog } from "@/components/host/host-cancel-dialog";

afterEach(cleanup);

const DROP_IN = { openCapacity: true } as const;
const EXCLUSIVE = { openCapacity: false } as const;

/** Pre-formatted venue-local boundary instants — CONCRETE mode's input. Two, matching `standard`'s rungs. */
const CONCRETE_LABELS = ["Thu, Aug 7, 8:00 AM (Makati time)", "Fri, Aug 8, 2:00 AM (Makati time)"];

describe("CancellationPolicyDisclosure — § 5b: the deadline ANCHOR forks, the instants do not", () => {
  it("(1) GENERIC mode names the space opening for a drop-in listing and the session for an hourly one", () => {
    // The summary line — what a booker sees before expanding anything.
    expect(policySummaryLine("standard", DROP_IN)).toBe(
      "Free cancellation up to 24 hours before the space opens.",
    );
    expect(policySummaryLine("standard", EXCLUSIVE)).toBe(
      "Free cancellation up to 24 hours before the session.",
    );

    // …and every rung line inside the expanded list, at every tier — so one branch cannot be forked while
    // another keeps the old anchor.
    for (const tier of ["flexible", "standard", "strict"] as const) {
      const dropIn = policyDisclosureLines(tier, DROP_IN);
      const exclusive = policyDisclosureLines(tier, EXCLUSIVE);
      // The last line is the shared "After that / no refund" close, which names no anchor at all.
      for (const line of dropIn.slice(0, -1)) {
        expect(line.when).toContain("before the space opens");
        expect(line.when).not.toContain("before the session");
      }
      for (const line of exclusive.slice(0, -1)) {
        expect(line.when).toContain("before the session");
        expect(line.when).not.toContain("before the space opens");
      }
      // The two modes differ ONLY in that phrase — the outcomes (the money) are byte-identical.
      expect(dropIn.map((l) => l.outcome)).toEqual(exclusive.map((l) => l.outcome));
    }
  });

  it("(2) the RENDERED generic disclosure carries the drop-in anchor, and still discloses the service fee", () => {
    render(<CancellationPolicyDisclosure tier="standard" openCapacity />);

    expect(
      screen.getByText("Free cancellation up to 24 hours before the space opens."),
    ).toBeDefined();
    expect(screen.getByText(/Cancel at least 24 hours before the space opens/)).toBeDefined();
    // C2 — mandatory at every tier, in both modes, and rendered unconditionally. A drop-in pass does not
    // get a different fee promise.
    expect(screen.getByText("The service fee isn't refunded.")).toBeDefined();
    expect(screen.queryByText(/before the session/)).toBeNull();
  });

  it("(4) CONCRETE mode is byte-identical in both modes — the instant is already the opening time (OC-03)", () => {
    // § 5b lists these strings as UNCHANGED on purpose: they name a venue-local instant and no anchor noun,
    // and for a drop-in pass OC-03 has already made that instant when the space opens. A second wording for
    // the same instant would be drift. This case is what stops a later reader "finishing the fork".
    for (const tier of ["standard"] as const) {
      expect(policySummaryLine(tier, DROP_IN, CONCRETE_LABELS, 0)).toBe(
        policySummaryLine(tier, EXCLUSIVE, CONCRETE_LABELS, 0),
      );
      expect(policySummaryLine(tier, DROP_IN, CONCRETE_LABELS, 0)).toBe(
        `Free cancellation until ${CONCRETE_LABELS[0]}`,
      );
      expect(policyDisclosureLines(tier, DROP_IN, CONCRETE_LABELS)).toEqual(
        policyDisclosureLines(tier, EXCLUSIVE, CONCRETE_LABELS),
      );
    }
  });
});

describe("HostCancelDialog — § 5c / O8: two consequences for a drop-in booking, three otherwise", () => {
  const props = {
    bookingId: "bk_copy_1",
    guestLabel: "Bea",
    refundLabel: "₱1,050.00",
    feeLabel: "₱300.00",
    outstandingLabel: null,
    whenLabel: "Friday, Aug 8 · Drop-in pass, any time 6:00 AM – 10:00 PM (Makati time)",
  };

  /**
   * Open the dialog and advance to pane 2, where the consequences live — through the SHIPPED gates, not by
   * reaching into state. D-80's friction (a REQUIRED reason before `Continue` enables) is asserted on the
   * way past: if that gate ever disappeared, `Continue` would be clickable with no reason and this helper
   * would still work, so the disabled assertion is what keeps the traversal honest.
   */
  function openConsequencesPane(openCapacity: boolean): HTMLElement {
    render(<HostCancelDialog {...props} openCapacity={openCapacity} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel booking" }));

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton.getAttribute("aria-disabled")).toBe("true"); // GATE 1 of 2, before a reason
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "maintenance" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    return screen.getByRole("dialog");
  }

  it("(3) a DROP-IN booking gets TWO bullets and the word Block appears nowhere in the dialog", () => {
    const dialog = openConsequencesPane(true);

    const bullets = dialog.querySelectorAll("li");
    expect(bullets).toHaveLength(2);
    expect(bullets[0].textContent).toContain("Refund");
    expect(bullets[1].textContent).toContain("cancellation fee");

    // ⚠️ THE ASSERTION O8 IS ABOUT. `cancelBookingAsHost` writes no availability_block for a drop-in
    // booking, so a dialog that promised one would be describing the host's calendar incorrectly at the
    // exact moment they are deciding whether to break a paid booking.
    expect(dialog.textContent).not.toContain("Block");
    expect(dialog.textContent).not.toContain(props.whenLabel);

    // The sr-only description must match what is rendered — it used to hardcode "three".
    expect(dialog.textContent).toContain("The two consequences of cancelling");
    expect(dialog.textContent).not.toContain("The three consequences");

    // Everything ELSE about the dialog is unchanged (D-80's friction is the contract, not a rough edge):
    // the fee is still stated twice — once as a consequence, once as the required acknowledgment.
    expect(dialog.textContent).toContain("₱300.00");
    expect(dialog.textContent).toContain("This can't be undone.");
  });

  it("(3b) an EXCLUSIVE booking still gets all THREE, naming the window that will be blocked", () => {
    // The regression guard for the copy, mirroring the action-level one in open-capacity-cancel.test.ts:
    // without it the bullet could be dropped for everyone and case (3) would stay green.
    const dialog = openConsequencesPane(false);

    const bullets = dialog.querySelectorAll("li");
    expect(bullets).toHaveLength(3);
    expect(bullets[2].textContent).toContain("Block");
    expect(bullets[2].textContent).toContain(props.whenLabel);
    expect(dialog.textContent).toContain("The three consequences of cancelling");
  });
});
