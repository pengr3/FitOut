// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => undefined;
}

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

import PublicLoading from "@/app/(public)/loading";
import { SearchExperience } from "@/components/search/search-experience";
import { SearchResults } from "@/components/search/search-results";
import { allInRateParts } from "@/lib/booking/all-in-rate";
import type { SearchResultRow } from "@/lib/search/query";

afterEach(() => {
  cleanup();
  push.mockClear();
  refresh.mockClear();
});

const CARD = "result-card";
const RETIRED_CONTROLS = [
  "Broaden radius",
  "Clear filters",
  "Show nearby spaces",
  "Undo",
  "Date",
  "Time",
  "Price",
  "Radius",
] as const;

function makeRow(id: string, title: string): SearchResultRow {
  const rates = { hourlyRateCents: 45_000, dayRateCents: 280_000 };
  return {
    id,
    title,
    primarySpaceType: "pickleball_court",
    ...rates,
    timezone: "Asia/Manila",
    city: "Makati",
    coverPhotoUrl: null,
    distanceM: 1_200,
    allInRateParts: allInRateParts({ ...rates, perHeadPriceCents: null, occupancyMode: "exclusive" }),
    occupancyMode: "exclusive",
    perHeadPriceCents: null,
    spots: null,
    fitoutChecked: false,
  };
}

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
    queryString: "category=pickleball_court&lat=14.5547&lng=121.0244&locationLabel=Makati&partySize=2",
  };
}

function renderCompletedSearch(overrides: Partial<ReturnType<typeof baseProps>> = {}) {
  const props = { ...baseProps(), ...overrides };
  return render(
    <SearchExperience
      hasCompletedSearch
      initialAnswers={{
        category: "pickleball_court",
        lat: 14.5547,
        lng: 121.0244,
        locationLabel: "Makati",
        partySize: 2,
      }}
    >
      <SearchResults {...props} />
    </SearchExperience>,
  );
}

function expectSharedAnswers() {
  const answers = screen.getByLabelText("Search answers");
  expect(within(answers).getAllByRole("button")).toHaveLength(3);
  expect(within(answers).getByRole("button", { name: /Activity:/ })).toBeTruthy();
  expect(within(answers).getByRole("button", { name: /Location:/ })).toBeTruthy();
  expect(within(answers).getByRole("button", { name: /2 people/ })).toBeTruthy();
}

function expectNoRetiredControls() {
  for (const control of RETIRED_CONTROLS) {
    expect(screen.queryByRole("button", { name: control })).toBeNull();
  }
  expect(screen.queryByTestId("search-relax-band")).toBeNull();
}

describe("completed progressive search states", () => {
  it("keeps one shared answer-chip row with populated results and one card per server row", () => {
    renderCompletedSearch({
      results: [makeRow("first", "Poblacion Pickleball Court"), makeRow("second", "Ortigas Court")],
      heading: "2 spaces near you",
      hasMore: true,
    });

    expectSharedAnswers();
    expect(screen.getByRole("heading", { name: "2 spaces near you" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Sort results" })).toBeTruthy();
    expect(screen.getAllByTestId(CARD)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Load more" })).toBeTruthy();
    expectNoRetiredControls();
  });

  it("keeps those same answers with calm no-results copy and no alternate grid", () => {
    renderCompletedSearch();

    expectSharedAnswers();
    expect(screen.getByRole("heading", { name: "No spaces match those answers" })).toBeTruthy();
    expect(screen.getByText("Edit an answer above to try a different search.")).toBeTruthy();
    expect(screen.queryAllByTestId(CARD)).toHaveLength(0);
    expectNoRetiredControls();
  });

  it("keeps answers during a generic failure and refreshes exactly once on retry", () => {
    renderCompletedSearch({ fetchError: true });

    expectSharedAnswers();
    expect(screen.getByRole("alert").textContent).toContain("Something went wrong loading spaces");
    expect(screen.queryByText(/database|connection/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refresh).toHaveBeenCalledTimes(1);
    expectNoRetiredControls();
  });

  it("retains canonical answers when sort resets paging and Load more increments it", () => {
    renderCompletedSearch({
      results: [makeRow("first", "Poblacion Pickleball Court")],
      hasMore: true,
      page: 2,
      queryString: "category=pickleball_court&lat=14.5547&lng=121.0244&locationLabel=Makati&partySize=2&page=2",
    });

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    let url = new URL(push.mock.calls[0][0] as string, "http://localhost");
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("partySize")).toBe("2");
    expect(url.searchParams.get("radius")).toBeNull();

    push.mockClear();
    fireEvent.click(screen.getByRole("combobox", { name: "Sort results" }));
    fireEvent.click(screen.getByText("Price: low to high"));
    url = new URL(push.mock.calls[0][0] as string, "http://localhost");
    expect(url.searchParams.get("sort")).toBe("price");
    expect(url.searchParams.get("page")).toBeNull();
    expect(url.searchParams.get("category")).toBe("pickleball_court");
  });

  it("keeps cold browse distinct from completed no results", () => {
    render(<SearchResults {...baseProps()} hasQuery={false} heading="Browse spaces in Manila" />);
    expect(screen.getByText("No spaces are bookable here yet")).toBeTruthy();
    expect(screen.queryByText("No spaces match those answers")).toBeNull();
    expectNoRetiredControls();
  });
});

describe("route streaming fallback", () => {
  it("reserves the idle-pill geometry without a second interactive search", () => {
    const { container } = render(<PublicLoading />);
    expect(screen.getByRole("heading", { name: "Find a space to play" })).toBeTruthy();
    expect(screen.getByText("Search fitness and recreational spaces you can book by the hour or the day.")).toBeTruthy();
    const shell = screen.getByTestId("search-idle-pill-shell");
    expect(shell.getAttribute("aria-hidden")).toBe("true");
    expect(shell.className).toContain("w-full");
    expect(shell.className).toContain("min-h-11");
    expect(shell.className).toContain("rounded");
    expect(shell.className).toContain("border");
    expect(shell.className).toContain("px-");
    expect(shell.querySelectorAll("button, input, a, select, textarea, [tabindex], [role=status], [role=alert], [aria-live]")).toHaveLength(0);
    expect(screen.getAllByRole("status", { name: "Loading spaces" })).toHaveLength(1);
    expect(container.querySelectorAll('[aria-label="Search progress"]')).toHaveLength(0);
  });
});
