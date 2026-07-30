// @vitest-environment jsdom

// The drop-in search card (OPEN-04 · OC-12 · 09-UI-SPEC § 4) — and O2 as an EXECUTABLE rule.
//
// The rule under test is not "the card looks right"; it is that a drop-in card can never advertise hours
// the pass does not reserve. `Available 9:00 AM–11:00 AM on Fri, Aug 8` for a day pass is a claim about a
// reservation the booker is not buying (§ Copywriting O2) — and because the searcher's own `start`/`end`
// params flow straight into `windowLine`, that lie was the DEFAULT behaviour until this card forked. So
// two cases assert the absence of a clock time over the WHOLE rendered text (`/\d:/`), one of them with a
// searched window deliberately supplied. A future edit that reintroduces the hour line fails here, not in
// a screenshot.
//
// The same reasoning covers the link: a `?start=&end=` window the listing page has no picker to resume is
// a dead link, so an open card's href is asserted to carry `date=` and NEITHER hour param.
//
// The last case is the regression guard: an EXCLUSIVE row with the identical searched window must still
// render the shipped "Available …" line, unchanged. (Byte-identity of the whole exclusive card was proven
// separately by hashing the rendered DOM against the pre-fork component — see 09-14-SUMMARY.md.)
//
// Fixtures deliberately KEEP `hourlyRateCents` / `dayRateCents` on the drop-in row (09-07's lesson: 09-06
// requires a per-head price but never clears the exclusive columns, and OC-17 permits the mode switch), so
// these cases can only pass by keying on the persisted MODE, never on a null rate column.
//
// `next/link` is stubbed to a plain anchor (App-Router context is absent in jsdom), mirroring
// tests/listing/listing-card.test.tsx.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

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

import { SearchResultCard } from "@/components/search/search-result-card";
import { allInRateParts } from "@/lib/booking/all-in-rate";
import type { SearchResultRow } from "@/lib/search/query";

afterEach(cleanup);

// 2025-08-08 IS a Friday (2026-08-08 is a Saturday — the calendar slip 09-08 caught in the spec's own
// examples), so `Fri, Aug 8` is a true rendering of this date and can be pinned literally.
const FRIDAY = "2025-08-08";

const PER_HEAD_CENTS = 35000;

function makeOpenRow(overrides: Partial<SearchResultRow> = {}): SearchResultRow {
  const rates = { hourlyRateCents: 30750, dayRateCents: 180000 };
  return {
    id: "open-listing",
    title: "Iron Republic",
    primarySpaceType: "gym_fitness_floor",
    // Kept on purpose — see the header. A drop-in listing may still carry both exclusive rates.
    ...rates,
    timezone: "Asia/Manila",
    city: "Makati",
    coverPhotoUrl: null,
    distanceM: null,
    // Composed through the REAL server-side helper exactly as src/lib/search/query.ts composes it, so the
    // card is proven to render the string the search query would actually hand it.
    allInRateParts: allInRateParts({
      ...rates,
      perHeadPriceCents: PER_HEAD_CENTS,
      occupancyMode: "open_capacity",
    }),
    occupancyMode: "open_capacity",
    perHeadPriceCents: PER_HEAD_CENTS,
    spots: null,
    ...overrides,
  };
}

function makeExclusiveRow(overrides: Partial<SearchResultRow> = {}): SearchResultRow {
  const rates = { hourlyRateCents: 30750, dayRateCents: null };
  return {
    id: "exclusive-listing",
    title: "Sunset Court",
    primarySpaceType: "pickleball_court",
    ...rates,
    timezone: "Asia/Manila",
    city: "Makati",
    coverPhotoUrl: null,
    distanceM: null,
    allInRateParts: allInRateParts(rates),
    occupancyMode: "exclusive",
    perHeadPriceCents: null,
    spots: null,
    ...overrides,
  };
}

/** Any digit immediately followed by a colon — i.e. a wall-clock time anywhere in the rendered card. */
const CLOCK_TIME = /\d:/;

describe("SearchResultCard — drop-in listings (OC-12 / O2)", () => {
  it("(1) with NO date: badges Drop-in, prices per person, and shows no scarcity of any kind", () => {
    const row = makeOpenRow();
    // The card renders the SERVER's finished string: ₱350.00 per head + the D-74 service fee, all-in.
    expect(row.allInRateParts).toEqual(["₱367.50/person"]);

    const { container } = render(<SearchResultCard listing={row} />);

    expect(screen.getByText("Drop-in")).toBeTruthy();

    const text = container.textContent ?? "";
    expect(text).toContain("₱367.50/person");
    expect(text).toContain("Service fee included");
    // OC-12: no date in play ⇒ no chip, no number, no hint. All three chip strings are absent.
    expect(text).not.toContain("Spots available");
    expect(text).not.toContain("left");
    expect(text).not.toContain("Fully booked");
    expect(container.querySelector('[role="status"]')).toBeNull();
    // …and no availability line at all.
    expect(text).not.toContain("Available ");
  });

  it("(2) with a date in play: renders the date + venue tz and the server's chip, and NO clock time", () => {
    const { container } = render(
      <SearchResultCard
        listing={makeOpenRow({ spots: { remaining: 8, cap: 20, state: "open" } })}
        searchedWindow={{ date: FRIDAY }}
      />,
    );

    expect(screen.getByText("Fri, Aug 8 · Makati time")).toBeTruthy();
    expect(screen.getByText("Spots available")).toBeTruthy();
    // O2, executable: nothing in this card reads as a time, and the shipped exclusive line — whose
    // no-hours branch would look almost right — is not the one that rendered.
    const text = container.textContent ?? "";
    expect(text).not.toMatch(CLOCK_TIME);
    expect(text).not.toContain("Available ");
  });

  it("(3) with a date AND a searched start/end: STILL no clock time (O2 — the default lie)", () => {
    const { container } = render(
      <SearchResultCard
        listing={makeOpenRow({ spots: { remaining: 8, cap: 20, state: "open" } })}
        searchedWindow={{ date: FRIDAY, start: "09:00", end: "11:00" }}
      />,
    );

    const text = container.textContent ?? "";
    expect(text).not.toMatch(CLOCK_TIME);
    expect(text).not.toContain("Available ");
    // The date line is unaffected by the hours the searcher supplied.
    expect(screen.getByText("Fri, Aug 8 · Makati time")).toBeTruthy();
  });

  it("(4) renders the server's `low` state verbatim — the exact count, not a re-derivation", () => {
    render(
      <SearchResultCard
        listing={makeOpenRow({ spots: { remaining: 2, cap: 20, state: "low" } })}
        searchedWindow={{ date: FRIDAY }}
      />,
    );

    // `cap` 20 with 2 remaining is `low` only because the SERVER said so; the card never compares.
    expect(screen.getByText("Only 2 left")).toBeTruthy();
  });

  it("(5) links forward with the DATE ALONE — never a start/end window the listing page cannot resume", () => {
    const { container } = render(
      <SearchResultCard
        listing={makeOpenRow()}
        searchedWindow={{ date: FRIDAY, start: "09:00", end: "11:00" }}
      />,
    );

    const href = container.querySelector("a")?.getAttribute("href") ?? "";
    expect(href).toContain(`date=${FRIDAY}`);
    expect(href).not.toContain("start=");
    expect(href).not.toContain("end=");
  });

  it("(6) REGRESSION: an exclusive card with the same searched window is unchanged", () => {
    const { container } = render(
      <SearchResultCard
        listing={makeExclusiveRow()}
        searchedWindow={{ date: FRIDAY, start: "09:00", end: "11:00" }}
      />,
    );

    expect(
      screen.getByText("Available 9:00 AM–11:00 AM on Fri, Aug 8 · Makati time"),
    ).toBeTruthy();
    // No drop-in decoration leaks onto an exclusive card.
    expect(screen.queryByText("Drop-in")).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    // …and the link still carries the whole window it always carried.
    const href = container.querySelector("a")?.getAttribute("href") ?? "";
    expect(href).toContain("start=09%3A00");
    expect(href).toContain("end=11%3A00");
  });
});
