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

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ListingCard, type ListingCardData } from "@/components/listing/listing-card";
import { listingCardPriceParts, type CardPriceSource } from "@/lib/listing/card-price";
import {
  HOURS_MISSING_STATE,
  HOURS_MISSING_REASON,
  HOURS_MISSING_CTA,
} from "@/lib/listing/hours-signal";
import { REVIEW_SIGNAL } from "@/lib/listing/review-signal";
import { listingReviewState } from "@/lib/db/schema";

afterEach(cleanup);

function makeListing(overrides: Partial<ListingCardData> = {}): ListingCardData {
  return {
    id: "abc",
    title: "Sunset Court",
    primarySpaceType: "pickleball_court",
    status: "published",
    coverUrl: null,
    // The default is the state EVERY PRE-PHASE-18 CASE IN THIS FILE IMPLICITLY ASSUMED: a listing that
    // has been through review and passed. Choosing `pending` here — the column's own DB default —
    // would silently repaint nine shipped cases with the new chip and prove nothing about either.
    reviewState: "approved",
    ...overrides,
  };
}

// D-130 / GATE-05 split the price line in two, so the tests split the same way. The RATE COLUMNS are no
// longer on `ListingCardData` — they never cross into the client component — so the mode fork is exercised
// against the server-side helper (cases 3 and 4) and the card is exercised against the strings it is
// HANDED (cases 3b and 4b). Asserting only the helper would leave the render untested; asserting only the
// render would let the fork rot. Both halves, one fixture builder each.
function makePrice(overrides: Partial<CardPriceSource> = {}): CardPriceSource {
  return {
    hourlyRateCents: 30750,
    dayRateCents: null,
    perHeadPriceCents: null,
    occupancyMode: "exclusive",
    currency: "php",
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
        priceParts={["₱307.50/hr"]}
        availabilityHref="/host/listings/abc/availability"
        editHref="/host/listings/abc/edit"
      />,
    );

    const link = availabilityAnchor(container);
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe("/host/listings/abc/availability");
  });

  it("(2) renders NO availability link on a search card (prop omitted)", () => {
    const { container } = render(<ListingCard listing={makeListing()} priceParts={["₱307.50/hr"]} bookable />);

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
  it("(3) a drop-in listing reads per person, keyed on the MODE and not on a null rate column", () => {
    const parts = listingCardPriceParts(
      makePrice({
        occupancyMode: "open_capacity",
        perHeadPriceCents: 35000,
        hourlyRateCents: 30750,
        dayRateCents: 180000,
      }),
    );

    // ₱350 + the D-74 service fee — the same string search shows. Both exclusive rates are deliberately
    // populated, so this can only pass by forking on the persisted mode (09-07's lesson).
    expect(parts).toEqual(["₱367.50/person"]);
  });

  it("(3b) the card renders the drop-in string it is handed, with no badge and no scarcity", () => {
    const { container } = render(
      <ListingCard listing={makeListing()} priceParts={["₱367.50/person"]} bookable />,
    );

    const text = container.textContent ?? "";
    expect(text).toContain("₱367.50/person");
    expect(text).not.toContain("/hr");
    expect(text).not.toContain("/day");
    // A management surface: the mode badge and every scarcity string belong to booker-facing cards only.
    expect(screen.queryByText("Drop-in")).toBeNull();
    expect(text).not.toContain("Spots available");
    expect(text).not.toContain("left");
    expect(text).not.toContain("Fully booked");
  });

  it("(4) an exclusive listing's shipped /hr · /day parts are unchanged", () => {
    // The host's own set rates, not the all-in booker price — exactly as this card has always printed them.
    expect(listingCardPriceParts(makePrice({ dayRateCents: 180000 }))).toEqual([
      "₱307.50/hr",
      "₱1,800.00/day",
    ]);
  });

  it("(4b) the card joins the parts it is handed and falls back when there are none", () => {
    const { container } = render(
      <ListingCard
        listing={makeListing()}
        priceParts={["₱307.50/hr", "₱1,800.00/day"]}
        bookable
      />,
    );
    expect(container.textContent ?? "").toContain("₱307.50/hr · ₱1,800.00/day");
    expect(container.textContent ?? "").not.toContain("/person");

    cleanup();
    const empty = render(<ListingCard listing={makeListing()} priceParts={[]} bookable />);
    expect(empty.container.textContent ?? "").toContain("No pricing yet");
  });

  it("(4c) every money figure the card renders carries tabular-nums (D-130)", () => {
    const { container } = render(
      <ListingCard listing={makeListing()} priceParts={["₱307.50/hr"]} bookable />,
    );
    const priceEl = Array.from(container.querySelectorAll("p")).find((p) =>
      (p.textContent ?? "").includes("₱307.50/hr"),
    );
    expect(priceEl).toBeTruthy();
    expect(priceEl?.className).toContain("tabular-nums");
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
        priceParts={["₱307.50/hr"]}
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
        priceParts={["₱307.50/hr"]}
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
    const { container } = render(
      <ListingCard listing={makeListing()} priceParts={["₱307.50/hr"]} bookable hoursMissing />,
    );

    // Positive control: the search card renders, it simply carries no host-management signal.
    expect(screen.getByText("Sunset Court")).toBeTruthy();
    const text = container.textContent ?? "";
    expect(text).not.toContain(HOURS_MISSING_STATE);
    expect(text).not.toContain(HOURS_MISSING_REASON);
    expect(ctaAnchor(container)).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE REVIEW CHIP (phase 18 · D-230 / LVER-02's host half)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every assertion is against the IMPORTED signal, never a re-typed sentence — the same rule the
// no-hours block above states, for the same reason: a copy edit in `review-signal.ts` must not need an
// edit here, and a case quoting its own literal would go on passing after the shipped copy changed.
//
// THE HOST GRID IS THIS COMPONENT'S ONLY CALL SITE, so these cases are the whole render-level record of
// what a host sees. What they cannot see: whether the PAGE hands over the right review state or the
// right operator sentence. `npm run build` proves the page compiles and the wiring is typed; nothing
// here would notice a page that passed a constant.
describe("ListingCard review chip and notice (D-230)", () => {
  const HOST_PROPS = {
    availabilityHref: "/host/listings/abc/availability",
    editHref: "/host/listings/abc/edit",
  } as const;

  /** Every chip on the card, by the vendored Badge's own slot attribute — not by guessing at classes. */
  function chips(container: HTMLElement): string[] {
    return Array.from(container.querySelectorAll('[data-slot="badge"]')).map((el) =>
      (el.textContent ?? "").trim(),
    );
  }

  function wayOutAnchor(container: HTMLElement): HTMLAnchorElement | null {
    return (
      (Array.from(container.querySelectorAll("a")).find(
        (a) => (a.textContent ?? "").trim() === REVIEW_SIGNAL.rejected.wayOut,
      ) as HTMLAnchorElement | undefined) ?? null
    );
  }

  it("(10) `pending`: the In review chip, the reason, and NO way out", () => {
    const { container } = render(
      <ListingCard
        listing={makeListing({ reviewState: "pending" })}
        priceParts={["₱307.50/hr"]}
        bookable={false}
        {...HOST_PROPS}
      />,
    );

    expect(chips(container)).toEqual([REVIEW_SIGNAL.pending.chip]);
    expect(container.textContent ?? "").toContain(REVIEW_SIGNAL.pending.reason);

    // The absence is the assertion. There is nothing the host can do about a queue, and a control that
    // acts on nothing teaches a host that this product's affordances are decorative.
    expect(wayOutAnchor(container)).toBeNull();

    // It DISPLACES "Published · not bookable" rather than joining it: both are true, and this one names
    // the cause where the other names the symptom.
    expect(screen.queryByText("Published · not bookable")).toBeNull();
  });

  it("(11) `rejected`: the chip, the reason, the OPERATOR'S sentence verbatim, and the one real way out", () => {
    const operatorSentence = "The photos don't match the address on this listing.";
    const { container } = render(
      <ListingCard
        listing={makeListing({ reviewState: "rejected" })}
        priceParts={["₱307.50/hr"]}
        bookable={false}
        rejectionReason={operatorSentence}
        {...HOST_PROPS}
      />,
    );

    expect(chips(container)).toEqual([REVIEW_SIGNAL.rejected.chip]);

    const text = container.textContent ?? "";
    expect(text).toContain(REVIEW_SIGNAL.rejected.reason);
    // VERBATIM, and exactly once — never paraphrased, never summarised into the chip.
    expect(text).toContain(operatorSentence);
    expect(text.split(operatorSentence)).toHaveLength(2);
    // As TEXT (T-18-1301). Operator free text reaches a React text node and nothing renders markup.
    expect(container.innerHTML).not.toContain("<script");

    // The way out is TRUE because a material edit flips `rejected → pending` (D-249, plan 18-06), and
    // it points at the wizard route the card was already given rather than a second spelling of it.
    const wayOut = wayOutAnchor(container);
    expect(wayOut).not.toBeNull();
    expect(wayOut?.getAttribute("href")).toBe(HOST_PROPS.editHref);
  });

  it("(12) `grandfathered` renders EXACTLY what it rendered yesterday — nothing new (D-211/D-212)", () => {
    // THE MUTATION ANCHOR. A grandfathered listing was never checked, so there is no review outcome to
    // report, and "you were grandfathered" invites a question nobody at FitOut can answer. Both arms of
    // the pre-phase behaviour are pinned, because a chip that appeared on only one of them would slip
    // past a single-arm case.
    const live = render(
      <ListingCard
        listing={makeListing({ reviewState: "grandfathered" })}
        priceParts={["₱307.50/hr"]}
        bookable
        {...HOST_PROPS}
      />,
    );
    expect(chips(live.container)).toEqual(["Live"]);
    expect(live.container.textContent ?? "").not.toContain(REVIEW_SIGNAL.pending.reason);
    cleanup();

    const notBookable = render(
      <ListingCard
        listing={makeListing({ reviewState: "grandfathered" })}
        priceParts={["₱307.50/hr"]}
        bookable={false}
        {...HOST_PROPS}
      />,
    );
    expect(chips(notBookable.container)).toEqual(["Published · not bookable"]);
    // And no notice of any kind: not the pending sentence, not the rejection one.
    expect(notBookable.container.textContent ?? "").not.toContain(REVIEW_SIGNAL.rejected.reason);
  });

  it("(13) a DRAFT is never badged In review, though its review state is `pending` by default", () => {
    // `listing.review_state` DEFAULTS to `pending` in the schema, so every draft carries it. Badging a
    // draft "In review" would tell the host FitOut is checking something they never submitted.
    const { container } = render(
      <ListingCard
        listing={makeListing({ status: "draft", reviewState: "pending" })}
        priceParts={["₱307.50/hr"]}
        bookable={false}
        {...HOST_PROPS}
      />,
    );

    expect(chips(container)).toEqual(["Draft"]);
    expect(container.textContent ?? "").not.toContain(REVIEW_SIGNAL.pending.reason);
  });

  it("(14) EXACTLY ONE chip renders, for every status × bookable × review-state combination", () => {
    // ONE CHIP PER CARD is this file's own header rule, and the reason the review state joined
    // `statusBadge()` instead of becoming a second badge beside it. The combination sweep is what makes
    // that a measurement rather than a claim: 3 statuses × 2 × 5 review states = 30 renders, and a
    // second chip anywhere in that space fails here naming the combination.
    const statuses = ["draft", "published", "unlisted"] as const;
    const reviewStates = listingReviewState.enumValues;

    const wrong: string[] = [];
    for (const status of statuses) {
      for (const bookable of [true, false]) {
        for (const reviewState of reviewStates) {
          const { container } = render(
            <ListingCard
              listing={makeListing({ status, reviewState })}
              priceParts={["₱307.50/hr"]}
              bookable={bookable}
              {...HOST_PROPS}
            />,
          );
          const found = chips(container);
          if (found.length !== 1) {
            wrong.push(`  ${status} · bookable=${bookable} · ${reviewState} → ${found.length} chips: ${found.join(" | ")}`);
          }
          cleanup();
        }
      }
    }

    expect(
      wrong,
      `these combinations do not render exactly one chip:\n${wrong.join("\n")}\n` +
        "A management tile with two chips is two things to read before knowing whether the space is " +
        "selling. If a new state genuinely needs its own chip, it belongs INSIDE statusBadge().",
    ).toEqual([]);
    // Guard-the-guard: the sweep covered the whole review dimension, derived from the pgEnum, so a
    // sixth value widens this loop rather than slipping past it.
    expect(reviewStates.length).toBe(5);
  });
});

describe("ListingCard review history (LVER-07)", () => {
  const HOST_PROPS = {
    availabilityHref: "/host/listings/abc/availability",
    editHref: "/host/listings/abc/edit",
  } as const;

  it("renders no Review history trigger or dialog shell when the listing has zero cycles", () => {
    render(
      <ListingCard
        listing={makeListing()}
        priceParts={["₱307.50/hr"]}
        reviewHistory={{ cycles: [], hasOlder: false }}
        {...HOST_PROPS}
      />,
    );

    expect(screen.queryByRole("button", { name: "Review history" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens an already-resolved semantic lifecycle without fetching and renders a stored reason exactly once as text", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const operatorReason = "<script>The entrance photo does not match.</script>";
    render(
      <ListingCard
        listing={makeListing()}
        priceParts={["₱307.50/hr"]}
        reviewHistory={{
          cycles: [
            {
              events: ["Submitted 8 Sep 2026, 11:00 am", "Waiting"],
            },
            {
              events: [
                "Submitted 7 Sep 2026, 8:00 am",
                "Waiting",
                "Not approved 7 Sep 2026, 12:15 pm",
              ],
              reason: operatorReason,
            },
          ],
          hasOlder: false,
        }}
        {...HOST_PROPS}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Review history" });
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Review history" });
    expect(within(dialog).getByText('Review activity for “Sunset Court”, newest first.')).toBeTruthy();
    const cycleList = within(dialog).getByRole("list", { name: "Review cycles" });
    const cycles = Array.from(cycleList.children) as HTMLElement[];
    expect(cycles).toHaveLength(2);
    expect(within(cycles[0]).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Submitted 8 Sep 2026, 11:00 am",
      "Waiting",
    ]);
    expect(within(cycles[1]).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Submitted 7 Sep 2026, 8:00 am",
      "Waiting",
      "Not approved 7 Sep 2026, 12:15 pm",
    ]);
    expect((dialog.textContent ?? "").split(operatorReason)).toHaveLength(2);
    expect(dialog.innerHTML).not.toContain("<script>The entrance");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders five cycles plus only the approved sentinel and keeps long reason text selectable", () => {
    const longReason = "The entrance photo needs a wider view ".repeat(18).trim();
    render(
      <ListingCard
        listing={makeListing({ title: "A very long listing title that must wrap safely" })}
        priceParts={["₱307.50/hr"]}
        reviewHistory={{
          cycles: Array.from({ length: 5 }, (_, index) => ({
            events: [`Submitted ${index + 1} Sep 2026, 9:00 am`, "Waiting"],
            ...(index === 0 ? { reason: longReason } : {}),
          })),
          hasOlder: true,
        }}
        {...HOST_PROPS}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Review history" }));
    const dialog = screen.getByRole("dialog", { name: "Review history" });
    const cycles = Array.from(
      within(dialog).getByRole("list", { name: "Review cycles" }).children,
    );
    expect(cycles).toHaveLength(5);
    expect(within(dialog).getByText("Showing the latest five review cycles.")).toBeTruthy();
    const reason = within(dialog).getByText(longReason);
    expect(reason.className).toContain("select-text");
    expect(reason.className).not.toMatch(/line-clamp|truncate/);
  });

  it("focuses the visible Close control and returns focus to its trigger after Escape", async () => {
    render(
      <ListingCard
        listing={makeListing()}
        priceParts={["₱307.50/hr"]}
        reviewHistory={{ cycles: [{ events: ["Submitted today", "Waiting"] }], hasOlder: false }}
        {...HOST_PROPS}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Review history" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Review history" });
    const footer = dialog.querySelector('[data-slot="dialog-footer"]') as HTMLElement;
    const visibleClose = within(footer).getByRole("button", { name: "Close" });

    await waitFor(() => expect(document.activeElement).toBe(visibleClose));
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });
});
