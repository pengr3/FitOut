// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SearchExperience } from "@/components/search/search-experience";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/listing/address-autocomplete", () => ({
  AddressAutocomplete: ({ onResolved }: { onResolved: (address: {
    addressLine1: string; city: string; region: string; country: string; lat: number; lng: number;
  }) => void }) => (
    <button type="button" onClick={() => onResolved({
      addressLine1: "2 Real Street", city: "Makati", region: "Metro Manila",
      country: "Philippines", lat: 14.5547, lng: 121.0244,
    })}>Resolve Makati address</button>
  ),
}));

class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

afterEach(() => { cleanup(); push.mockClear(); });

function renderSearch(initialAnswers: { category?: string; locationLabel?: string; lat?: number; lng?: number; partySize?: number } = {}) {
  return render(<SearchExperience initialAnswers={initialAnswers} hasCompletedSearch={Object.keys(initialAnswers).length > 0}>
    <p>Server rendered results</p>
  </SearchExperience>);
}

it("shows three independent search controls", () => {
  renderSearch();
  expect(screen.getByRole("button", { name: "Search activity" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Search location" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Search party size" })).toBeTruthy();
});

it("submits an activity without requiring location or people", async () => {
  renderSearch();
  fireEvent.click(screen.getByRole("button", { name: "Search activity" }));
  fireEvent.click(screen.getByText("Martial arts / boxing gym"));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/?category=martial_arts_boxing"));
});

it("submits a location without requiring activity or people", async () => {
  renderSearch();
  fireEvent.click(screen.getByRole("button", { name: "Search location" }));
  fireEvent.click(screen.getByRole("button", { name: "Resolve Makati address" }));
  await waitFor(() => {
    const url = push.mock.lastCall?.[0] as string;
    expect(url).toContain("lat=14.5547");
    expect(url).toContain("lng=121.0244");
    expect(url).not.toContain("category=");
    expect(url).not.toContain("partySize=");
  });
});

it("submits a party size without requiring activity or location", async () => {
  renderSearch();
  fireEvent.click(screen.getByRole("button", { name: "Search party size" }));
  fireEvent.click(screen.getByRole("button", { name: "For me" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/?partySize=1"));
});

it("keeps previous answers when one field is changed", async () => {
  renderSearch({ category: "martial_arts_boxing" });
  fireEvent.click(screen.getByRole("button", { name: "Search party size" }));
  fireEvent.click(screen.getByRole("button", { name: "For me" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/?category=martial_arts_boxing&partySize=1"));
});

it("cancel closes the picker without clearing an existing search", async () => {
  renderSearch({ category: "martial_arts_boxing" });
  fireEvent.click(screen.getByRole("button", { name: "Search location" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Where do you want to play?" })).toBeNull());
  expect(push).not.toHaveBeenCalled();
  expect(screen.getByText("Martial arts / boxing gym")).toBeTruthy();
});
