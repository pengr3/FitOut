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
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, within } from "@testing-library/react";

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
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import {
  OpsQueueRow,
  type OpsQueueHostRow,
  type OpsQueueListingRow,
} from "@/components/ops/ops-queue-row";
import type { OpsCancelImpact } from "@/lib/ops/cancel-impact";

afterEach(cleanup);

const HOST_NAME = "Ana Reyes";
const LISTING_TITLE = "Sunset Court";
const WAIT = "Waiting 6 days";
const SUBMITTED = "Aug 26, 2026";
const PRICE = "₱1,000.00/hr";

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
  it("renders zero anchors and zero link-role elements, on BOTH kinds", () => {
    for (const row of [hostRow(), listingRow()]) {
      cleanup();
      const card = renderRow(row);

      expect(
        card.querySelectorAll("a"),
        "an anchor is inside the queue row. The row is TERMINAL: a detail page you click into to " +
          "see the photos is precisely what OPS-04 and D-246 forbid, and a second place carrying " +
          "approve/reject is a second place that has to be kept in agreement with this one.",
      ).toHaveLength(0);

      expect(card.querySelectorAll('[role="link"]')).toHaveLength(0);
    }
  });

  it("the anchor query is capable of finding one, so the zero above means something", () => {
    // Guard the guard. Both assertions above are absences, and a selector that matched nothing would
    // satisfy them perfectly against a row that had grown a destination.
    const { container } = render(<a href="/somewhere">A link</a>);
    expect(container.querySelectorAll("a")).toHaveLength(1);
  });

  it("a host row has exactly TWO interactive descendants, and they are the two decisions", () => {
    const card = renderRow(hostRow());
    const operable = Array.from(card.querySelectorAll(INTERACTIVE));

    expect(
      operable.map((el) => el.getAttribute("aria-label") ?? el.textContent),
      "the host row grew an interactive descendant beyond its two decisions. On a host row in " +
        "particular this is how a fabricated document affordance arrives — a disabled control that " +
        "suggests an upload is coming.",
    ).toEqual([`Approve ${HOST_NAME}`, `Reject ${HOST_NAME}`]);
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
