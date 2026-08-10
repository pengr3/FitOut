// @vitest-environment jsdom

// T4-hours (07-20) — the Availability link on the host "Your listings" card is a WIRING fact.
//
// The reported UAT defect: nothing links to the weekly-hours / availability editor at
// /host/listings/[id]/availability, so a published listing can sit at "No availability yet" with no way
// for the host to reach the editor. The fix adds an OPTIONAL `availabilityHref` prop that the Your-listings
// page passes and search cards omit — so this render test pins two things a refactor breaks silently:
//   (1) WITH the prop, an anchor to that href is actually in the DOM (the link is reachable), and
//   (2) WITHOUT the prop (a search card), no availability link renders (the prop truly gates it).
//
// `next/link` is stubbed to a plain anchor (App-Router context is absent in jsdom); `next/navigation` and
// `sonner` are stubbed because the card is a client component whose only runtime coupling is router.refresh
// and toasts — mirroring tests/booking/host-booking-row.test.tsx.

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

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ListingCard, type ListingCardData } from "@/components/listing/listing-card";
import {
  HOURS_MISSING_STATE,
  HOURS_MISSING_REASON,
  HOURS_MISSING_CTA,
} from "@/lib/listing/hours-signal";

afterEach(cleanup);

function makeListing(overrides: Partial<ListingCardData> = {}): ListingCardData {
  return {
    id: "abc",
    title: "Sunset Court",
    primarySpaceType: "pickleball_court",
    hourlyRateCents: 30750,
    dayRateCents: null,
    currency: "php",
    status: "published",
    coverUrl: null,
    occupancyMode: "exclusive",
    perHeadPriceCents: null,
    ...overrides,
  };
}

function availabilityAnchor(container: HTMLElement): HTMLAnchorElement | null {
  return Array.from(container.querySelectorAll("a")).find((a) =>
    /availability/i.test(a.textContent ?? ""),
  ) as HTMLAnchorElement | undefined ?? null;
}

describe("ListingCard availability link (T4-hours)", () => {
  it("(1) renders an Availability anchor to the given href when availabilityHref is set", () => {
    const { container } = render(
      <ListingCard
        listing={makeListing()}
        availabilityHref="/host/listings/abc/availability"
        editHref="/host/listings/abc/edit"
      />,
    );

    const link = availabilityAnchor(container);
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("/host/listings/abc/availability");
  });

  it("(2) renders NO availability link on a search card (prop omitted)", () => {
    const { container } = render(<ListingCard listing={makeListing()} bookable />);

    // Positive control: the search card renders (its title is present) but carries no availability link.
    expect(screen.getByText("Sunset Court")).toBeTruthy();
    expect(availabilityAnchor(container)).toBeNull();
  });
});

// 09-14 (09-UI-SPEC § 4, final paragraph) — the host's own tile prices a drop-in listing PER PERSON, from
// the shared `allInRateParts` definition, and stays a management surface: no `Drop-in` badge, no scarcity.
//
// The drop-in fixture deliberately KEEPS both exclusive rate columns (09-07's lesson: 09-06 requires a
// per-head price but never clears them, and OC-17 permits the mode switch), so case (3) can only pass by
// keying on the persisted MODE — a fork written against `hourlyRateCents == null` fails it.
describe("ListingCard price line by occupancy mode (09-14)", () => {
  it("(3) a drop-in listing reads per person, with no badge and no scarcity", () => {
    const { container } = render(
      <ListingCard
        listing={makeListing({
          occupancyMode: "open_capacity",
          perHeadPriceCents: 35000,
          hourlyRateCents: 30750,
          dayRateCents: 180000,
        })}
        bookable
      />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("₱367.50/person"); // ₱350 + the D-74 service fee, the same string search shows
    expect(text).not.toContain("/hr");
    expect(text).not.toContain("/day");
    // A management surface: the mode badge and every scarcity string belong to booker-facing cards only.
    expect(screen.queryByText("Drop-in")).toBeNull();
    expect(text).not.toContain("Spots available");
    expect(text).not.toContain("left");
    expect(text).not.toContain("Fully booked");
  });

  it("(4) an exclusive listing's shipped /hr · /day line is unchanged", () => {
    const { container } = render(
      <ListingCard listing={makeListing({ dayRateCents: 180000 })} bookable />,
    );

    // The host's own set rates, not the all-in booker price — exactly as this card has always printed them.
    expect(container.textContent ?? "").toContain("₱307.50/hr · ₱1,800.00/day");
    expect(container.textContent ?? "").not.toContain("/person");
  });
});

// v1.0 audit finding #4 — the no-weekly-hours notice on the host's own tile.
//
// The card is SHARED with Phase-4 search cards, which is the whole reason the render guard is
// `hoursMissing && availabilityHref` rather than `hoursMissing` alone (T-IU7-02): a search card supplies
// NEITHER prop, so a host-management signal is structurally unable to reach a booker-facing surface —
// the same "the prop truly gates it" discipline case (2) above already establishes for the Availability
// link. Every assertion below is against the IMPORTED constants, never a re-typed literal; that is the
// point of the constants existing, and a copy edit in hours-signal.ts must not need an edit here.
describe("ListingCard no-hours notice (v1.0 audit finding #4)", () => {
  function ctaAnchor(container: HTMLElement): HTMLAnchorElement | null {
    return (
      (Array.from(container.querySelectorAll("a")).find(
        (a) => (a.textContent ?? "").trim() === HOURS_MISSING_CTA,
      ) as HTMLAnchorElement | undefined) ?? null
    );
  }

  it("(7) shows the state, the reason and the way out on a host card whose listing has no hours", () => {
    // ⚠️ RE-POINTED BY 260810-sti. This case used to render `bookable hoursMissing` and assert the badge
    // still read "Live". That combination became UNREACHABLE in production when hours joined the
    // sell-gate as deriveBookable's fourth term: a published listing with no hours is not bookable, so
    // the host grid can no longer produce a Live card carrying this notice. Left as it was, the case
    // would have gone on testing an impossible state — green, and meaningless. It now asserts the state
    // the app can actually produce, which is also the more useful one: the notice EXPLAINS the badge.
    const { container } = render(
      <ListingCard
        listing={makeListing()}
        bookable={false}
        hoursMissing
        availabilityHref="/host/listings/abc/availability"
        editHref="/host/listings/abc/edit"
      />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain(HOURS_MISSING_STATE);
    expect(text).toContain(HOURS_MISSING_REASON);

    // Rule O7: the way out is a real link into the editor the card already knows the route to.
    const cta = ctaAnchor(container);
    expect(cta).not.toBeNull();
    expect(cta?.getAttribute("href")).toBe("/host/listings/abc/availability");

    // The badge now says what is actually true of this listing, and the notice below explains it.
    expect(screen.getByText("Published · not bookable")).toBeTruthy();
    expect(screen.queryByText("Live")).toBeNull();
  });

  it("(8) shows nothing when the host's listing HAS hours", () => {
    const { container } = render(
      <ListingCard
        listing={makeListing()}
        bookable
        hoursMissing={false}
        availabilityHref="/host/listings/abc/availability"
        editHref="/host/listings/abc/edit"
      />,
    );

    const text = container.textContent ?? "";
    expect(text).not.toContain(HOURS_MISSING_STATE);
    expect(text).not.toContain(HOURS_MISSING_REASON);
    expect(ctaAnchor(container)).toBeNull();
  });

  it("(9) never leaks the host-only notice onto a search card (availabilityHref omitted)", () => {
    const { container } = render(<ListingCard listing={makeListing()} bookable hoursMissing />);

    // Positive control: the search card renders, it simply carries no host-management signal.
    expect(screen.getByText("Sunset Court")).toBeTruthy();
    const text = container.textContent ?? "";
    expect(text).not.toContain(HOURS_MISSING_STATE);
    expect(text).not.toContain(HOURS_MISSING_REASON);
    expect(ctaAnchor(container)).toBeNull();
  });
});
