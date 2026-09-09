// @vitest-environment jsdom

// HFLOW-03 — the dashboard agenda's THREE STATES, and the signals block's three rows, as rendered facts.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE SILENT FAILURE THIS FILE EXISTS TO CATCH
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// An assertion of the form *"the agenda renders"* is satisfied by an ABSENT SECTION. Every natural way to
// write it — a `queryBy` that returns null, a `toBeNull()` on the wrong branch, a `getByText` that finds
// its string on a neighbouring block — passes on a page where the whole region silently stopped mounting.
// This repository has recorded that vacuity shape a dozen times across Phases 11, 12 and 13, and every
// time the fix was the same: assert the CONTAINER's presence in every state as its own case, before
// asserting anything about what is inside it, and then distinguish the states by WHICH CHILD they hold.
//
// So case 1 below is exactly that, and nothing else. It renders all three states and reports which of
// them produced the container — as a LIST rather than a boolean, so a failure names the state that lost
// its section instead of reporting `expected false to be true`.
//
// THE OTHER THREE THINGS ONLY A RENDER CAN SAY:
//
//   - D-140's core claim is a POSITION claim: the booker's first name is the row TITLE and the space is
//     the meta. "the component receives a booker label" and "the booker label is the thing a host reads
//     first" are only the same statement if the component wires them that way.
//   - T-14-05-FALSEALARM is a set of ABSENCES — zero retry affordances, zero alerting roles, zero alarm
//     tokens, and a body that claims nothing about bookability. An absence cannot be typed, only counted,
//     and only inside a named subtree: counted over the whole document it would pass on a render that
//     produced no empty state at all.
//   - D-140 fixes the signals' ORDER. Order is a fact about siblings in a tree, which no unit of the
//     three underlying queries can express.
//
// `next/link` is stubbed to a plain anchor (it needs an App-Router context absent in jsdom) and the
// PayMongo onboarding action is stubbed because `PayoutBanner` imports it and the module is a server
// module that reaches for the database — the same two stubs, for the same two reasons, as
// `tests/booking/host-booking-row.test.tsx:22-42`.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

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

vi.mock("@/app/actions/paymongo-connect", () => ({
  startPayoutOnboarding: vi.fn(),
}));

import {
  HostAgenda,
  AGENDA_HEADING,
  AGENDA_NONE_BODY,
  AGENDA_NONE_TITLE,
  AGENDA_ROUTE_OUT_LABEL,
  WITHHELD_BOOKER_LABEL,
  agendaTruncatedNote,
  type HostAgendaProps,
  type HostAgendaRowData,
} from "@/components/host/host-agenda";
import { HostSignals } from "@/components/host/host-signals";
import { HOURS_MISSING_CTA, HOURS_MISSING_STATE } from "@/lib/listing/hours-signal";
import { REQUESTS_WAITING_CTA } from "@/lib/host/requests-signal";

afterEach(cleanup);

/**
 * The threaded DB clock. A fixed instant rather than a live one, because D-141's whole point is that this
 * value arrives from ONE read — a test that let it drift would be testing something the product forbids.
 */
const NOW = new Date("2026-08-23T02:00:00Z");

function makeRow(overrides: Partial<HostAgendaRowData> = {}): HostAgendaRowData {
  return {
    bookingId: "bk_today_1",
    bookerLabel: "Jamie",
    spaceTitle: "Court A",
    whenLabel: "Fri, Aug 23, 9:00 AM – 11:00 AM (Makati time)",
    status: "confirmed",
    cancelledBy: null,
    endsAt: new Date("2026-08-23T03:00:00Z"),
    ...overrides,
  };
}

/**
 * State A — at least one session in the venue's own local day.
 *
 * `truncated` defaults to FALSE here and is passed explicitly by the WR-01 cases below. It is a
 * REQUIRED prop on the component precisely so a caller cannot forget it; this helper supplies the
 * ordinary value so the twenty-odd cases that are not about the cap say nothing about it.
 */
const stateA = (
  rows: HostAgendaRowData[] = [makeRow()],
  truncated = false,
): HostAgendaProps => ({
  rows,
  truncated,
  next: null,
  now: NOW,
});

/** State B — nothing today, something upcoming. */
const stateB = (): HostAgendaProps => ({
  rows: [],
  truncated: false,
  next: { dateLabel: "Sat, Aug 29", timeLabel: "10:00 AM", spaceTitle: "Court A" },
  now: NOW,
});

/** State C — nothing today and nothing upcoming. */
const stateC = (): HostAgendaProps => ({ rows: [], truncated: false, next: null, now: NOW });

/**
 * The token every alarm surface in this app paints with, named ONCE here.
 *
 * Written as a constant rather than inline so the negative assertion below reads as a rule rather than as
 * a string search, and so the one place it is spelled is a test file — the design greps that forbid it on
 * a calm surface read `src/`, and a comment quoting a banned token is how three plans in this repository
 * have disarmed their own check.
 */
const ALARM_TOKEN = "destructive";

/** Copy that would claim a host's spaces are sellable — the claim state C must not make. */
const BOOKABILITY_CLAIM = /bookable|live and (?:ready|bookable)|accepting bookings/i;

/** Anything that offers the host a second attempt at something that did not fail. */
const RETRY_AFFORDANCE = /try again|retry|reload|refresh/i;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CASE 1 — FIRST, AND ON ITS OWN. Everything below it is worthless if this is not true.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("the agenda container is present in ALL THREE states", () => {
  it("mounts the section in A, B and C — the claim an absent section would otherwise satisfy", () => {
    const states: ReadonlyArray<readonly [string, HostAgendaProps]> = [
      ["A · sessions today", stateA()],
      ["B · quiet day", stateB()],
      ["C · nothing booked", stateC()],
    ];

    const mounted: string[] = [];
    for (const [name, props] of states) {
      const { container } = render(<HostAgenda {...props} />);
      if (container.querySelector('[data-testid="host-agenda"]') !== null) mounted.push(name);
      cleanup();
    }

    expect(
      mounted,
      "the agenda section did not mount in every booking state. The three states are told apart by " +
        "WHICH CHILD the container holds, never by whether the container exists — a state that drops " +
        "the section takes its heading and its route-out with it, and every 'the agenda renders' " +
        "assertion in the suite stays green while it does.",
    ).toEqual(states.map(([name]) => name));
  });

  it("and each state renders exactly ONE of the three branches, never two and never none", () => {
    const branches = ["agenda-rows", "agenda-next", "agenda-none"] as const;
    const seen: Record<string, string[]> = {};

    for (const [name, props] of [
      ["A", stateA()],
      ["B", stateB()],
      ["C", stateC()],
    ] as const) {
      const { container } = render(<HostAgenda {...props} />);
      seen[name] = branches.filter((b) => container.querySelector(`[data-testid="${b}"]`) !== null);
      cleanup();
    }

    expect(seen).toEqual({ A: ["agenda-rows"], B: ["agenda-next"], C: ["agenda-none"] });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE CONTAINER'S OWN CONTENTS — the heading and the route-out, which every state carries
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("the heading and the route-out (D-141 · 14-UI-SPEC § The dashboard)", () => {
  it.each([
    ["A", stateA()],
    ["B", stateB()],
    ["C", stateC()],
  ])("state %s heads the agenda with the single word and NO date beside it", (_name, props) => {
    render(<HostAgenda {...props} />);
    const agenda = screen.getByTestId("host-agenda");
    const headings = within(agenda).getAllByRole("heading", { level: 2 });

    expect(headings).toHaveLength(1);
    // Exact, not a substring. A host whose listings span two zones has two "todays", so a date under
    // this heading would be false for one of them at exactly the hours the distinction matters — and
    // false silently. `toMatch(/Today/)` would pass on "Today, Aug 23", which is the defect.
    expect(headings[0].textContent).toMatch(/^Today$/);
    expect(headings[0].textContent).toBe(AGENDA_HEADING);
  });

  it.each([
    ["A", stateA()],
    ["B", stateB()],
    ["C", stateC()],
  ])("state %s reaches /host/bookings by accessible name", (_name, props) => {
    render(<HostAgenda {...props} />);
    const routeOut = within(screen.getByTestId("host-agenda")).getByRole("link", {
      name: AGENDA_ROUTE_OUT_LABEL,
    });
    expect(routeOut.getAttribute("href")).toBe("/host/bookings");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// STATE A — sessions today
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("state A — today's sessions, with the booker as the row title (D-140)", () => {
  const rows = [
    makeRow({ bookingId: "bk_1", bookerLabel: "Jamie", spaceTitle: "Court A" }),
    makeRow({ bookingId: "bk_2", bookerLabel: "Priya", spaceTitle: "Studio B" }),
    makeRow({ bookingId: "bk_3", bookerLabel: "Marco", spaceTitle: "Court A" }),
  ];

  it("renders one row per session inside the populated branch", () => {
    render(<HostAgenda {...stateA(rows)} />);
    const list = screen.getByTestId("agenda-rows");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("makes the BOOKER'S FIRST NAME the row title — the whole of D-140's argument", () => {
    render(<HostAgenda {...stateA(rows)} />);
    const list = screen.getByTestId("agenda-rows");

    // The title is the row's link (the pattern renders it as one when an `href` is present), so asking
    // for it BY ROLE is asking for the thing a host reads first and clicks. A space title resolving here
    // instead is the tile-grid dashboard the PM rejected, wearing a list's clothes.
    for (const row of rows) {
      const title = within(list).getByRole("link", { name: row.bookerLabel });
      expect(title.getAttribute("href")).toBe(`/host/bookings/${row.bookingId}`);
    }
  });

  it("puts the space and the venue-local window in the meta, never in the title", () => {
    render(<HostAgenda {...stateA([rows[0]])} />);
    const list = screen.getByTestId("agenda-rows");

    // Present as text…
    expect(list.textContent).toContain("Court A");
    expect(list.textContent).toContain("Fri, Aug 23, 9:00 AM – 11:00 AM (Makati time)");
    // …and NOT as the title.
    expect(within(list).queryByRole("link", { name: "Court A" })).toBeNull();
  });

  it("renders a withheld booker as the shared fallback, never as an empty title", () => {
    // Both paths, because the label is resolved server-side AND normalised in the component: the page
    // hands over the fallback string, and a page that forgot to would hand over an empty one. A nameless
    // row on the surface whose entire point is naming who is arriving is the defect either way.
    for (const label of [WITHHELD_BOOKER_LABEL, "", "   "]) {
      const { container } = render(
        <HostAgenda {...stateA([makeRow({ bookingId: "bk_anon", bookerLabel: label })])} />,
      );
      const title = container.querySelector('a[href="/host/bookings/bk_anon"]');
      expect(title?.textContent).toBe(WITHHELD_BOOKER_LABEL);
      expect(title?.textContent?.trim().length ?? 0).toBeGreaterThan(0);
      cleanup();
    }
  });

  it("carries the host-side lifecycle badge, and no approve/decline (the dashboard is a view)", () => {
    render(<HostAgenda {...stateA([makeRow({ status: "requested" })])} />);
    const list = screen.getByTestId("agenda-rows");

    expect(list.textContent).toContain("Requested");
    // D-144: approve and decline live on the inbox and nowhere else. Two places carrying an
    // irreversible action is two places that must be kept in agreement.
    expect(within(list).queryAllByRole("button")).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// STATE A, CAPPED — the truncation says so (WR-01)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `queryHostAgenda` bounds the today bucket. Until this fix the surface rendered the bounded list under
// a heading reading "Today" and gave no signal that a session had been dropped — and the bound is
// reachable by an ordinary drop-in listing, which mints one booking row per booker. A host would read a
// list that quietly omitted people who are coming.
//
// THE ABSENCE IS ASSERTED AS WELL AS THE PRESENCE. A note that renders unconditionally would tell every
// host their list is short, which is the same lie pointing the other way, and it is the shape the
// presence assertion alone cannot tell apart from a correct one.

describe("state A, capped — a truncated agenda says so (WR-01)", () => {
  const rows = [
    makeRow({ bookingId: "bk_1", bookerLabel: "Jamie" }),
    makeRow({ bookingId: "bk_2", bookerLabel: "Priya" }),
  ];

  it("renders the overflow sentence inside the agenda section when the read was capped", () => {
    render(<HostAgenda {...stateA(rows, true)} />);
    const section = screen.getByTestId("host-agenda");

    expect(
      within(section).getByText(agendaTruncatedNote(rows.length)),
      "a capped agenda that says nothing is a list headed Today with people missing from it",
    ).toBeTruthy();
  });

  it("counts the rows it actually RENDERED, so the sentence cannot outlive the list", () => {
    // Five rows, still capped. A sentence built from an imported cap constant would say twenty here and
    // be wrong on screen; this one is a fact about the list beneath it.
    const five = [0, 1, 2, 3, 4].map((i) =>
      makeRow({ bookingId: `bk_${i}`, bookerLabel: `Booker ${i}` }),
    );
    render(<HostAgenda {...stateA(five, true)} />);

    expect(screen.getByTestId("host-agenda").textContent).toContain(agendaTruncatedNote(5));
  });

  it("says NOTHING when the read was not capped — the flag is read, not assumed", () => {
    render(<HostAgenda {...stateA(rows, false)} />);
    const section = screen.getByTestId("host-agenda");

    expect(within(section).queryByText(agendaTruncatedNote(rows.length))).toBeNull();
    // Independent of the exact sentence, so a re-wording cannot make this pass by missing its own
    // string: nothing anywhere in the section claims the list is partial.
    expect(section.textContent).not.toMatch(/Showing the first/i);
  });

  it("is calm — the overflow is a busy day, not a failure (T-14-05-FALSEALARM)", () => {
    render(<HostAgenda {...stateA(rows, true)} />);
    const section = screen.getByTestId("host-agenda");
    const note = within(section).getByText(agendaTruncatedNote(rows.length));

    // SCOPED TO THE NOTE, deliberately, and not to the whole container the state-C case scans. The row
    // card's badge carries the alarm token inside an `aria-invalid:` conditional — shipped markup this
    // finding does not touch — so a container-wide scan here would be measuring `ui/badge.tsx` and
    // reporting it as this sentence's ink. What is being claimed is about the line that was ADDED.
    expect(note.className).not.toContain(ALARM_TOKEN);
    expect(note.getAttribute("role")).toBeNull();
    expect(note.textContent ?? "").not.toMatch(RETRY_AFFORDANCE);
    // And nothing in the section interrupts: a busy day is not an announcement.
    expect(within(section).queryAllByRole("alert")).toHaveLength(0);
    expect(within(section).queryAllByRole("status")).toHaveLength(0);
  });

  it("keeps the rows themselves untouched — the note is an addition, not a replacement", () => {
    render(<HostAgenda {...stateA(rows, true)} />);
    const list = screen.getByTestId("agenda-rows");

    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByRole("link", { name: "Jamie" })).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// STATE B — the quiet day
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("state B — a quiet day stays useful (D-142)", () => {
  it("names the next session's weekday, date, time and space in one sentence", () => {
    render(<HostAgenda {...stateB()} />);
    const quiet = screen.getByTestId("agenda-next");

    expect(quiet.textContent).toBe("Nothing today — next: Sat, Aug 29 · 10:00 AM · Court A");
    // Spelled out again as four independent membership checks, because the equality above would go red
    // for a punctuation edit and say nothing about which of the four facts went missing.
    for (const token of ["Sat", "Aug 29", "10:00 AM", "Court A"]) {
      expect(quiet.textContent).toContain(token);
    }
  });

  it("renders ZERO rows — the quiet branch is a sentence, not an empty list", () => {
    const { container } = render(<HostAgenda {...stateB()} />);
    expect(container.querySelectorAll("li")).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="row-card"]')).toHaveLength(0);
  });

  it("is calm: no alerting role, no alarm token, no retry", () => {
    const { container } = render(<HostAgenda {...stateB()} />);
    const quiet = screen.getByTestId("agenda-next");

    expect(quiet.querySelectorAll('[role="alert"], [role="alertdialog"], [aria-live]')).toHaveLength(0);
    expect(quiet.querySelectorAll(`[class*="${ALARM_TOKEN}"]`)).toHaveLength(0);
    expect(container.innerHTML).not.toContain(ALARM_TOKEN);
    expect(quiet.textContent ?? "").not.toMatch(RETRY_AFFORDANCE);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// STATE C — nothing booked. Every assertion here is an ABSENCE, scoped inside the branch's own hook.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("state C — an absence is never dressed as a failure (T-14-05-FALSEALARM)", () => {
  it("reads as set up and waiting, in the copy contract's words", () => {
    render(<HostAgenda {...stateC()} />);
    const none = screen.getByTestId("agenda-none");

    expect(within(none).getByRole("heading", { level: 3 }).textContent).toBe(AGENDA_NONE_TITLE);
    expect(none.textContent).toContain(AGENDA_NONE_BODY);
  });

  it("offers ZERO retry affordances and ZERO actions of any kind", () => {
    render(<HostAgenda {...stateC()} />);
    const none = screen.getByTestId("agenda-none");

    expect(within(none).queryAllByRole("button")).toHaveLength(0);
    expect(within(none).queryAllByRole("link")).toHaveLength(0);
    expect(none.textContent ?? "").not.toMatch(RETRY_AFFORDANCE);
  });

  it("carries ZERO alerting roles and ZERO alarm-token classes", () => {
    const { container } = render(<HostAgenda {...stateC()} />);
    const none = screen.getByTestId("agenda-none");

    expect(none.querySelectorAll('[role="alert"], [role="alertdialog"], [aria-live]')).toHaveLength(0);
    expect(none.querySelectorAll(`[class*="${ALARM_TOKEN}"]`)).toHaveLength(0);
    expect(container.innerHTML).not.toContain(ALARM_TOKEN);
  });

  it("uses no error vocabulary", () => {
    render(<HostAgenda {...stateC()} />);
    const text = screen.getByTestId("agenda-none").textContent ?? "";
    expect(text).not.toMatch(/error|failed|something went wrong|unable to|couldn't/i);
  });

  it("does NOT claim the host's spaces are bookable (T-14-05-FALSECLAIM)", () => {
    // The sharpest assertion in this file, and the least obvious. "Your spaces are live and bookable"
    // is FALSE for a host whose payouts are paused and false for a listing with no weekly hours — and
    // the signal rows three inches below this block may be saying exactly that at the same moment. The
    // body describes the MECHANISM instead, which is true regardless of setup state.
    render(<HostAgenda {...stateC()} />);
    const text = screen.getByTestId("agenda-none").textContent ?? "";

    expect(text).not.toMatch(BOOKABILITY_CLAIM);
    // Positive control: the mechanism sentence really is what is on screen, so the assertion above is
    // not passing because the panel rendered nothing at all.
    expect(text).toContain("their session shows up here on the day it happens");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE SIGNALS BLOCK — D-140's order, and its two conditional rows
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const MISSING_HOURS = [{ id: "lst_1", title: "Court A" }];

describe("the remaining signals block renders D-140's two rows in D-140's order", () => {
  it("orders requests before hours, as siblings rather than strings in a page", () => {
    const { container } = render(
      <HostSignals pendingRequests={4} missingHours={MISSING_HOURS} />,
    );
    const section = screen.getByTestId("host-signals");

    // The heading is screen-reader-only and is not one of the two rows; the rows are what follows it.
    const rows = [...section.children].filter((el) => el.tagName !== "H2");
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector("[data-requests-waiting]")).not.toBeNull();
    expect(rows[1].querySelector("[data-hours-missing]")).not.toBeNull();

    // Guard the guard: the scan really did read a populated tree.
    expect(container.textContent).toContain(REQUESTS_WAITING_CTA);
    expect(container.textContent).toContain(HOURS_MISSING_CTA);
  });

  it("names the block for the document outline without announcing it twice", () => {
    render(<HostSignals pendingRequests={1} missingHours={[]} />);
    const heading = within(screen.getByTestId("host-signals")).getByRole("heading", { level: 2 });
    expect(heading.className).toContain("sr-only");
  });
});

describe("the signals block hides either remaining row at zero", () => {
  it("renders row 1 only when a request is actually waiting", () => {
    const { container: withNone } = render(
      <HostSignals pendingRequests={0} missingHours={MISSING_HOURS} />,
    );
    expect(withNone.querySelector("[data-requests-waiting]")).toBeNull();
    cleanup();

    const { container: withOne } = render(
      <HostSignals pendingRequests={1} missingHours={MISSING_HOURS} />,
    );
    const row = withOne.querySelector("[data-requests-waiting]");
    expect(row).not.toBeNull();
    // The one-versus-several fork, which lives in the module beside the count's authority.
    expect(row?.textContent).toContain("1 request is waiting on your yes.");
    expect(row?.textContent).toContain("They expire");
    cleanup();

    const { container: withFour } = render(
      <HostSignals pendingRequests={4} missingHours={[]} />,
    );
    expect(withFour.querySelector("[data-requests-waiting]")?.textContent).toContain(
      "4 requests are waiting on your yes.",
    );
  });

  it("renders row 3 only when a published listing has no hours, with the shipped constants", () => {
    const { container: withNone } = render(
      <HostSignals pendingRequests={0} missingHours={[]} />,
    );
    expect(withNone.querySelector("[data-hours-missing]")).toBeNull();
    cleanup();

    const { container: withOne } = render(
      <HostSignals pendingRequests={0} missingHours={MISSING_HOURS} />,
    );
    const row = withOne.querySelector("[data-hours-missing]");
    // The singular arm NAMES the listing; the shipped assembly is preserved, and the state clause is
    // the imported constant rather than a retyped copy of it.
    expect(row?.textContent).toContain(HOURS_MISSING_STATE);
    expect(row?.textContent).toContain("Court A");
    cleanup();

    const { container: withTwo } = render(
      <HostSignals
        pendingRequests={0}
        missingHours={[
          { id: "lst_1", title: "Court A" },
          { id: "lst_2", title: "Studio B" },
        ]}
      />,
    );
    // Several are COUNTED, never named — naming them all here would be a second listings page.
    expect(withTwo.querySelector("[data-hours-missing]")?.textContent).toContain(
      "of your live listings",
    );
  });

});
