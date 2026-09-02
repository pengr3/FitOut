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
//     ⚠ SINCE PLAN 18.1-13 THE CLAIM IS "ZERO DESTINATIONS", NOT "ZERO ANCHORS", and the difference
//     is one declared scheme rather than a loosened rule. D-271's contact reveal renders a compose
//     anchor once an operator has pressed for it; a compose anchor hands the address to a mail
//     client and navigates this document NOWHERE, so the terminal property is untouched by it. The
//     exemption is one scheme, capped at one per row, with `[role="link"]` still at zero — and the
//     filter that implements it has its OWN both-directions guard, because a filter that dropped
//     every anchor would satisfy the zero above permanently.
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

/** The one anchor shape the row may render. See the header's TERMINAL note. */
const COMPOSE_ANCHOR = 'a[href^="mailto:"]';

/** How many of them a row may render. One host, one address, one way to write to them. */
const MAX_COMPOSE_ANCHORS = 1;

/**
 * Every anchor in the row that is NOT the one declared compose exception — i.e. every DESTINATION.
 *
 * This is the amendment plan 18.1-13 made to assertion 1, and it is a filter rather than a deleted
 * clause on purpose: deleting the clause would license a detail page you click into to see the
 * photos, which is precisely what OPS-04 / D-246 forbid. Guarded in both directions below.
 */
function destinationAnchors(card: HTMLElement): Element[] {
  return Array.from(card.querySelectorAll("a")).filter((a) => !a.matches(COMPOSE_ANCHOR));
}

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
  it("renders zero DESTINATION anchors and zero link-role elements, on BOTH kinds", () => {
    for (const row of [hostRow(), listingRow()]) {
      cleanup();
      const card = renderRow(row);

      expect(
        destinationAnchors(card),
        "a DESTINATION anchor is inside the queue row. The row is TERMINAL: a detail page you " +
          "click into to see the photos is precisely what OPS-04 and D-246 forbid, and a second " +
          "place carrying approve/reject is a second place that has to be kept in agreement with " +
          "this one.\n\n" +
          "⚠ THE ONE EXEMPTION IS ONE SCHEME, ONE COUNT, ONE REASON (plan 18.1-13 / D-271): an " +
          "anchor whose href begins `mailto:` is a COMPOSE ACTION, not navigation — it hands the " +
          "address to a mail client and moves this document nowhere, so the row still browses " +
          "nowhere. Anything else here is a destination, whatever it is called. Do NOT widen the " +
          "filter to make a new href pass; a second scheme is a second argument, and deleting the " +
          "clause outright licenses exactly the detail page this row exists without.",
      ).toHaveLength(0);

      expect(
        card.querySelectorAll(COMPOSE_ANCHOR).length,
        `the row rendered more than ${MAX_COMPOSE_ANCHORS} compose anchor. One host has one ` +
          "address; a second is either a duplicate or a value that belongs to somebody else.",
      ).toBeLessThanOrEqual(MAX_COMPOSE_ANCHORS);

      // UNCHANGED, AND IT IS THE HALF THAT DID NOT MOVE. A `role="link"` element claims to be a
      // destination and is not exempted by anything: it is the shape a "make the row clickable"
      // change takes when somebody already knows an anchor would be filtered.
      expect(card.querySelectorAll('[role="link"]')).toHaveLength(0);
    }
  });

  it("the anchor query is capable of finding one, so the zero above means something", () => {
    // Guard the guard. Both assertions above are absences, and a selector that matched nothing would
    // satisfy them perfectly against a row that had grown a destination.
    const { container } = render(<a href="/somewhere">A link</a>);
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("the compose exemption is a FILTER that still reports a destination, in both directions", () => {
    // The case above guards the raw selector; this one guards the EXEMPTION plan 18.1-13 added. A
    // filter that dropped every anchor — `() => []`, or a predicate matching `a` rather than the
    // scheme — would satisfy the zero above permanently and indistinguishably from a clean row.
    //
    // ⚠ THE DESTINATION HREF IS DELIBERATELY NOT A REAL ROUTE, and it is not free to "improve" it
    // into one. `@next/next/no-html-link-for-pages` is an ERROR in this repo and matches a raw `<a>`
    // against the route manifest, so `/listings/lst_1` here fails `npm run build` — measured, in
    // this very commit. The shipped guard-the-guard above uses `/somewhere` for the same reason.
    // What the fixture needs is a path-shaped href the filter must NOT swallow; whether that path
    // resolves is irrelevant to the property being guarded.
    const DESTINATION = "/somewhere-not-a-route";
    const { container } = render(
      <div data-testid="row-card">
        <a href={DESTINATION}>A destination</a>
        <a href={`mailto:${HOST_EMAIL}`}>{HOST_EMAIL}</a>
      </div>,
    );
    const card = container.querySelector('[data-testid="row-card"]') as HTMLElement;

    expect(card.querySelectorAll("a"), "the fixture did not render two anchors").toHaveLength(2);
    expect(
      destinationAnchors(card).map((a) => a.getAttribute("href")),
      "the exemption filter swallowed a page destination, so assertion 1's zero means nothing",
    ).toEqual([DESTINATION]);
    expect(
      card.querySelectorAll(COMPOSE_ANCHOR),
      "…and the declared scheme is not found by the exemption's own selector",
    ).toHaveLength(1);
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

  it("a REVEALED host row swaps the control for the address, and stays terminal", async () => {
    vi.mocked(revealHostContact).mockResolvedValue({
      ok: true,
      contact: { email: HOST_EMAIL, phone: HOST_PHONE },
    });
    const card = renderRow(hostRow());
    await revealContact(card);

    // The control is GONE and the address has taken its place — the same three-shaped set, one
    // member swapped. A row that grew the anchor and KEPT the button would have four and fail.
    expect(Array.from(card.querySelectorAll(INTERACTIVE)).map(nameOf)).toEqual([
      HOST_EMAIL,
      `Approve ${HOST_NAME}`,
      `Reject ${HOST_NAME}`,
    ]);

    // The one anchor is the declared exemption, and there is still no destination and no link role.
    expect(destinationAnchors(card)).toHaveLength(0);
    expect(card.querySelectorAll(COMPOSE_ANCHOR)).toHaveLength(1);
    expect(card.querySelectorAll('[role="link"]')).toHaveLength(0);

    // FOCUS MOVING IS THE SUCCESS ANNOUNCEMENT (GATE-03 rule 7), which is why no second live region
    // is owed here and none may be added. Measurable in jsdom; the 320/1280 hand-walk is 18.1-14's.
    expect(
      document.activeElement?.getAttribute("href"),
      "focus did not land on the email anchor after a reveal. That move IS the announcement — " +
        "without it a screen-reader operator presses a button and hears nothing at all.",
    ).toBe(`mailto:${HOST_EMAIL}`);

    // And the action was called with the HOST's id, not the listing's and not a label.
    expect(vi.mocked(revealHostContact)).toHaveBeenCalledWith({ userId: "usr_1" });
  });

  it("a LISTING row reveals the host's contact too, keyed on the host id (D-271)", async () => {
    vi.mocked(revealHostContact).mockResolvedValue({
      ok: true,
      contact: { email: HOST_EMAIL, phone: HOST_PHONE },
    });
    const card = renderRow(listingRow());
    await revealContact(card);

    // The whole content of D-271's "both kinds": an ops question is usually about a LISTING, so the
    // way to reach the person has to be on the row carrying the subject of the question.
    expect(vi.mocked(revealHostContact)).toHaveBeenCalledWith({ userId: "usr_1" });
    expect(valueFor(card, "Email").textContent).toBe(HOST_EMAIL);
    expect(destinationAnchors(card)).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 2 — EVERYTHING NEEDED TO DECIDE IS ON THE ROW
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("OPS-04 — the evidence, per kind", () => {
  it("a listing row carries D-231's five material fields plus BOTH terms of the sell-gate", () => {
    const card = renderRow(listingRow());

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
    // The email is still there and is still the one compose anchor — a null phone is not a failure.
    expect(valueFor(card, "Email").textContent).toBe(HOST_EMAIL);
    expect(card.querySelectorAll(COMPOSE_ANCHOR)).toHaveLength(1);
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
    expect(card.querySelectorAll(COMPOSE_ANCHOR)).toHaveLength(0);
    expect(within(card).queryByText("Email")).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// 3 — THE PHOTOS ARE ON THE LISTING ROW, AND THERE IS NO PHOTO OR DOCUMENT AFFORDANCE ON A HOST ROW
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("the evidence a reviewer actually looks at", () => {
  it("a listing row reuses the shipped gallery VERBATIM, mosaic and lightbox trigger included", () => {
    const card = renderRow(listingRow());

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
