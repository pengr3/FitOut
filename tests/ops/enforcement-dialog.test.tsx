// @vitest-environment jsdom

// ENF-01 / OPS-05 / D-233 — THE REJECT DIALOG'S ANTI-MUSCLE-MEMORY ARRANGEMENT, AS RENDERED FACTS.
//
// WHY A RENDER TEST AND NOT A REVIEW NOTE. Every claim below is a wiring fact that a later plan breaks
// SILENTLY, and none of them is visible to a type, a lint rule or any of the shipped design gates:
//
//   • THE CONFIRM'S NAME CARRIES THE COUNT. `Reject and refund 4 bookings` is the whole reason the
//     label is dynamic — a generic Confirm under a radio is exactly the shape a tired reviewer clicks
//     through. Making it static is a one-word edit that nothing else in the repository objects to.
//   • THE DEFAULT IS THE LIGHTER LEVER, ON EVERY MOUNT. D-233 says the escalation is never the
//     default and the dialog never remembers the last choice. "The state is initialised to the
//     lighter one" and "the lighter one is checked after a close and a reopen" are different claims,
//     and only the second one is what an operator experiences.
//   • THE RADIO IS ABSENT WHEN THERE IS NOTHING TO CANCEL. A radio offering an option that does
//     nothing is a trap: an operator picks it, presses a button promising a refund, and gets a calm
//     server refusal for a decision the console had already shown them as available.
//   • THE MONEY IS THE SERVER'S, BYTE FOR BYTE (PROJECT D-130 / GATE-05). Asserted twice — once
//     against the rendered output with figures no arithmetic could have produced, and once against
//     the source, because a render test cannot see a computation that happens to agree today.
//
// ⚠ THE RADIX SELECT IS SWAPPED FOR ITS NATIVE EQUIVALENT, and nothing else is. The primitive is
// driven by Pointer Events, which jsdom does not implement — the same class of problem, and the same
// remedy, as `tests/booking/cancellation-copy.test.tsx`, which mocks it in the same shape for the same
// dialog-shaped reason. The RadioGroup, the Textarea, the description list and the overlay pattern are
// all entirely real here, because they are what this file is about.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
    <select aria-label="Reason" value={value} onChange={(e) => onValueChange(e.target.value)}>
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
  OpsRejectDialog,
  NO_BOOKINGS_SENTENCE,
  NOTHING_CANCELLABLE_SENTENCE,
  REJECT_NOTE_HINT,
  type OpsRejectChoice,
} from "@/components/ops/ops-reject-dialog";
import type { OpsCancelImpact } from "@/lib/ops/cancel-impact";
import {
  LISTING_REJECT_REASONS,
  OPS_DEFAULT_LEVER,
  OTHER_REASON,
  REJECT_NOTE_MAX,
  type ListingRejectReason,
} from "@/lib/validation/ops";

afterEach(cleanup);

const SOURCE = resolve(process.cwd(), "src/components/ops/ops-reject-dialog.tsx");

/**
 * Figures no client arithmetic could have produced from anything this component receives.
 *
 * The point is not that they are large; it is that nothing in the props is divisible, summable or
 * roundable into them. If the dialog ever starts computing, these stop matching.
 */
const REFUND_TOTAL = "₱4,000.00";
const RETAINED_TOTAL = "₱200.00";
const PAYOUT_LEFT_REASON = "their payout has already left FitOut";

/** A pickable sentence that is NOT the free-text member, so the note stays optional. */
const A_REASON: ListingRejectReason = LISTING_REJECT_REASONS[0];

function impactWith(over: Partial<OpsCancelImpact> = {}): OpsCancelImpact {
  return {
    cancellableCount: 4,
    cancellableBookingIds: ["bk_1", "bk_2", "bk_3", "bk_4"],
    refundTotal: REFUND_TOTAL,
    retainedTotal: RETAINED_TOTAL,
    hostPaid: "Nothing",
    notCancellableCount: 0,
    notCancellableReason: PAYOUT_LEFT_REASON,
    ...over,
  };
}

/**
 * The caller, as the real one is: it owns `open`, the dialog owns everything inside.
 *
 * `itemKey` re-keys nothing on purpose — the whole point of case 3 is that the SAME mounted dialog,
 * handed a different subject, still opens on the lighter lever. A harness that remounted per item
 * would prove the React default and nothing about the requirement.
 */
function Harness({
  impact,
  onConfirm = () => {},
  submitting = false,
  description = "Ana will be told, and will see the reason you pick below. This can't be undone here.",
}: {
  impact: OpsCancelImpact | null;
  onConfirm?: (choice: OpsRejectChoice<ListingRejectReason>) => void;
  submitting?: boolean;
  description?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <OpsRejectDialog<ListingRejectReason>
      open={open}
      onOpenChange={setOpen}
      title="Reject this listing?"
      description={description}
      reasons={LISTING_REJECT_REASONS}
      impact={impact}
      submitting={submitting}
      confirmLabel="Reject listing"
      submittingLabel="Rejecting…"
      onConfirm={onConfirm}
      trigger={<button type="button">Reject</button>}
    />
  );
}

/** Opens the overlay through its own trigger, exactly as an operator does. */
function open(): void {
  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
}

/** Picks a taxonomy sentence through the (native, mocked) reason control. */
function chooseReason(sentence: string): void {
  fireEvent.change(screen.getByRole("combobox", { name: "Reason" }), {
    target: { value: sentence },
  });
}

/** The `<dd>` whose `<dt>` reads `term`, read as a PAIR so a re-ordered list cannot pass by position. */
function valueFor(term: string): HTMLElement {
  const dt = screen.getByText(term);
  const value = dt.nextElementSibling;
  expect(value?.tagName, `the "${term}" term is not followed by a <dd>`).toBe("DD");
  return value as HTMLElement;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 1 — THE CONFIRM'S ACCESSIBLE NAME CARRIES THE COUNT, AND ONLY UNDER THE ESCALATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("the confirm names the act and the number", () => {
  it("case 1 — the name carries the booking count when the escalation is selected, and does not when it is not", () => {
    render(<Harness impact={impactWith()} />);
    open();
    chooseReason(A_REASON);

    // Under the default lever: the plain act, and NOTHING about a count or a refund.
    expect(screen.getByRole("button", { name: "Reject listing" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /bookings/ }),
      "the confirm names a booking count while the LIGHTER lever is selected. The count is the " +
        "anti-muscle-memory device and it must appear only on the control that actually moves money.",
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("radio", { name: "Block new bookings and cancel what's already booked" }),
    );

    // A ROLE QUERY ON THE ACCESSIBLE NAME, never a testid: what is asserted is what a screen reader
    // and a Playwright selector would both read off the button.
    expect(
      screen.getByRole("button", { name: /Reject and refund 4 bookings/ }),
      "the escalation confirm does not name the number of bookings it cancels. A generic Confirm " +
        "under a radio is exactly the shape a tired reviewer clicks through.",
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reject listing" })).toBeNull();
  });

  it("case 1b — the count and its noun agree, so a single booking is not announced in the plural", () => {
    render(<Harness impact={impactWith({ cancellableCount: 1, cancellableBookingIds: ["bk_1"] })} />);
    open();
    chooseReason(A_REASON);
    fireEvent.click(
      screen.getByRole("radio", { name: "Block new bookings and cancel what's already booked" }),
    );

    expect(screen.getByRole("button", { name: "Reject and refund 1 booking" })).toBeTruthy();
  });

  it("case 1c — the escalation confirm is INK, never a solid alarm fill", () => {
    render(<Harness impact={impactWith()} />);
    open();
    chooseReason(A_REASON);
    fireEvent.click(
      screen.getByRole("radio", { name: "Block new bookings and cancel what's already booked" }),
    );

    const confirm = screen.getByRole("button", { name: /Reject and refund 4 bookings/ });
    // The shipped destructive-ACTION treatment: the outline variant plus alarm INK. A solid fill on a
    // queue control shouts on every row it can reach, and an ops cancellation is a deliberate act.
    expect(confirm.className).toContain("text-destructive");
    expect(confirm.className).not.toContain("bg-destructive");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 2 — NOTHING TO CANCEL: NO RADIO GROUP, AND A PLAIN SENTENCE IN ITS PLACE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("the impact block when there is nothing to cancel", () => {
  it("case 2 — the block still renders, the radio group is ABSENT, and the sentence takes its place", () => {
    render(<Harness impact={impactWith({ cancellableCount: 0, cancellableBookingIds: [] })} />);
    open();

    // The block is still there — the operator reads the money before choosing, always.
    expect(valueFor("Bookings already made").textContent).toBe("0");

    expect(
      screen.queryByRole("radiogroup"),
      "a radio group rendered with nothing to cancel. The heavier option would do nothing, and an " +
        "option that does nothing is a trap rather than a choice.",
    ).toBeNull();

    expect(screen.getByText(NO_BOOKINGS_SENTENCE)).toBeTruthy();
    // …and the money rows are gone with it: there is no money to go back.
    expect(screen.queryByText("Money that would go back")).toBeNull();
    expect(screen.queryByText("FitOut keeps")).toBeNull();
  });

  it("case 2b — the never-sold claim is NOT made about a listing whose bookings were all paid out", () => {
    render(
      <Harness
        impact={impactWith({
          cancellableCount: 0,
          cancellableBookingIds: [],
          notCancellableCount: 3,
        })}
      />,
    );
    open();

    // "this listing has never been sold" would be FALSE here — three confirmed bookings were sold and
    // paid out. The narrower true sentence is stated instead, beside the row that explains it.
    expect(screen.queryByText(NO_BOOKINGS_SENTENCE)).toBeNull();
    expect(screen.getByText(NOTHING_CANCELLABLE_SENTENCE)).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(valueFor("Can't be undone here").textContent).toContain(PAYOUT_LEFT_REASON);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 3 — D-233: THE DEFAULT IS THE LIGHTER LEVER ON EVERY MOUNT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-233 — the dialog does not remember the last choice", () => {
  it("case 3 — the lighter lever is checked on first open, and again after a close and a reopen", () => {
    render(<Harness impact={impactWith()} />);

    open();
    const lighter = () => screen.getByRole("radio", { name: "Block new bookings only" });
    const heavier = () =>
      screen.getByRole("radio", { name: "Block new bookings and cancel what's already booked" });

    expect(lighter().getAttribute("aria-checked")).toBe("true");
    expect(heavier().getAttribute("aria-checked")).toBe("false");

    // The operator escalates, then changes their mind and dismisses.
    fireEvent.click(heavier());
    expect(heavier().getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));

    // The SAME dialog instance, opened again — a fresh decision, not a remembered one.
    open();
    expect(
      lighter().getAttribute("aria-checked"),
      "the dialog reopened on the escalation. D-233 requires the lighter lever checked on mount, " +
        "EVERY time: a remembered choice is the escalation arriving without a deliberate act.",
    ).toBe("true");
    expect(heavier().getAttribute("aria-checked")).toBe("false");
  });

  it("case 3b — the reason and the note are forgotten too, so nothing carries into the next case", () => {
    render(<Harness impact={impactWith()} />);
    open();
    chooseReason(OTHER_REASON);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "A note about this one." } });
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));

    open();
    expect((screen.getByRole("combobox", { name: "Reason" }) as HTMLSelectElement).value).toBe("");
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 4 + 5 — THE REASON IS THE GATE, AND THE FREE-TEXT MEMBER MAKES THE NOTE REQUIRED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("OPS-05 — a taxonomy first, free text second", () => {
  it("case 4 — the confirm is disabled until a reason is chosen", () => {
    render(<Harness impact={impactWith()} />);
    open();

    const confirm = () => screen.getByRole("button", { name: "Reject listing" });
    expect(confirm()).toHaveProperty("disabled", true);
    // `aria-disabled` ALONGSIDE `disabled` — the shipped `RequestActions` idiom.
    expect(confirm().getAttribute("aria-disabled")).toBe("true");

    chooseReason(A_REASON);
    expect(confirm()).toHaveProperty("disabled", false);
    expect(confirm().getAttribute("aria-disabled")).toBe("false");
  });

  it("case 5 — choosing the free-text member makes the note REQUIRED, and re-gates the confirm", () => {
    render(<Harness impact={impactWith()} />);
    open();

    const note = () => screen.getByRole("textbox") as HTMLTextAreaElement;
    chooseReason(A_REASON);
    expect(note().required).toBe(false);
    expect(note().getAttribute("aria-required")).toBe("false");

    chooseReason(OTHER_REASON);
    expect(
      note().required,
      "the note is optional under the member whose whole content IS the note. The server refines on " +
        "exactly this rule; a client that did not would offer a confirm the action refuses.",
    ).toBe(true);
    expect(note().getAttribute("aria-required")).toBe("true");

    // …and the confirm re-closes until something is written.
    expect(screen.getByRole("button", { name: "Reject listing" })).toHaveProperty("disabled", true);
    fireEvent.change(note(), { target: { value: "The photos are of a different building." } });
    expect(screen.getByRole("button", { name: "Reject listing" })).toHaveProperty("disabled", false);
  });

  it("case 5b — the note is bounded in the client by the schema's own constant, with a static hint", () => {
    render(<Harness impact={impactWith()} />);
    open();

    expect((screen.getByRole("textbox") as HTMLTextAreaElement).maxLength).toBe(REJECT_NOTE_MAX);
    expect(screen.getByText(REJECT_NOTE_HINT)).toBeTruthy();
    // A STATIC hint, never a live counter: a counter is a live region, and a live region for a
    // character count is noise on a surface with exactly one announcement to make.
    expect(screen.queryAllByRole("status")).toHaveLength(0);
  });

  it("case 5c — every sentence the operator can pick is a COMPLETE host-readable sentence, not a code", () => {
    render(<Harness impact={impactWith()} />);
    open();

    const options = within(screen.getByRole("combobox", { name: "Reason" })).getAllByRole("option");
    const rendered = options.map((o) => o.textContent).filter((t) => t !== "");
    expect(rendered).toEqual([...LISTING_REJECT_REASONS]);
    for (const sentence of rendered) {
      expect(sentence!.endsWith("."), `"${sentence}" is not a complete sentence`).toBe(true);
    }
  });

  it("case 5d — the confirm hands back the sentence, the raw note and the chosen lever", () => {
    const onConfirm = vi.fn();
    render(<Harness impact={impactWith()} onConfirm={onConfirm} />);
    open();
    chooseReason(A_REASON);
    fireEvent.click(screen.getByRole("button", { name: "Reject listing" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0]).toEqual({
      reason: A_REASON,
      note: "",
      lever: OPS_DEFAULT_LEVER,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 6 — D-241: NOT CANCELLABLE HERE, WITH THE REASON, NEVER A SILENT NO-OP
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("D-241 — the row that says what this console cannot do", () => {
  it("case 6 — it is absent at zero and present WITH its reason above zero", () => {
    const { unmount } = render(<Harness impact={impactWith({ notCancellableCount: 0 })} />);
    open();
    expect(screen.queryByText("Can't be undone here")).toBeNull();
    unmount();

    render(<Harness impact={impactWith({ notCancellableCount: 2 })} />);
    open();
    const row = valueFor("Can't be undone here");
    expect(row.textContent).toContain("2");
    expect(
      row.textContent,
      "the not-cancellable row renders without its reason. D-241 is explicit that such a booking is " +
        "surfaced WITH the reason — never a silent no-op, never a control that appears to work.",
    ).toContain(PAYOUT_LEFT_REASON);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 7 — ZERO CLIENT ARITHMETIC ON MONEY (PROJECT D-130 / GATE-05), ASSERTED TWICE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("the money is the server's, byte for byte", () => {
  it("case 7 — every figure renders exactly the string the server computed", () => {
    render(<Harness impact={impactWith()} />);
    open();

    expect(valueFor("Money that would go back").textContent).toContain(REFUND_TOTAL);
    expect(valueFor("FitOut keeps").textContent).toContain(RETAINED_TOTAL);
    // A FIXED SENTENCE, never a computed figure — a number here would imply the console had a say.
    expect(valueFor("The host is paid").textContent).toBe("Nothing");
  });

  it("case 7b — the source performs no arithmetic on money, which the render above cannot see", () => {
    // A render test only proves the figures AGREE today. A component that divided by 100 and happened
    // to land on the same string would pass case 7 and still be the D-130 defect.
    const source = readFileSync(SOURCE, "utf8");
    const arithmetic = /\* *100|\/ *100|centavos|Cents *[+*/-]/g;
    expect(
      source.match(arithmetic),
      "the reject dialog contains money arithmetic. Every figure must arrive as a finished string " +
        "from `formatMoney`, computed in the RSC — a dialog that could compute a refund is a dialog " +
        "that could compute it differently from the server that will move it.",
    ).toBeNull();
  });

  it("case 7c — the scan is capable of finding arithmetic, so the null above means something", () => {
    // Guard the guard: probe (c)'s shape. Without this the regex could be broken and case 7b would
    // report a perfectly clean result over anything at all.
    const arithmetic = /\* *100|\/ *100|centavos|Cents *[+*/-]/g;
    expect("const pesos = cents / 100;".match(arithmetic)).not.toBeNull();
    expect(readFileSync(SOURCE, "utf8").length).toBeGreaterThan(2000);
  });
});
