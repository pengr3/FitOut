// @vitest-environment jsdom

// STATE-03 / D-54 — the four states `search-results.tsx` can be in below the filter bar, and the ONE
// property that separates them: which of {the relaxation band, the escape hatches, a results grid} is
// on screen.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A DOUBLE ABSENCE IS THE ASSERTION THAT MATTERS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-54: cold start is UNCHANGED — no band, no ladder, no escape hatches. "No band" alone is a weak
// claim, because a component that rendered nothing at all satisfies it perfectly; so is "no hatches".
// Case (1) asserts BOTH, and then asserts the cold-start EMPTY STATE IS there, which is what makes the
// two zeros mean something. Every escape hatch is a filter control, and offering "Broaden radius" to
// someone in a city with no supply is a button that cannot work — that is the whole of D-54, and it is
// the reason this file's first case is about a page with nothing on it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE REGRESSION PIN, AND THE DISCIPLINE IT FOLLOWS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Case (5) pins the POPULATED grid — the shipped state this plan does not touch — and it is GREEN
// throughout. A file whose every case moves with its own plan cannot tell "the band is absent because
// this state does not render one" from "the band is absent because the component threw and the branch
// never ran". The pin is what makes the three absences above it non-vacuous: if `SearchResults` were
// broken, case (5) would be the one that says so.
//
// jsdom applies no Tailwind (D-131), so nothing here reads a rendered box, a gutter or a colour. The
// band's PLACEMENT above the grid is asserted structurally (document order), and its tinted control is
// `e2e/zero-result-relax.spec.ts`'s to see.

import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

// The App-Router hooks are absent in jsdom. `push`/`refresh` are captured so the Undo case can read
// the URL this component would have navigated to — the same seam `pushWith` writes through.
const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

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

import { SearchResults } from "@/components/search/search-results";
import { allInRateParts } from "@/lib/booking/all-in-rate";
import type { SearchResultRow } from "@/lib/search/query";

afterEach(() => {
  cleanup();
  push.mockClear();
  refresh.mockClear();
});

const BAND = "search-relax-band";
const CARD = "result-card";

/** The three shipped escape-hatch labels, verbatim. Their ABSENCE is half of D-54. */
const HATCHES = ["Broaden radius", "Clear filters", "Show nearby spaces"] as const;

function makeRow(id: string, title: string): SearchResultRow {
  const rates = { hourlyRateCents: 45000, dayRateCents: 280000 };
  return {
    id,
    title,
    primarySpaceType: "pickleball_court",
    ...rates,
    timezone: "Asia/Manila",
    city: "Makati",
    coverPhotoUrl: null,
    distanceM: 1200,
    allInRateParts: allInRateParts({
      ...rates,
      perHeadPriceCents: null,
      occupancyMode: "exclusive",
    }),
    occupancyMode: "exclusive",
    perHeadPriceCents: null,
    spots: null,
    // HVER-05: this file is about the relaxation band and the empty/loading states, not about the
    // chip, so the row is unbadged — the same shape the grandfathered catalogue arrives in.
    fitoutChecked: false,
  };
}

/** Everything `SearchResults` needs, with the state-selecting props left to each case. */
function baseProps() {
  return {
    results: [] as SearchResultRow[],
    hasMore: false,
    hasOrigin: true,
    hasQuery: true,
    sort: "nearest" as const,
    page: 0,
    currentRadius: 10,
    heading: "0 spaces near you",
    city: "Manila",
    queryString: "lat=14.5547&lng=121.0244&category=pickleball_court",
  };
}

const RELAXATION = {
  rung: "radius" as const,
  results: [makeRow("relaxed-1", "Poblacion Pickleball Court")],
  asked: {
    category: "pickleball_court",
    radiusKm: 10,
    date: undefined,
    start: undefined,
    end: undefined,
    priceMaxCents: undefined,
  },
  effectiveRadiusKm: 25,
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (1) COLD START — the double absence (D-54).
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(1) cold start renders NEITHER the band NOR any escape hatch", () => {
  it("shows the liquidity-floor empty state and nothing that blames a filter", () => {
    render(<SearchResults {...baseProps()} hasQuery={false} heading="Browse spaces in Manila" />);

    // GUARD-THE-GUARD FIRST: the two zeros below are true of a component that rendered nothing.
    expect(
      screen.getByText("No spaces are bookable here yet"),
      "the cold-start empty state did not render, so the two absences below say nothing at all.",
    ).toBeTruthy();

    expect(
      screen.queryAllByTestId(BAND),
      "cold start ran the relaxation ladder. D-54: there is nothing to relax when the city has no " +
        "supply, and a band that named a widened radius would be describing work nobody did.",
    ).toHaveLength(0);

    for (const hatch of HATCHES) {
      expect(
        screen.queryByRole("button", { name: hatch }),
        `cold start offered "${hatch}". Every hatch is a filter control, and offering one to someone ` +
          "in a city with no supply is a button that cannot work (D-30 / D-54).",
      ).toBeNull();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (2) ZERO RESULTS + A RUNG THAT GAVE — the band AND real cards.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(2) a relaxed search renders the band and at least one card", () => {
  it("names exactly ONE relaxed constraint and shows the rows it bought", () => {
    render(<SearchResults {...baseProps()} relaxation={RELAXATION} />);

    const band = screen.getByTestId(BAND);
    expect(band.getAttribute("role"), "GATE-03 rule 1 — the band is a polite status region").toBe(
      "status",
    );
    expect(
      band.getAttribute("aria-label"),
      "`status` is nameFrom:author; naming this region risks a screen reader announcing the LABEL " +
        "instead of the sentence, which is the entire content.",
    ).toBeNull();

    // AC#29, STRUCTURALLY. The count cannot be taken from the band's TEXT: line 1 legitimately carries
    // the booker's own "within 10 km" while line 2 carries the relaxed "within 25 km", so a textual
    // count of relaxed-constraint phrases sees two.
    expect(
      within(band).getByText((_, node) => node?.hasAttribute("data-relax-changed") === true),
    ).toBeTruthy();
    expect(band.querySelectorAll("[data-relax-changed]")).toHaveLength(1);

    // The changed VALUE is the string the relaxed control now renders — AC#30's other side.
    expect(band.querySelector("[data-relax-value]")?.textContent).toBe("25 km");

    expect(screen.getAllByTestId(CARD).length).toBeGreaterThanOrEqual(1);

    // PLACEMENT: directly above the grid, never inside it (12-UI-SPEC § The relaxation band).
    const card = screen.getAllByTestId(CARD)[0];
    expect(band.contains(card), "the band is wrapping a result card — it must sit ABOVE the grid").toBe(
      false,
    );
    expect(
      band.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING,
      "the first card comes BEFORE the band in document order",
    ).toBeTruthy();

    // The escape hatches are NOT also on screen — rule 6, one region per outcome. The band and the
    // empty state live in mutually exclusive branches and this is what says so.
    for (const hatch of HATCHES) {
      expect(screen.queryByRole("button", { name: hatch })).toBeNull();
    }
  });

  it("Undo ADDS relax=0 to the BOOKER'S query rather than removing anything", () => {
    render(<SearchResults {...baseProps()} relaxation={RELAXATION} />);

    screen.getByRole("button", { name: "Undo" }).click();

    expect(push).toHaveBeenCalledTimes(1);
    const url = new URL(push.mock.calls[0][0] as string, "http://localhost");
    expect(
      url.searchParams.get("relax"),
      "without the suppression flag the RSC simply relaxes again: the band comes straight back and " +
        "Undo is a button that visibly does nothing (T-12-12-UNDOLOOP).",
    ).toBe("0");
    // The booker's ORIGINAL filters, untouched — the relaxed 25 km is nowhere in this URL.
    expect(url.searchParams.get("category")).toBe("pickleball_court");
    expect(url.searchParams.get("radius")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (3) EVERY RUNG EXHAUSTED — the empty state, and no band.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(3) an exhausted ladder renders the empty state and no band", () => {
  it("says the search was widened, and offers the three hatches", () => {
    render(<SearchResults {...baseProps()} relaxation={null} relaxExhausted />);

    expect(screen.getByText("No spaces match those filters")).toBeTruthy();
    expect(
      screen.getByText(
        "We widened the search and still came up empty. Try a different day, or a different part of the city.",
      ),
    ).toBeTruthy();
    expect(screen.queryAllByTestId(BAND)).toHaveLength(0);
    for (const hatch of HATCHES) {
      expect(screen.getByRole("button", { name: hatch })).toBeTruthy();
    }
  });

  it("keeps the shipped body when nothing was widened — a claim about work nobody did", () => {
    // `relax=0` after an Undo: zero results, no ladder. The stronger sentence would be false.
    render(<SearchResults {...baseProps()} relaxation={null} relaxExhausted={false} />);
    expect(screen.getByText("Try widening your search.")).toBeTruthy();
    expect(screen.queryAllByTestId(BAND)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (4) THE DELETED FALLBACK — the six-filters-vanish row is gone rather than hidden.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(4) the all-at-once broadened fallback", () => {
  it('renders no "You might also like" divider in any zero-result state', () => {
    for (const props of [
      { relaxation: null, relaxExhausted: true },
      { relaxation: RELAXATION, relaxExhausted: false },
      { relaxation: null, relaxExhausted: false },
    ]) {
      cleanup();
      render(<SearchResults {...baseProps()} {...props} />);
      expect(
        screen.queryByText("You might also like"),
        "the unlabelled broadened row is back. It dropped SIX constraints in one query and named " +
          "none of them, which is the gap STATE-03 exists to close.",
      ).toBeNull();
    }
  });

  it('"Show nearby spaces" keeps the activity — the one line that made it D-52-legal', () => {
    render(<SearchResults {...baseProps()} relaxation={null} relaxExhausted />);
    screen.getByRole("button", { name: "Show nearby spaces" }).click();

    expect(push).toHaveBeenCalledTimes(1);
    const url = new URL(push.mock.calls[0][0] as string, "http://localhost");
    expect(url.searchParams.get("radius")).toBe("25");
    expect(
      url.searchParams.get("category"),
      "the hatch dropped the activity. Someone searching for a badminton court will not take a yoga " +
        "studio — that is D-52, and this control used to break it by hand.",
    ).toBe("pickleball_court");
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────
// (5) THE REGRESSION PIN — green in every case above, and green on unchanged `src/`.
// ─────────────────────────────────────────────────────────────────────────────────────────────────────

describe("(5) REGRESSION: the populated grid this plan does not touch", () => {
  it("renders the heading, the sort control and one card per row, with no band", () => {
    const rows = [makeRow("a", "Poblacion Pickleball Court"), makeRow("b", "Ortigas Court")];
    render(<SearchResults {...baseProps()} results={rows} heading="2 spaces near you" />);

    expect(screen.getByRole("heading", { name: "2 spaces near you" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Sort results" })).toBeTruthy();
    expect(screen.getAllByTestId(CARD)).toHaveLength(2);
    expect(
      screen.queryAllByTestId(BAND),
      "a populated search rendered the relaxation band. The band is for a search that returned " +
        "NOTHING; on a page with results it would be describing a relaxation that never happened.",
    ).toHaveLength(0);
    for (const hatch of HATCHES) {
      expect(screen.queryByRole("button", { name: hatch })).toBeNull();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • ANYTHING RENDERED. jsdom applies no Tailwind (D-131), so the band's surface, the relaxed
//     control's tint and the stacking below `sm:` are invisible here. `tests/design/contrast.test.ts`
//     owns the pairings and `e2e/zero-result-relax.spec.ts` owns the browser.
//   • WHICH RUNG RAN. This file is handed a rung; `tests/search/relaxation-ladder.test.ts` is what
//     proves the ladder picks the right one.
//   • HOW MANY TIMES A SCREEN READER SPEAKS. Announcement is AT behaviour, not a DOM property. What is
//     checkable is that the DOM does not change, which is what `relax-band.tsx`'s latch buys.
