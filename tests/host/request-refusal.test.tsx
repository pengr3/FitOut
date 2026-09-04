// @vitest-environment jsdom

// A REFUSED APPROVE OR DECLINE REPORTS ON THE ROW, ONCE (plan 14-03 · HFLOW-01).
//
// WHY THIS TEST EXISTS, AND WHAT IT CATCHES SILENTLY. Until this plan both refusal paths reported through
// `toast.error`. On the SUCCESS path a toast is the only possible report — the action revalidatePath's the
// inbox and the row refreshes away — but on a REFUSAL the row is still on screen, and the sentence saying
// why (a lapsed SLA, a request another tab already answered) lived in a dismissible, timed, unaddressable
// overlay that is gone on refresh. That is the class STATE-08 named on the booker side.
//
// The replacement has three properties, and each one fails invisibly if nobody asserts it:
//
//   1. EXACTLY ONE region. A toast left beside the new in-row line is two announcements for one outcome
//      (GATE-03 rule 6) — and it is the realistic regression, because both halves LOOK right on screen.
//      So the toast spy is asserted at ZERO calls, not merely "the region is present".
//   2. ONE region shared by BOTH paths. Approve and decline can only ever have refused one thing, so a
//      per-path region is a second element that renders on a row that has one outcome. The last case
//      drives both paths through the same mounted row and counts.
//   3. A NON-EMPTY ACCESSIBLE NAME. `role="status"` is `nameFrom: author` in ARIA — it takes NO name from
//      its own text — so a region with a perfectly good sentence in it can still be unaddressable, and
//      nothing on screen shows the difference. Read here through `@testing-library`'s `{ name }` option,
//      which runs `dom-accessibility-api`; that library is NOT imported directly, here or anywhere in this
//      repository (`tests/design/live-regions.test.tsx:25` states the rule).
//
// AND THE SENTENCE IS THE SERVER'S OWN, VERBATIM. The stubs below return the exact strings
// `src/app/actions/host-requests.ts` returns, and the assertion is `toBe`, not `toContain`: a client-side
// re-authoring is a second wording of a refusal, which is a second thing that has to be kept in agreement
// with the action that refused.
//
// Stub set: `tests/booking/host-booking-row.test.tsx`'s (`next/link`, the actions module, `sonner`), with
// `tests/listing/wizard-occupancy.test.tsx:51-58`'s pattern inverted — the actions are stubbed to REFUSE.

import * as React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/app/actions/host-requests", () => ({
  approveRequest: vi.fn(),
  declineRequest: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";
import { approveRequest, declineRequest } from "@/app/actions/host-requests";
import { RequestRow, type RequestRowData } from "@/components/host/request-row";

const approveMock = vi.mocked(approveRequest);
const declineMock = vi.mocked(declineRequest);
const toastSuccess = vi.mocked(toast.success);
const toastError = vi.mocked(toast.error);

/**
 * `src/app/actions/host-requests.ts:70-71`, verbatim. The one refusal a host actually meets: the 06-06
 * sweep, another tab, or the atomic `expires_at > now()` guard got there first.
 */
const NOT_PENDING = "This request is no longer pending.";

/** `host-requests.ts:65`, verbatim — the other shape, used to prove the region is not rendering a constant. */
const NOT_YOURS = "We couldn't find that request, or it isn't yours to manage.";

const GUEST = "Alex";

function makeRow(overrides: Partial<RequestRowData> = {}): RequestRowData {
  return {
    requestId: "bk_123",
    spaceTitle: "Sunset Court",
    whenLabel: "Sat, Aug 1, 10:00 AM – 11:00 AM (Makati time)",
    bookerLabel: GUEST,
    totalLabel: "₱1,050.00",
    expiresAt: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
}

function renderRow(): HTMLElement {
  const { container } = render(<RequestRow row={makeRow()} />);
  return container.querySelector('[data-testid="row-card"]') as HTMLElement;
}

/** Collapse JSX line wrapping so a sentence can be matched whole (`state08-alerts.test.tsx`'s helper). */
function textOf(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function pressApprove(row: HTMLElement): void {
  fireEvent.click(within(row).getByRole("button", { name: `Approve request from ${GUEST}` }));
}

/** Open the decline confirm overlay and press its confirm control. The overlay renders in a portal. */
async function pressDecline(row: HTMLElement): Promise<void> {
  fireEvent.click(within(row).getByRole("button", { name: `Decline request from ${GUEST}` }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Decline request" }));
}

/** Every status region INSIDE the row. Counted, never sampled — "at least one" is the shape rule 6 forbids. */
function regionsIn(row: HTMLElement): HTMLElement[] {
  return Array.from(row.querySelectorAll('[role="status"]'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

describe("a refused APPROVE renders one named in-row region and no toast", () => {
  it("renders exactly ONE status region, carrying the server's sentence verbatim", async () => {
    approveMock.mockResolvedValue({ ok: false, error: NOT_PENDING });
    const row = renderRow();

    pressApprove(row);
    await waitFor(() => expect(regionsIn(row)).toHaveLength(1));

    expect(textOf(regionsIn(row)[0])).toBe(NOT_PENDING);
  });

  it("gives that region a NON-EMPTY accessible name that is not a second copy of the sentence", async () => {
    approveMock.mockResolvedValue({ ok: false, error: NOT_PENDING });
    const row = renderRow();

    pressApprove(row);
    await waitFor(() => expect(regionsIn(row)).toHaveLength(1));

    // Through `{ name }`, i.e. `dom-accessibility-api`, rather than an attribute read: `role="status"` is
    // nameFrom:author, so a region with this exact text and no author-supplied label computes to `""`.
    expect(
      screen.queryAllByRole("status", { name: /\S/ }),
      "the refusal region has no non-empty accessible name (live-regions rule 5)",
    ).toHaveLength(1);

    // …and the name is a LABEL, not the sentence again. `live-regions.ts` records the measured hazard: a
    // NAMED live region can be announced by its NAME instead of its content on the VoiceOver/Safari
    // pairing, so a name equal to the sentence reads it twice (`share-link-box.tsx:109-121`).
    const named = screen.getAllByRole("status", { name: /\S/ })[0];
    expect(named.getAttribute("aria-label")).not.toBe(textOf(named));
  });

  it("dispatches ZERO error toasts — the region REPLACED the toast, it did not join it", async () => {
    approveMock.mockResolvedValue({ ok: false, error: NOT_PENDING });
    const row = renderRow();

    pressApprove(row);
    await waitFor(() => expect(regionsIn(row)).toHaveLength(1));

    expect(
      toastError,
      "a refusal announced twice — once in the row and once in a toast. One outcome, one announcement " +
        "(GATE-03 rule 6); the toast is the half that is gone on refresh.",
    ).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("renders the OTHER server sentence when the server sends it — no client-side constant", async () => {
    approveMock.mockResolvedValue({ ok: false, error: NOT_YOURS });
    const row = renderRow();

    pressApprove(row);
    await waitFor(() => expect(regionsIn(row)).toHaveLength(1));

    expect(textOf(regionsIn(row)[0])).toBe(NOT_YOURS);
  });

  it("calls the server action with the request id, unchanged (D-130)", async () => {
    approveMock.mockResolvedValue({ ok: false, error: NOT_PENDING });
    const row = renderRow();

    pressApprove(row);
    await waitFor(() => expect(regionsIn(row)).toHaveLength(1));

    expect(approveMock).toHaveBeenCalledTimes(1);
    expect(approveMock).toHaveBeenCalledWith("bk_123");
  });
});

describe("a refused DECLINE reports through the SAME region, and also without a toast", () => {
  it("renders exactly ONE status region with the server's sentence, and zero error toasts", async () => {
    declineMock.mockResolvedValue({ ok: false, error: NOT_PENDING });
    const row = renderRow();

    await pressDecline(row);
    await waitFor(() => expect(regionsIn(row)).toHaveLength(1));

    expect(textOf(regionsIn(row)[0])).toBe(NOT_PENDING);
    expect(toastError).not.toHaveBeenCalled();
    expect(declineMock).toHaveBeenCalledWith("bk_123");
  });

  it("BOTH refusal paths share ONE region — a second refusal does not render a second line", async () => {
    approveMock.mockResolvedValue({ ok: false, error: NOT_YOURS });
    declineMock.mockResolvedValue({ ok: false, error: NOT_PENDING });
    const row = renderRow();

    pressApprove(row);
    await waitFor(() => expect(regionsIn(row)).toHaveLength(1));
    const afterApprove = regionsIn(row)[0];
    expect(textOf(afterApprove)).toBe(NOT_YOURS);

    await pressDecline(row);
    await waitFor(() => expect(textOf(regionsIn(row)[0])).toBe(NOT_PENDING));

    expect(
      regionsIn(row),
      "the two refusal paths rendered two regions. A row can only ever have refused ONE thing, so a " +
        "region per path is a second element announcing the same outcome.",
    ).toHaveLength(1);
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("the success paths are untouched — the toast is the only possible report there", () => {
  it("an approved request toasts and renders NO status region", async () => {
    approveMock.mockResolvedValue({ ok: true });
    const row = renderRow();

    pressApprove(row);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));

    expect(
      regionsIn(row),
      "a status region rendered on the SUCCESS path. The action revalidatePath's the inbox and this row " +
        "refreshes away, so an in-row line has nothing to be read on.",
    ).toHaveLength(0);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("a declined request toasts and renders NO status region", async () => {
    declineMock.mockResolvedValue({ ok: true });
    const row = renderRow();

    await pressDecline(row);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(1));

    expect(regionsIn(row)).toHaveLength(0);
    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("guard-the-guard — the region query and the toast spy both work", () => {
  it("finds no status region on a freshly rendered row, so every count above is a change", () => {
    const row = renderRow();
    expect(regionsIn(row)).toHaveLength(0);
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("the toast spy IS callable — a permanently-zero spy would make every assertion above vacuous", () => {
    toast.error("probe");
    expect(toastError).toHaveBeenCalledTimes(1);
  });
});
