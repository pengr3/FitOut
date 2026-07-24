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
