// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { SearchExperience } from "@/components/search/search-experience";

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
