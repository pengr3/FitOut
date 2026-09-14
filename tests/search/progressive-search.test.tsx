// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { parseGroupPartySize } from "@/components/search/party-step";
import { progressiveSearchReducer, SearchExperience, type ProgressiveSearchState } from "@/components/search/search-experience";
import { MAX_OPEN_CAPACITY } from "@/lib/validation/listing";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

vi.mock("@/components/listing/address-autocomplete", () => ({
  AddressAutocomplete: ({ onResolved }: { onResolved: (address: { addressLine1: string; city: string; region: string; postalCode: string; country: string; neighborhood: string; lat: number; lng: number }) => void }) => (
    <button type="button" onClick={() => onResolved({ addressLine1: "2 Real Street", city: "Makati", region: "Metro Manila", postalCode: "1210", country: "Philippines", neighborhood: "Poblacion", lat: 14.5547, lng: 121.0244 })}>
      Resolve Makati address
    </button>
  ),
}));

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

afterEach(() => {
  cleanup();
  push.mockClear();
  vi.restoreAllMocks();
});

function renderSearch() {
  return render(
    <SearchExperience initialAnswers={{}} hasCompletedSearch={false}>
      <p>Server rendered results</p>
    </SearchExperience>,
  );
}

function selectActivity() {
  fireEvent.click(screen.getByRole("button", { name: "Start your search" }));
  fireEvent.click(screen.getByText("Martial arts / boxing gym"));
}

it("filters the closed catalogue without committing typed text", () => {
  renderSearch();
  fireEvent.click(screen.getByRole("button", { name: "Start your search" }));
  fireEvent.change(screen.getByPlaceholderText("Search activities and space types"), { target: { value: "not a listing" } });
  expect(screen.getByText("No matching activity or type")).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
});

it("requests browser location only after explicit activation and submits the canonical solo URL", async () => {
  const getCurrentPosition = vi.fn((success: PositionCallback) => success({ coords: { latitude: 14.5547, longitude: 121.0244 } } as GeolocationPosition));
  Object.defineProperty(window.navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });

  renderSearch();
  expect(getCurrentPosition).not.toHaveBeenCalled();
  selectActivity();
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  const partyHeading = screen.getByRole("heading", { name: "Who is this for?" });
  await waitFor(() => expect(document.activeElement).toBe(partyHeading));
  fireEvent.click(screen.getByRole("button", { name: "For me" }));
  expect(push).toHaveBeenCalledWith("/?category=martial_arts_boxing&lat=14.5547&lng=121.0244&locationLabel=Current+location&partySize=1");
});

it("keeps address entry usable when browser location is unavailable", () => {
  Object.defineProperty(window.navigator, "geolocation", { configurable: true, value: undefined });
  renderSearch();
  selectActivity();
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  expect(screen.getByRole("button", { name: "Resolve Makati address" }).hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("status", { name: "Search progress" }).textContent).toContain("Type an address instead");
});

it("keeps address entry usable after browser location denial", () => {
  const getCurrentPosition = vi.fn((_success: PositionCallback, failure?: PositionErrorCallback) => failure?.({ code: 1 } as PositionError));
  Object.defineProperty(window.navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
  renderSearch();
  selectActivity();
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  expect(screen.getByRole("heading", { name: "Where do you want to play?" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Resolve Makati address" }).hasAttribute("disabled")).toBe(false);
  expect(screen.getByRole("status", { name: "Search progress" }).textContent).toContain("Type an address instead");
});

it("retains submitted answers in direct-edit chips and keeps one initially empty progress region", () => {
  render(
    <SearchExperience
      initialAnswers={{ category: "martial_arts_boxing", locationLabel: "Makati", lat: 14.5547, lng: 121.0244, partySize: 1 }}
      hasCompletedSearch
    >
      <p>Server rendered results</p>
    </SearchExperience>,
  );
  const progress = screen.getByRole("status", { name: "Search progress" });
  expect(screen.getAllByRole("status", { name: "Search progress" })).toHaveLength(1);
  expect(progress.textContent).toBe("");
  expect(screen.getByRole("button", { name: /Activity: Martial arts/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Location: Makati/i })).toBeTruthy();
  expect(screen.getByRole("button", { name: "1 person" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "1 person" }));
  expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Who is this for?" }));
});

it("keeps confirmed answers while correcting the journey and submits only an exact bounded group size", () => {
  renderSearch();
  selectActivity();
  fireEvent.click(screen.getByRole("button", { name: "Resolve Makati address" }));

  expect(screen.getByRole("button", { name: "For a group" })).toBeTruthy();
});

it("uses explicit history for Back, direct Edit, and destructive Cancel", () => {
  const initial: ProgressiveSearchState = {
    screen: "idle",
    answers: {},
    history: [],
    groupDraft: "",
    groupMode: false,
    resultsVisible: false,
    progress: "",
  };
  const engaged = progressiveSearchReducer(initial, { type: "ENGAGE" });
  const selected = progressiveSearchReducer(engaged, { type: "SELECT_ACTIVITY", option: { value: "martial_arts_boxing", label: "Martial arts / boxing gym", group: "Activities" } });
  const located = progressiveSearchReducer(selected, { type: "RESOLVE_LOCATION", address: { lat: 14.5547, lng: 121.0244, locationLabel: "Makati" } });

  expect(located.screen).toBe("party");
  expect(progressiveSearchReducer(located, { type: "BACK" })).toMatchObject({ screen: "location", answers: located.answers });
  expect(progressiveSearchReducer(located, { type: "EDIT", step: "activity" })).toMatchObject({ screen: "activity", answers: located.answers, history: ["idle"] });
  expect(progressiveSearchReducer(located, { type: "CANCEL" })).toMatchObject({ screen: "idle", answers: {}, history: [], groupDraft: "", resultsVisible: false });

  renderSearch();
  fireEvent.click(screen.getByRole("button", { name: "Start your search" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(push).toHaveBeenCalledWith("/");
  expect(screen.getByRole("button", { name: "Start your search" })).toBeTruthy();
});

it("parses and submits only exact bounded group sizes", () => {
  for (const invalid of ["", "1", "1.5", "-2", "2e1", "two", String(MAX_OPEN_CAPACITY + 1)]) {
    expect(parseGroupPartySize(invalid)).toBeNull();
  }
  expect(parseGroupPartySize("2")).toBe(2);
  expect(parseGroupPartySize(String(MAX_OPEN_CAPACITY))).toBe(MAX_OPEN_CAPACITY);

  renderSearch();
  selectActivity();
  fireEvent.click(screen.getByRole("button", { name: "Resolve Makati address" }));
  fireEvent.click(screen.getByRole("button", { name: "For a group" }));
  const groupInput = screen.getByLabelText("Number of people");
  const submit = screen.getByRole("button", { name: "See spaces" });
  fireEvent.change(groupInput, { target: { value: "1.5" } });
  expect(submit.hasAttribute("disabled")).toBe(true);
  fireEvent.change(groupInput, { target: { value: "2" } });
  expect(submit.hasAttribute("disabled")).toBe(false);
  fireEvent.click(submit);
  expect(push).toHaveBeenCalledWith("/?category=martial_arts_boxing&lat=14.5547&lng=121.0244&locationLabel=2+Real+Street%2C+Makati%2C+Metro+Manila%2C+Philippines&partySize=2");
});

it("ignores a late geolocation success after leaving the location step", async () => {
  let succeed: PositionCallback | undefined;
  const getCurrentPosition = vi.fn((success: PositionCallback) => { succeed = success; });
  Object.defineProperty(window.navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });

  renderSearch();
  selectActivity();
  fireEvent.click(screen.getByRole("button", { name: "Use my location" }));
  expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  expect(succeed).toBeDefined();
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  succeed?.({ coords: { latitude: 14.5547, longitude: 121.0244 } } as GeolocationPosition);

  await waitFor(() => expect(screen.getByRole("heading", { name: "What are you looking for?" })).toBeTruthy());
  expect(screen.queryByRole("heading", { name: "Who is this for?" })).toBeNull();
  expect(push).not.toHaveBeenCalled();
});
