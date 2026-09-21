// @vitest-environment jsdom

// OPS-04 / D-246 / D-231 — THE REVIEW-QUEUE ROW AS A RENDERED FACT.
//
// WHY A RENDER TEST. Every claim here is a wiring fact that a later plan breaks SILENTLY, and none of
// them is visible to a type, a lint rule or any shipped design gate:
//
//   • THE ROW IS TERMINAL. `RowCard`'s `href` is optional, so giving this row a destination is a
//     one-word edit nothing objects to — and a detail page you click into to see the photos is
//     precisely what OPS-04 and D-246 forbid. "The row passes no href" and "nothing inside the
//     rendered row is a link" are only the same statement if the container honours the absence, which
//     is what this asserts against the output, with the router link stubbed to a plain anchor so a
//     re-added destination shows up as one.
//     ⚠ THE CLAIM IS "ZERO ANCHORS" AGAIN, AND IT IS A ROUND TRIP WITH TWO DATES ON IT rather than
//     an assertion that quietly drifted back. Plan 18.1-13 (2026-09-02) WIDENED it to "zero
//     destinations plus at most one `mailto:`" so D-271's contact reveal could render a compose
//     anchor; plan 18.1-16 (2026-09-03) RETURNED it under PM decision D-274, which ruled that the
//     revealed contact must be plain, copy-pasteable text rather than something you press. So this
//     is a TIGHTENING, not a change of direction: the widening was the departure and the zero is
//     the Phase-18 property this file's own note below says it "knows an anchor would fail".
//     What was removed is the word "link" and NOT the announcement — focus still moves on a
//     successful reveal, onto the revealed VALUE, which is a `tabindex="-1"` text node inside the
//     same `<dd>` the anchor occupied. Re-admitting any scheme here is a PM DECISION and not a
//     filter, and the two guard-the-guards below exist so that a re-introduced filter of any shape
//     reddens rather than making the zero permanently green.
//   • EVERYTHING NEEDED TO DECIDE IS ON THE ROW. D-231's five material fields plus the OTHER term of
//     the sell-gate, read as `<dt>`/`<dd>` PAIRS so a re-ordered list cannot pass by position.
//   • A HOST ROW HAS NO DOCUMENT AFFORDANCE, because no document exists (HVER-02 / D-206 / D-220).
//     Fabricating the affordance for a check that does not exist is the same defect as fabricating
//     the sentence, and the shape it arrives in is a panel, an empty state for one, or a disabled
//     control that suggests one is coming. All three are absences, so all three are asserted.
//   • THE WAIT FIGURE IS THE ONLY PROMOTED ELEMENT. "Loudest" is scale and position, never a hue, and
//     a styling pass can re-rank three text nodes by accident in a way review cannot see.
//
// ⚠ WHAT THIS FILE DOES NOT COVER. jsdom computes no stylesheet, so "the wait figure's font-size is
// strictly greater than every other text node's at 320 / 768 / 1280" is a browser measurement and
// belongs to the e2e sweeps plan 18-12 owns. What is claimed here — the type ROLE is present, it is
// UNIQUE in the row, and it leads — is exactly what a browser measurement takes for granted and never
// re-checks. A class name is not a font size and this file never says otherwise.
//
// The stub set is `tests/host/request-row.test.tsx`'s and `tests/listing/photo-gallery.test.tsx`'s,
// for the reasons they give: the router link needs an App-Router context jsdom has not got, the
// lightbox reads the router, and the decision controls' only server coupling is two action modules
// (`"use server"` → the DB + `next/headers`).

import * as React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { act, render, cleanup, fireEvent, within } from "@testing-library/react";

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

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("@/app/actions/ops-review", () => ({
  approveHost: vi.fn(),
  rejectHost: vi.fn(),
  approveListing: vi.fn(),
  rejectListing: vi.fn(),
}));
vi.mock("@/app/actions/cancel-booking", () => ({ cancelBookingAsOps: vi.fn() }));
// D-271 / OPS-06. Stubbed for the same reason the four decision actions are: its only server
// coupling is a `"use server"` module (the DB + `next/headers`). What it RETURNS is set per case, so
// the revealed state is reachable in jsdom without a session, a database or a network.
vi.mock("@/app/actions/ops-contact", () => ({ revealHostContact: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { revealHostContact } from "@/app/actions/ops-contact";
import {
  OpsQueueRow,
  type OpsQueueHostRow,
  type OpsQueueListingRow,
} from "@/components/ops/ops-queue-row";
import { OPS_CONTACT_REGION_NAME } from "@/components/ops/ops-contact-reveal";
import type { OpsCancelImpact } from "@/lib/ops/cancel-impact";

afterEach(cleanup);
beforeEach(() => vi.mocked(revealHostContact).mockReset());

const HOST_NAME = "Ana Reyes";
const LISTING_TITLE = "Sunset Court";
const WAIT = "Waiting 6 days";
const SUBMITTED = "Aug 26, 2026";
const PRICE = "₱1,000.00/hr";
const OPERATING_HOURS = [
  { dayOfWeek: 1, openTime: "16:00", closeTime: "21:00" },
  { dayOfWeek: 1, openTime: "06:00", closeTime: "10:00" },
];

/**
 * The two revealed values (D-271 / OPS-06).
 *
 * ⚠ NEITHER MATCHES `DOCUMENT_WORDS` BELOW, and that is checked by eye here because the scan runs
 * over the row's whole text: an address containing "id" as a word, or a domain spelling "license",
 * would fail the no-fabricated-document-affordance clause for a reason that has nothing to do with
 * what that clause is about.
 */
const HOST_EMAIL = "ana.reyes@example.test";
const HOST_PHONE = "0917 555 0110";

/** The accessible name the interactive-set assertions compare on — an `aria-label`, else the text. */
function nameOf(element: Element): string | null {
  return element.getAttribute("aria-label") ?? element.textContent;
}

/**
 * Press the reveal and let the stubbed action's promise settle.
 *
 * `act` around the click because the island sets state in a `.then` continuation: without it React
 * warns and — worse for a test — the assertions run against the pre-resolution render.
 */
async function revealContact(card: HTMLElement, subject: string = HOST_NAME): Promise<void> {
  const control = within(card).getByRole("button", { name: `Show contact for ${subject}` });
  await act(async () => {
    fireEvent.click(control);
  });
}

/** The four declared type roles (`src/lib/utils.ts`'s `TYPE_ROLES`), as the utilities that carry them. */
const ROLE_CLASSES = ["text-display", "text-heading", "text-body", "text-label"] as const;

/**
 * Every shape a browser treats as operable, plus the two ARIA roles that claim to be one.
 *
 * `[tabindex]:not([tabindex="-1"])` is in the list on purpose: a programmatically focusable `<div>`
 * with a click handler is the exact form a "make the row clickable" change takes when somebody already
 * knows an anchor would fail the assertion above it.
 */
const INTERACTIVE =
  'a, button, input, select, textarea, summary, [role="link"], [role="button"], [tabindex]:not([tabindex="-1"])';

/**
 * The words a fabricated identity-document affordance would arrive spelled with.
 *
 * Word-boundaried on purpose: this is asserted over the row's whole text, and a substring match would
 * fire on any word containing "id".
 */
const DOCUMENT_WORDS =
  /\b(document|documents|passport|licence|license|upload|uploads|selfie|ID)\b/i;

const IMPACT: OpsCancelImpact = {
  cancellableCount: 0,
  cancellableBookingIds: [],
  refundTotal: "₱0.00",
  retainedTotal: "₱0.00",
  hostPaid: "Nothing",
  notCancellableCount: 0,
  notCancellableReason: "their payout has already left FitOut",
};

function hostRow(over: Partial<OpsQueueHostRow> = {}): OpsQueueHostRow {
  return {
    kind: "host",
    userId: "usr_1",
    hostName: HOST_NAME,
    accountCreatedAt: new Date("2026-05-02T00:00:00Z"),
    emailVerified: true,
    listingsWaiting: 2,
    submittedAt: new Date("2026-08-26T00:00:00Z"),
    waitLabel: WAIT,
    submittedLabel: SUBMITTED,
    accountSinceLabel: "May 2026",
    ...over,
  };
}

function listingRow(over: Partial<OpsQueueListingRow> = {}): OpsQueueListingRow {
  return {
    kind: "listing",
    listingId: "lst_1",
    title: LISTING_TITLE,
    description: "A sunlit court with a complete staff-review description.",
    addressLine1: "12 Kalayaan Ave",
    addressLine2: null,
    city: "Makati",
    region: "NCR",
    postalCode: "1200",
    country: "PH",
    primarySpaceType: "home_private_gym",
    maxOccupancy: 8,
    hourlyRateCents: 100_000,
    dayRateCents: null,
    perHeadPriceCents: null,
    occupancyMode: "exclusive",
    currency: "php",
    hostId: "usr_1",
    hostName: HOST_NAME,
    hostVerificationStatus: "pending",
    photos: [
      { id: "ph_1", url: "https://example.test/1.jpg", position: 0 },
      { id: "ph_2", url: "https://example.test/2.jpg", position: 1 },
      { id: "ph_3", url: "https://example.test/3.jpg", position: 2 },
    ],
    amenities: ["wifi", "mystery_amenity"],
    operatingHours: OPERATING_HOURS,
    submittedAt: new Date("2026-08-26T00:00:00Z"),
    waitLabel: WAIT,
    submittedLabel: SUBMITTED,
    priceLabel: PRICE,
    impact: IMPACT,
    ...over,
  };
}

/** Renders through the pattern and hands back the card, failing loudly if the pattern was not used. */
function renderRow(row: OpsQueueHostRow | OpsQueueListingRow): HTMLElement {
  const { container } = render(<OpsQueueRow row={row} />);
  const card = container.querySelector('[data-testid="row-card"]');
  expect(card, "the row did not render through the RowCard pattern").not.toBeNull();
  return card as HTMLElement;
}

function expandListingEvidence(card: HTMLElement): HTMLElement {
  fireEvent.click(within(card).getByRole("button", { name: "Show listing evidence" }));
  return within(card).getByRole("region", { name: "Listing evidence" });
}

/** The `<dd>` whose `<dt>` reads `term`, read as a PAIR so a re-ordered list cannot pass by position. */
function valueFor(row: HTMLElement, term: string): HTMLElement {
  const dt = within(row).getByText(term);
  const value = dt.nextElementSibling;
  expect(value?.tagName, `the "${term}" term is not followed by a <dd>`).toBe("DD");
  return value as HTMLElement;
}

/** Which of the four declared roles an element carries, or `null`. Asserts it carries at most one. */
function typeRoleOf(element: Element): string | null {
  const carried = ROLE_CLASSES.filter((role) => element.classList.contains(role));
  expect(carried.length, `${element.className} carries two type roles at once`).toBeLessThan(2);
  return carried[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 1 — THE ROW IS TERMINAL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("OPS-04 / D-246 — the queue row browses nowhere", () => {
  it("renders zero anchors and zero link-role elements, on BOTH kinds", () => {
    for (const row of [hostRow(), listingRow()]) {
      cleanup();
      const card = renderRow(row);

      expect(
        Array.from(card.querySelectorAll("a")).map((a) => a.getAttribute("href")),
        "an anchor is inside the queue row. The row is TERMINAL: a detail page you click into to " +
          "see the photos is precisely what OPS-04 and D-246 forbid, and a second place carrying " +
          "approve/reject is a second place that has to be kept in agreement with this one.\n\n" +
          "⚠ AND THE ONE SCHEME THAT WAS EXEMPT FROM 18.1-13 TO 18.1-16 IS EXEMPT NO LONGER. For " +
          "one plan-pair this clause read 'zero destinations plus at most one `mailto:`', because " +
          "D-271's contact reveal rendered a compose anchor. PM decision D-274 (2026-09-03) ruled " +
          "the revealed contact must be plain, copy-pasteable text, so the count is zero again for " +
          "EVERY scheme and the exemption is returned rather than emptied.\n\n" +
          "Re-admitting an anchor here is a PM DECISION, not a filter. Do NOT add a predicate to " +
          "make a new href pass — a scheme is an argument and a filter is a place to hide one — " +
          "and do NOT delete the clause, which licenses exactly the detail page this row exists " +
          "without.",
      ).toEqual([]);

      // UNCHANGED, AND IT IS THE HALF THAT NEVER MOVED THROUGH EITHER PLAN. A `role="link"` element
      // claims to be a destination: it is the shape a "make the row clickable" change takes when
      // somebody already knows an anchor would fail the clause above it.
      expect(card.querySelectorAll('[role="link"]')).toHaveLength(0);
    }
  });

  it("the anchor query is capable of finding one, so the zero above means something", () => {
    // Guard the guard. Both assertions above are absences, and a selector that matched nothing would
    // satisfy them perfectly against a row that had grown a destination.
    const { container } = render(<a href="/somewhere">A link</a>);
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("the anchor query reports a COMPOSE anchor TOO, so no filter can be quietly swallowing one", () => {
    // ⚠ THIS CASE WAS NOT DELETED WITH THE ALLOWANCE IT USED TO GUARD; IT WAS REPURPOSED, and its
    // new job is the stronger one. Plan 18.1-13 added it to prove its exemption FILTER still
    // reported a real page destination. D-274 removed the filter, so the property worth guarding is
    // now that the UNFILTERED query reports BOTH kinds of anchor — a page destination AND a compose
    // link. A re-introduced exemption of ANY shape (`() => []`, a predicate on the scheme, a
    // `.filter()` anywhere in the chain, a narrowed selector) reddens HERE rather than making
    // assertion 1's zero permanently and indistinguishably green over a row that had grown one.
    //
    // The case above guards the raw selector against an absence; this one guards it against a
    // silent exclusion. Both are needed, and neither replaces the other.
    //
    // ⚠ THE DESTINATION HREF IS DELIBERATELY NOT A REAL ROUTE, and it is not free to "improve" it
    // into one. `@next/next/no-html-link-for-pages` is an ERROR in this repo and matches a raw `<a>`
    // against the route manifest, so `/listings/lst_1` here fails `npm run build` — measured, in
    // plan 18.1-13's own commit. The shipped guard-the-guard above uses `/somewhere` for the same
    // reason. What the fixture needs is a path-shaped href the query must NOT swallow; whether that
    // path resolves is irrelevant to the property being guarded.
    const DESTINATION = "/somewhere-not-a-route";
    const COMPOSE = `mailto:${HOST_EMAIL}`;
    const { container } = render(
      <div data-testid="row-card">
        <a href={DESTINATION}>A destination</a>
        <a href={COMPOSE}>{HOST_EMAIL}</a>
      </div>,
    );
    const card = container.querySelector('[data-testid="row-card"]') as HTMLElement;

    expect(card.querySelectorAll("a"), "the fixture did not render two anchors").toHaveLength(2);
    expect(
      Array.from(card.querySelectorAll("a")).map((a) => a.getAttribute("href")),
      "the anchor query did not report BOTH anchors in the fixture. Assertion 1's zero would then " +
        "be green over a row that had grown a destination, a re-introduced compose link, or both.",
    ).toEqual([DESTINATION, COMPOSE]);
  });

  it("a host row has exactly THREE interactive descendants, in DOM order", () => {
    const card = renderRow(hostRow());
    const operable = Array.from(card.querySelectorAll(INTERACTIVE));

    expect(
      operable.map(nameOf),
      "the host row's interactive set is not the declared THREE, in DOM order.\n\n" +
        "⚠ THE THIRD IS D-271'S CONTACT REVEAL, AND A FOURTH IS STILL FORBIDDEN. This array grew " +
        "from two to three in plan 18.1-13 for one named affordance with a decision behind it — it " +
        "was NOT loosened generically, and the next control to arrive here fails this assertion " +
        "exactly as it would have before. On a host row in particular that control is how a " +
        "FABRICATED DOCUMENT AFFORDANCE arrives: a disabled button suggesting an upload is coming " +
        "for a check that has no column, no image and no ID number (HVER-02 / D-206 / D-220).\n\n" +
        "The ORDER is asserted and is not incidental: `RowCard` renders `children` before " +
        "`actions`, and the reveal lives in the `<dl>` inside `children`, so an operator tabbing " +
        "the row meets the read before either decision.",
    ).toEqual([
      `Show contact for ${HOST_NAME}`,
      `Approve ${HOST_NAME}`,
      `Reject ${HOST_NAME}`,
    ]);
  });

  it("a REVEALED host row swaps the control for PLAIN TEXT, and stays strictly terminal", async () => {
    vi.mocked(revealHostContact).mockResolvedValue({
      ok: true,
      contact: { email: HOST_EMAIL, phone: HOST_PHONE },
    });
    const card = renderRow(hostRow());
    await revealContact(card);

    // The control is GONE and NOTHING OPERABLE took its place — the set is the two decisions again.
    expect(
      Array.from(card.querySelectorAll(INTERACTIVE)).map(nameOf),
      "a revealed host row's interactive set is not the declared TWO, in DOM order.\n\n" +
        "⚠ THIS ARRAY RETURNED TO TWO UNDER D-274 (2026-09-03), AND A THIRD MEMBER IS FORBIDDEN " +
        "AGAIN. Plan 18.1-13 grew it to three for one named affordance with a decision behind it — " +
        "the compose anchor D-271's reveal rendered. The PM ruled the revealed contact must be " +
        "plain, copy-pasteable text, so a revealed row is the two decisions and nothing else.\n\n" +
        "THE FOCUS TARGET THAT CARRIES THE ANNOUNCEMENT IS DELIBERATELY OUT OF THIS SET, and no " +
        "assertion was widened to accommodate it: `INTERACTIVE` above excludes `[tabindex=\"-1\"]` " +
        "by construction, so a programmatically-focusable value is not an affordance. A " +
        "`tabIndex={0}`, a `[role=\"button\"]` or a copy control on that value would each appear " +
        "here — which is why the `-1` is specified rather than suggested.\n\n" +
        "On a host row in particular a new control is how a FABRICATED DOCUMENT AFFORDANCE " +
        "arrives: a disabled button suggesting an upload is coming for a check that has no column, " +
        "no image and no ID number (HVER-02 / D-206 / D-220).\n\n" +
        "The ORDER is asserted and is not incidental: `RowCard` renders `children` before " +
        "`actions`, so an operator tabbing a revealed row meets the two decisions in the order the " +
        "row lists them, with the read already behind them.",
    ).toEqual([`Approve ${HOST_NAME}`, `Reject ${HOST_NAME}`]);

    // STRICTLY TERMINAL, after a reveal exactly as before one. No scheme, no link role, no filter.
    expect(card.querySelectorAll("a")).toHaveLength(0);
    expect(card.querySelectorAll('[role="link"]')).toHaveLength(0);

    // FOCUS MOVING IS THE SUCCESS ANNOUNCEMENT (GATE-03 rule 7), which is why no second live region
    // is owed here and none may be added. Measurable in jsdom; the 320/1280 hand-walk is 18.1-16's.
    const active = document.activeElement;
    expect(
      active,
      "nothing at all is focused after a successful reveal. That move IS the announcement — " +
        "without it a screen-reader operator presses a button and hears nothing at all.",
    ).not.toBeNull();
    expect(
      active?.textContent,
      "focus did not land on the revealed email VALUE after a reveal. That move IS the " +
        "announcement — without it a screen-reader operator presses a button and hears nothing at " +
        "all. Under D-274 the target is a PLAIN-TEXT node rather than the anchor it used to be, so " +
        "what is asserted is the text it speaks rather than a destination it does not have.",
    ).toBe(HOST_EMAIL);
    expect(
      active?.getAttribute("tabindex"),
      "the focus target is not `tabindex=\"-1\"`. It must be programmatically focusable WITHOUT " +
        "joining the tab order — `booking-reference.tsx:143-153`'s shipped precedent for a value " +
        "the user copies, one surface over. A `0` would put a non-interactive text node into the " +
        "tab order AND into the interactive set asserted above.",
    ).toBe("-1");
    expect(
      valueFor(card, "Email").contains(active),
      "the focus target is not inside the Email `<dd>`. ⚠ THIS CLAUSE IS WHAT PROVES THE `<dt>` " +
        "CONTEXT SURVIVED THE ANCHOR'S REMOVAL — structurally, rather than by argument. A screen " +
        "reader speaks the value together with its term because the target sits in the very `<dd>` " +
        "the anchor occupied; a wrapper around both facts would be invalid inside a `<dl>` and " +
        "would put the label-to-value association at risk at exactly the width where it matters.",
    ).toBe(true);

    // And the action was called with the HOST's id, not the listing's and not a label.
    expect(vi.mocked(revealHostContact)).toHaveBeenCalledWith({ userId: "usr_1" });
  });

  it("a RE-MOUNTED revealed row announces AGAIN — the effect is keyed on the contact, not run once", async () => {
    // PINS THE `[contact]` DEPENDENCY ARRAY, which is the property a "tidy this up so it only runs
    // on mount" edit deletes silently. A queue refresh re-mounts the row; the reveal that follows
    // has to announce itself the way the first one did, or an operator who refreshed hears nothing
    // and has no way to know a value arrived.
    vi.mocked(revealHostContact).mockResolvedValue({
      ok: true,
      contact: { email: HOST_EMAIL, phone: HOST_PHONE },
    });

    const first = renderRow(hostRow());
    await revealContact(first);
    expect(document.activeElement?.textContent).toBe(HOST_EMAIL);

    // Unmount the whole tree and do it again from cold, which is what a refresh looks like here.
    cleanup();
    expect(
      document.activeElement?.textContent,
      "the fixture did not actually unmount, so the second reveal below would be measuring the " +
        "first one's focus",
    ).not.toBe(HOST_EMAIL);

    const second = renderRow(hostRow());
    await revealContact(second);
    expect(
      document.activeElement?.textContent,
      "the SECOND reveal did not move focus. An announcement that fires once per document — a " +
        "run-once effect, a latched ref, a module-level flag — passes the case above and fails " +
        "here, which is the whole reason this case exists.",
    ).toBe(HOST_EMAIL);
    expect(valueFor(second, "Email").contains(document.activeElement)).toBe(true);
  });

  it("a LISTING row reveals the host's contact too, keyed on the host id (D-271)", async () => {
    vi.mocked(revealHostContact).mockResolvedValue({
      ok: true,
      contact: { email: HOST_EMAIL, phone: HOST_PHONE },
    });
    const card = renderRow(listingRow());
    expandListingEvidence(card);
    await revealContact(card);

    // The whole content of D-271's "both kinds": an ops question is usually about a LISTING, so the
    // way to reach the person has to be on the row carrying the subject of the question.
    expect(vi.mocked(revealHostContact)).toHaveBeenCalledWith({ userId: "usr_1" });
    expect(valueFor(card, "Email").textContent).toBe(HOST_EMAIL);
    expect(card.querySelectorAll("a")).toHaveLength(0);
  });
});

describe("OPS-13 / OPS-15 — listing evidence stays in its terminal row", () => {
  it("toggles one labelled evidence section while retaining focus and the singular decision widget", () => {
    const card = renderRow(listingRow());
    const disclosure = within(card).getByRole("button", { name: "Show listing evidence" });

    expect(disclosure.getAttribute("type")).toBe("button");
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    expect(within(card).queryByRole("region", { name: "Listing evidence" })).toBeNull();
    disclosure.focus();
    fireEvent.click(disclosure);

    expect(document.activeElement).toBe(disclosure);
    expect(within(card).getByRole("button", { name: "Hide listing evidence" })).toBe(disclosure);
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    const evidence = within(card).getByRole("region", { name: "Listing evidence" });
    expect(evidence.id).toBe(disclosure.getAttribute("aria-controls"));
    expect(evidence.textContent).toContain("A sunlit court with a complete staff-review description.");
    expect(evidence.textContent).toContain("Wi-Fi");
    expect(evidence.textContent).toContain("mystery_amenity");
    const approvals = within(card).getAllByRole("button", { name: `Approve ${LISTING_TITLE}` });
    expect(approvals).toHaveLength(1);
    expect(evidence.contains(approvals[0])).toBe(false);
    expect(card.querySelectorAll("a")).toHaveLength(0);
    expect(card.querySelectorAll('[role="link"]')).toHaveLength(0);
  });

  it("keeps one evidence order and names every partial listing state", () => {
    const card = renderRow(listingRow({ description: null, amenities: [], photos: [] }));
    const evidence = expandListingEvidence(card);

    expect(within(evidence).getByLabelText(`Photos of ${LISTING_TITLE}`).textContent).toContain(
      "No photos yet",
    );
    expect(valueFor(evidence, "Description").textContent).toBe("Not set");
    expect(valueFor(evidence, "Amenities").textContent).toBe("Not set");
    expect(valueFor(evidence, "Amenities").querySelector("ul")).toBeNull();
    expect(Array.from(evidence.querySelectorAll("dt")).map((term) => term.textContent)).toEqual([
      "Description",
      "Amenities",
      "Address",
      "Space type",
      "Capacity",
      "Price",
      "Operating hours",
      "Host",
      "Submitted",
      "Contact",
    ]);
  });

  it("shows canonical host-set weekly hours in the expanded listing evidence", () => {
    const card = renderRow(listingRow());
    const evidence = expandListingEvidence(card);

    expect(
      Array.from(valueFor(evidence, "Operating hours").querySelectorAll("li")).map(
        (item) => item.textContent,
      ),
    ).toEqual([
      "Sunday: closed",
      "Monday: 6:00 AM to 10:00 AM, and 4:00 PM to 9:00 PM",
      "Tuesday: closed",
      "Wednesday: closed",
      "Thursday: closed",
      "Friday: closed",
      "Saturday: closed",
    ]);
  });

  it("shows every weekday as explicitly closed when a listing has no host-set schedule", () => {
    const card = renderRow(listingRow({ operatingHours: [] }));
    const evidence = expandListingEvidence(card);

    expect(
      Array.from(valueFor(evidence, "Operating hours").querySelectorAll("li")).map(
        (item) => item.textContent,
      ),
    ).toEqual([
      "Sunday: closed",
      "Monday: closed",
      "Tuesday: closed",
      "Wednesday: closed",
      "Thursday: closed",
      "Friday: closed",
      "Saturday: closed",
    ]);
  });

  it("gives host rows neither the listing disclosure nor its evidence section", () => {
    const card = renderRow(hostRow());

    expect(within(card).queryByRole("button", { name: /listing evidence/i })).toBeNull();
    expect(within(card).queryByRole("region", { name: "Listing evidence" })).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 2 — EVERYTHING NEEDED TO DECIDE IS ON THE ROW
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("OPS-04 — the evidence, per kind", () => {
  it("a listing row carries D-231's five material fields plus BOTH terms of the sell-gate", () => {
    const card = renderRow(listingRow());
    expandListingEvidence(card);

    expect(valueFor(card, "Address").textContent).toBe("12 Kalayaan Ave, Makati, NCR, 1200, PH");
    expect(valueFor(card, "Space type").textContent).toBe("Home / private gym");
    expect(valueFor(card, "Capacity").textContent).toBe("8 people");
    expect(valueFor(card, "Price").textContent).toBe(PRICE);
    expect(valueFor(card, "Submitted").textContent).toBe(SUBMITTED);

    // The OTHER term of the sell-gate. A reviewer who cannot see whether the host has been checked
    // cannot tell whether approving this listing actually makes it sellable.
    const host = valueFor(card, "Host");
    expect(host.textContent).toContain(HOST_NAME);
    expect(host.textContent).toContain("waiting on a decision");
  });

  it("the host verification state is read from a TOTAL lookup, so no status renders blank", () => {
    for (const [status, phrase] of [
      ["unverified", "not checked yet"],
      ["pending", "waiting on a decision"],
      ["approved", "checked"],
      ["rejected", "not approved"],
      ["grandfathered", "never checked"],
      ["suspended", "hosting paused"],
    ] as const) {
      cleanup();
      const card = renderRow(listingRow({ hostVerificationStatus: status }));
      expandListingEvidence(card);
      expect(
        valueFor(card, "Host").textContent,
        `the ${status} host verification state renders no phrase. A blank cell reads as "fine" to ` +
          "an operator, which is the one thing it must never do.",
      ).toContain(phrase);
    }
  });

  it("a host row carries its four facts and nothing that needs a listing", () => {
    const card = renderRow(hostRow());

    expect(valueFor(card, "Account since").textContent).toBe("May 2026");
    expect(valueFor(card, "Email confirmed").textContent).toBe("Yes");
    expect(valueFor(card, "Listings waiting").textContent).toBe("2");
    expect(valueFor(card, "Submitted").textContent).toBe(SUBMITTED);

    expect(within(card).queryByText("Address")).toBeNull();
    expect(within(card).queryByText("Price")).toBeNull();
  });

  it("an unfinished listing renders what is missing as a state, never as a blank cell", () => {
    const card = renderRow(
      listingRow({
        title: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        region: null,
        postalCode: null,
        country: null,
        maxOccupancy: null,
        primarySpaceType: null,
      }),
    );
    expandListingEvidence(card);

    expect(valueFor(card, "Address").textContent).toBe("No address on the listing");
    expect(valueFor(card, "Capacity").textContent).toBe("Not set");
    expect(valueFor(card, "Space type").textContent).toBe("Not set");
    expect(within(card).getByText("Untitled listing")).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 2b — THE CONTACT REVEAL'S THREE STATES (OPS-06 / D-257 / D-271)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The AUDIT half of OPS-06 is `tests/ops/host-contact-reveal.test.ts`'s subject, measured against a
// real session and read back out of the trail table. What is measured HERE is the half a render can
// own: that nothing is in the document before a press, that a success REPLACES one fact with two
// rather than expanding one, that an absent phone reads as a state, and that a refusal lands in the
// island's one named region carrying the server's sentence unaltered.

describe("OPS-06 / D-271 — the contact reveal, before and after a press", () => {
  it("puts NEITHER value in the document before a press, on both kinds", () => {
    for (const row of [hostRow(), listingRow()]) {
      cleanup();
      const card = renderRow(row);
      if (row.kind === "listing") expandListingEvidence(card);

      // The affordance is there…
      expect(valueFor(card, "Contact").textContent).toBe("Show contact");
      // …and the values are not. This is the RENDERED half of the claim the server action's header
      // argues structurally: the queue projections do not carry these columns (FINDING F-6), so
      // there is nothing for the initial payload to have shipped and nothing for a CSS toggle to
      // hide. A reveal that read from props would pass every other case in this file.
      expect(card.textContent).not.toContain(HOST_EMAIL);
      expect(card.textContent).not.toContain(HOST_PHONE);
      expect(within(card).queryByText("Email")).toBeNull();
      expect(within(card).queryByText("Phone")).toBeNull();
      expect(vi.mocked(revealHostContact)).not.toHaveBeenCalled();
    }
  });

  it("REPLACES the Contact fact with TWO facts, read as dt/dd pairs", async () => {
    vi.mocked(revealHostContact).mockResolvedValue({
      ok: true,
      contact: { email: HOST_EMAIL, phone: HOST_PHONE },
    });
    const card = renderRow(hostRow());
    await revealContact(card);

    // TWO facts, not one line. `row-card.tsx`'s docblock records that the `<dl>` exists so the
    // label-to-value association survives linearisation on a narrow screen, and two values crammed
    // into one `<dd>` throws that away at exactly the width where it matters.
    expect(valueFor(card, "Email").textContent).toBe(HOST_EMAIL);
    expect(valueFor(card, "Phone").textContent).toBe(HOST_PHONE);

    // REPLACED, not added — otherwise the row would carry a stale control beside the values it
    // already fetched, and pressing it again would write a second audit row for no second reveal.
    expect(
      within(card).queryByText("Contact"),
      "the Contact fact survived the reveal, so the row grew rather than swapped",
    ).toBeNull();
  });

  it("renders an absent phone as \"Not provided\", never an empty <dd>", async () => {
    // `user.phone` is nullable and self-declared at submission (D-268), so this is a real state.
    vi.mocked(revealHostContact).mockResolvedValue({
      ok: true,
      contact: { email: HOST_EMAIL, phone: null },
    });
    const card = renderRow(hostRow());
    await revealContact(card);

    const phone = valueFor(card, "Phone");
    expect(
      phone.textContent,
      "an absent phone rendered a blank cell. `addressOf()`'s precedent one file over: a blank " +
        "cell reads as \"fine\" rather than as \"there is nothing here to check\".",
    ).toBe("Not provided");
    expect(phone.textContent?.trim().length).toBeGreaterThan(0);
    // The email is still there and is still plain text — a null phone is not a failure for it.
    expect(valueFor(card, "Email").textContent).toBe(HOST_EMAIL);
    expect(card.querySelectorAll("a")).toHaveLength(0);
  });

  it("lands a refusal in ONE named region, verbatim, and returns the control to idle", async () => {
    const SENTENCE = "Those contact details couldn't be shown. Reload the queue and try again.";
    vi.mocked(revealHostContact).mockResolvedValue({ ok: false, error: SENTENCE });
    const card = renderRow(hostRow());
    await revealContact(card);

    const regions = Array.from(card.querySelectorAll('[role="status"]'));
    expect(
      regions.map((r) => r.getAttribute("aria-label")),
      "the reveal's refusal did not land in exactly one region named by the constant the island " +
        "exports. `src/lib/design/live-regions.ts` declares ONE region for this file and reads " +
        "source rather than a render, so this is the only place the rendered name is checked.",
    ).toEqual([OPS_CONTACT_REGION_NAME]);
    expect(
      regions[0].textContent,
      "the client re-authored the server's sentence. A second wording of a refusal is a second " +
        "thing that has to be kept in agreement with the code that refused.",
    ).toBe(SENTENCE);

    // Idle again: the control is the retry, and no value leaked on the way past.
    expect(
      within(card).getByRole("button", { name: `Show contact for ${HOST_NAME}` }),
    ).toBeTruthy();
    expect(card.querySelectorAll("a")).toHaveLength(0);
    expect(within(card).queryByText("Email")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 3 — THE PHOTOS ARE ON THE LISTING ROW, AND THERE IS NO PHOTO OR DOCUMENT AFFORDANCE ON A HOST ROW
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("the evidence a reviewer actually looks at", () => {
  it("a listing row reuses the shipped gallery VERBATIM, mosaic and lightbox trigger included", () => {
    const card = renderRow(listingRow());
    expandListingEvidence(card);

    const gallery = within(card).getByLabelText(`Photos of ${LISTING_TITLE}`);
    expect(gallery.tagName).toBe("SECTION");
    // Three photos → the shipped hero-plus-stacked-pair template, with the shipped alt strings.
    expect(gallery.querySelectorAll("img")).toHaveLength(3);
    expect(gallery.querySelector("img")?.getAttribute("alt")).toBe(
      `${LISTING_TITLE} — photo 1 of 3`,
    );
    // The way into the full-screen set at the narrow floor, where the mosaic collapses to the hero.
    expect(within(gallery).getByRole("button", { name: "Show all 3 photos" })).toBeTruthy();
  });

  it("a host row renders NO photo affordance and NO document affordance of any shape", () => {
    const card = renderRow(hostRow());

    expect(
      card.querySelectorAll("img"),
      "a host row rendered an image. HVER-02 / D-206 / D-220 forbid the column, so there is nothing " +
        "to show and nothing that could imply there is.",
    ).toHaveLength(0);
    expect(card.querySelectorAll('input[type="file"]')).toHaveLength(0);
    // No disabled control suggesting one is coming — the third shape a fabricated affordance takes.
    expect(card.querySelectorAll("[disabled], [aria-disabled='true']")).toHaveLength(0);
    expect(
      card.textContent,
      "a host row's copy names a document, an ID or an upload. Fabricating the AFFORDANCE for a " +
        "check that does not exist is the same defect as fabricating the sentence.",
    ).not.toMatch(DOCUMENT_WORDS);
  });

  it("the document-word scan is capable of matching, so the absence above means something", () => {
    expect("Upload a passport").toMatch(DOCUMENT_WORDS);
    expect("Listings waiting").not.toMatch(DOCUMENT_WORDS);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 4 — THE WAIT FIGURE LEADS, AND NOTHING ELSE IS PROMOTED
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("the wait figure is the only promoted element", () => {
  it("carries the heading role, and NOTHING else in the row carries it", () => {
    for (const row of [hostRow(), listingRow()]) {
      cleanup();
      const card = renderRow(row);

      const promoted = Array.from(card.querySelectorAll("*")).filter(
        (el) => typeRoleOf(el) === "text-heading",
      );

      expect(
        promoted.map((el) => el.textContent),
        "something other than the wait figure carries the row's largest type role. Loudest is scale " +
          "and position, and an ops reviewer works the queue by age — so age leads, alone.",
      ).toEqual([WAIT]);

      // No document role either: the page's `<h1>` belongs to `PageHeader`, never to a row.
      expect(
        Array.from(card.querySelectorAll("*")).filter((el) => typeRoleOf(el) === "text-display"),
      ).toEqual([]);
    }
  });

  it("every value in the description list computes the SAME class, so none is promoted by accident", () => {
    const card = renderRow(listingRow());
    expandListingEvidence(card);
    const values = Array.from(card.querySelectorAll("dd"));
    expect(values.length).toBeGreaterThan(4);

    for (const value of values) {
      expect(
        typeRoleOf(value),
        `a <dd> reading "${value.textContent}" does not carry the row's one value role`,
      ).toBe("text-label");
    }
  });
});
