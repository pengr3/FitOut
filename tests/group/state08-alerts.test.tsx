// @vitest-environment jsdom

// STATE-08 (plan 13-05) — THE TWO GROUP ALERTS, AND THE TOASTS THAT ARE NO LONGER THERE.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE CLAIMS, AND WHY EACH HALF IS NEEDED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `tests/design/status-vocab.test.ts`'s AST scan proves the must-read fact LEFT the toast. It cannot
// prove it ARRIVED anywhere — a file that simply deleted the sentence satisfies every ban perfectly,
// and would be a worse product than the toast was. So this file asserts the positive half by
// rendering, and it asserts BOTH directions of GATE-03 rule 6 at once:
//
//   • EXACTLY ONE `role="status"` announces each outcome — counted, not merely queried. "At least
//     one" is satisfied by the toast-plus-alert pair rule 6 exists to forbid, where a screen reader
//     hears one removal twice in two wordings from two places on the page.
//   • THAT REGION HAS A NON-EMPTY ACCESSIBLE NAME. `role="status"` is `nameFrom: author`, so a region
//     named only by its content computes `""` — measured from scratch in
//     `tests/design/skeleton-a11y.test.tsx:154-170` and relied on here. `queryAllByRole("status",
//     { name })` runs the same `dom-accessibility-api` engine, so this is the real computation rather
//     than an `aria-label` string comparison dressed up as one.
//   • ZERO TOASTS on the success path of both outcomes.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE SPY'S OWN POSITIVE CONTROL — without it, "zero toast calls" means nothing
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every success assertion below is `expect(spy).not.toHaveBeenCalled()`, which a spy wired to the
// wrong module satisfies forever. Two live controls close that:
//
//   1. `ShareLinkBox`'s copy path DOES toast, and case (8) watches it fire through this same mock.
//      That is the allow-listed row in the AST scan, and it is the reason the control is a real call
//      site rather than a synthetic one — it also proves plan 13-05 did not take the copy toasts out
//      as collateral.
//   2. The removal's REFUSAL path still toasts, and case (4) watches it. It is also the assertion
//      that the alert cannot announce a removal that did not happen.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE FIGURES ARE THE SERVER'S, AND THIS FILE NEVER RECOMPUTES THEM (T-13-05-COUNTCROSS)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `removeAttendee` is mocked to return `attending` and `spotsFree` as FINISHED numbers, and the
// expected sentence is written out with those same digits rather than derived from the fixture list.
// If the roster ever started counting its own rows, these cases would not move — which is exactly
// why the assertion is on the SENTENCE the organizer reads and not on an expression.
//
// ⚠️ `attending` IS ORGANIZER-INCLUSIVE (D-113). The fixtures below deliberately use a value that is
// NOT `coming.length` and not `coming.length + 1` either, so a component that quietly re-derived it
// from the list — with or without the `+ 1` — fails here on the number a person would have read.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//   • THE SERVER'S ARITHMETIC. Whether `removeAttendee` returns the right two numbers is a database
//     question and lives with the group action's own suite; here it is a mock. This file's claim is
//     about the announcement, not the count.
//   • THE PAGE'S WIRING. `AttendeeRoster` and `ShareLinkBox` are rendered directly. The management
//     page is an async RSC with a session and a database behind it.
//   • PIXELS AND ANNOUNCEMENT TIMING. That a live region is REACHED by a screen reader at the moment
//     it appears is a runtime property no jsdom assertion reaches.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";

// The repo's toast-spy idiom — `tests/booking/booking-reference.test.tsx:34-36`, verbatim in shape.
const toastSuccess = vi.hoisted(() => vi.fn());
const toastError = vi.hoisted(() => vi.fn());
const toastWarning = vi.hoisted(() => vi.fn());
const removeAttendeeMock = vi.hoisted(() => vi.fn());
const refreshMock = vi.hoisted(() => vi.fn());

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError, warning: toastWarning },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: vi.fn() }) }));
vi.mock("@/app/actions/group", () => ({ removeAttendee: removeAttendeeMock }));

import type { RosterEntry } from "@/lib/group/rsvp";
import { AttendeeRoster } from "@/components/group/attendee-roster";
import { ShareLinkBox } from "@/components/group/share-link-box";

// jsdom implements no ResizeObserver and the Radix dialog's layers measure themselves with one.
// `tests/availability/availability-calendar.test.tsx:75-83`'s stub, same reason.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

/** Two `yes` rows. The organizer is a display fixture with no rsvp row, so they are not here (D-113). */
const ROSTER: RosterEntry[] = [
  {
    rsvpId: "rsvp-ana",
    name: "Ana",
    status: "yes",
    isAccount: true,
    hasEmail: true,
    createdAt: new Date("2026-08-01T00:00:00Z"),
    updatedAt: new Date("2026-08-01T00:00:00Z"),
  },
  {
    rsvpId: "rsvp-ben",
    name: "Ben",
    status: "yes",
    isAccount: false,
    hasEmail: false,
    createdAt: new Date("2026-08-02T00:00:00Z"),
    updatedAt: new Date("2026-08-02T00:00:00Z"),
  },
];

/**
 * The server's figures. NOT derivable from `ROSTER`: two rows remain listed while the action reports
 * five people coming, because the roster the component holds is the PRE-refresh one and the count is
 * the post-delete one. A component that counted its own rows cannot produce these.
 */
const ATTENDING = 5;
const SPOTS_FREE = 3;

/** The locked copy, 13-UI-SPEC § Copywriting Contract → STATE-08 alerts. */
const REMOVAL_SENTENCE = `Ana removed — ${ATTENDING} coming, ${SPOTS_FREE} spots free.`;
const REMOVAL_REGION_NAME = "Attendee removed";
const ROTATION_SENTENCE =
  "The old invite link no longer works. Copy the new one below and share it again.";
const ROTATION_REGION_NAME = "Invite link updated";

const URL_BEFORE = "https://fitout.test/invite/aaaaaaaaaaaaaaaa";
const URL_AFTER = "https://fitout.test/invite/bbbbbbbbbbbbbbbb";

/** Collapse JSX line wrapping so a sentence can be matched whole (`top-up-nudge.test.tsx`'s helper). */
function textOf(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Open the confirm dialog on Ana's row and press its confirm control. */
async function removeAna(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "Remove Ana from this group" }));
  const dialog = await screen.findByRole("dialog");
  const confirm = within(dialog).getByRole("button", { name: "Remove attendee" });
  fireEvent.click(confirm);
}

beforeEach(() => {
  toastSuccess.mockReset();
  toastError.mockReset();
  toastWarning.mockReset();
  refreshMock.mockReset();
  removeAttendeeMock.mockReset();
});

afterEach(cleanup);

describe("STATE-08 — the attendee-removed outcome is an in-page alert, not a toast", () => {
  it("(1) renders NO status region before anything happens — a page is not a change", () => {
    // GATE-03's rule for this phase, and the reason it is asserted first: a region that is always
    // present announces on every fresh navigation, which is either silence or a duplicate. It is also
    // the baseline every count below is measured against.
    render(<AttendeeRoster entries={ROSTER} />);
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("(2) after a removal renders EXACTLY ONE named status region, and dispatches NO toast", async () => {
    removeAttendeeMock.mockResolvedValue({ ok: true, attending: ATTENDING, spotsFree: SPOTS_FREE });
    render(<AttendeeRoster entries={ROSTER} />);

    await removeAna();

    await waitFor(() => expect(screen.queryAllByRole("status")).toHaveLength(1));

    // EXACTLY ONE, counted. "At least one" is satisfied by the toast-plus-alert pair rule 6 forbids.
    const regions = screen.queryAllByRole("status");
    expect(regions).toHaveLength(1);

    // The NAME, through `dom-accessibility-api` rather than an attribute read: `role="status"` takes
    // no name from its content, so this is the assertion that the region is addressable at all.
    expect(
      screen.queryAllByRole("status", { name: REMOVAL_REGION_NAME }),
      "the removal region has no non-empty accessible name (live-regions rule 5)",
    ).toHaveLength(1);

    // The SENTENCE, with the server's digits. See the header for why they are not derivable here.
    expect(textOf(regions[0])).toBe(REMOVAL_SENTENCE);

    // ZERO toasts on the success path — the alert REPLACES the toast (GATE-03 rule 6).
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();

    // …and the surfaces are still refreshed, so the roster and meter move with the alert.
    expect(refreshMock).toHaveBeenCalled();
  });

  it("(3) says `1 spot free`, not `1 spots free` — the only judgement the sentence makes", async () => {
    removeAttendeeMock.mockResolvedValue({ ok: true, attending: 8, spotsFree: 1 });
    render(<AttendeeRoster entries={ROSTER} />);

    await removeAna();

    await waitFor(() => expect(screen.queryAllByRole("status")).toHaveLength(1));
    expect(textOf(screen.queryAllByRole("status")[0])).toBe("Ana removed — 8 coming, 1 spot free.");
  });

  it("(4) on a server refusal announces NOTHING in-page, and keeps the calm toast", async () => {
    // THE SPY'S FIRST POSITIVE CONTROL, and a real property in its own right: an alert that appeared
    // whether or not the removal happened would be a region announcing a fact the server refused.
    const CALM = "We couldn't find that booking, or it isn't yours to manage.";
    removeAttendeeMock.mockResolvedValue({ ok: false, error: CALM });
    render(<AttendeeRoster entries={ROSTER} />);

    await removeAna();

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(CALM));
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

describe("STATE-08 — the link-regenerated outcome is an in-page alert, not a toast", () => {
  it("(5) renders NO status region on a fresh mount, however the URL looks", () => {
    render(<ShareLinkBox inviteUrl={URL_BEFORE} />);
    expect(screen.queryAllByRole("status")).toHaveLength(0);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("(6) when the rendered link changes, renders EXACTLY ONE named region and NO toast", () => {
    // The rotation arrives the way it arrives in the product: `router.refresh()` re-reads the token
    // server-side under the owner scope and hands this component a different URL. The announcement is
    // therefore a function of the thing announced — see the component's header.
    const view = render(<ShareLinkBox inviteUrl={URL_BEFORE} />);
    expect(screen.queryAllByRole("status")).toHaveLength(0);

    view.rerender(<ShareLinkBox inviteUrl={URL_AFTER} />);

    const regions = screen.queryAllByRole("status");
    expect(regions).toHaveLength(1);
    expect(
      screen.queryAllByRole("status", { name: ROTATION_REGION_NAME }),
      "the rotation region has no non-empty accessible name (live-regions rule 5)",
    ).toHaveLength(1);
    expect(textOf(regions[0])).toBe(ROTATION_SENTENCE);

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();

    // …and the field beneath it actually holds the NEW link, so the sentence's "the new one below"
    // is true of what is on screen rather than a claim about it.
    // Read as a plain DOM property: `jest-dom`'s matchers are not registered in this suite.
    expect((screen.getByLabelText("Your invite link") as HTMLInputElement).value).toBe(URL_AFTER);
  });

  it("(7) re-rendering with the SAME link announces nothing — the poller must stay quiet", () => {
    // The D-84 poller calls `router.refresh()` on a bounded interval. A region that appeared on every
    // refresh would announce a rotation that never happened, every few seconds.
    const view = render(<ShareLinkBox inviteUrl={URL_BEFORE} />);
    view.rerender(<ShareLinkBox inviteUrl={URL_BEFORE} />);
    view.rerender(<ShareLinkBox inviteUrl={URL_BEFORE} />);
    expect(screen.queryAllByRole("status")).toHaveLength(0);
  });

  it("(8) leaves the copy toasts alone — and that is the toast spy's positive control", async () => {
    // THE ALLOW-LISTED ROW IN THE AST SCAN, watched actually firing. Two things at once: the copy
    // confirmation survived plan 13-05 (it announces plumbing, which is what a toast is for), and
    // every `not.toHaveBeenCalled()` above is backed by a spy that demonstrably CAN observe a call.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    render(<ShareLinkBox inviteUrl={URL_BEFORE} />);
    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Link copied"));
    expect(writeText).toHaveBeenCalledWith(URL_BEFORE);
    // …and a copy is not an outcome that needs a region.
    expect(screen.queryAllByRole("status")).toHaveLength(0);
  });
});
