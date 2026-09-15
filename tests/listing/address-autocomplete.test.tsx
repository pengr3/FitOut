// @vitest-environment jsdom

// WR-04 — THE ADDRESS LOOKUP'S LIVE REGION, RENDERED. The first test in this repository to mount this
// component at all.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY IT DID NOT EXIST, AND WHY THAT IS THE FINDING RATHER THAN A FOOTNOTE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 14-14 discharged this file's live-region exclusion — the last one in the inventory — and filed
// the discharge under the rationale *"EMPTY until a lookup resolves, which on the address step is most
// of the time a host spends there."* Three separate places restated it: the file header, a comment at
// the element, and the committed `AUTHOR_NAMED_REGIONS` row.
//
// It was false on the edit path, and NOTHING COULD HAVE NOTICED:
//
//   • `AddressAutocomplete` is `vi.mock`'d to `() => null` in all FOUR wizard render tests
//     (publish-checklist, wizard-occupancy, wizard-rail, wizard-save-state), so no rendered assertion
//     in the repo reached it.
//   • `tests/design/live-regions.test.tsx` reads SOURCE through an AST walk. It can see that a region
//     exists, that it carries a name, and that the name matches the inventory. It cannot see what the
//     region CONTAINS at mount, because that is a runtime value — and "empty until a lookup resolves"
//     is a claim about exactly that.
//
// So the region's whole justification rested on a property no instrument in the project could read.
// That is what this file is for. It is deliberately a RENDER test and not another source scan.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE DEFECT, STATED AS THE SEQUENCE THAT PRODUCES IT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A host edits a listing that already has an address. `wizard.tsx` passes `hasCoordinates` (from the
// stored lat/lng) AND an `initialLabel` composed from the stored address. The component's `located` is
// `hasCoordinates || selectedLabel.length > 0`, so it is TRUE at first paint — and while the region's
// located branch read `located`, the region mounted with its sentence already in it.
//
// A live region gaining a subtree with text in it is the announce-on-arrival shape. Nothing is wrong on
// screen; the sentence is true and useful. What is wrong is WHERE it is: it is a fact about the
// listing, not the outcome of anything the host just did, and it is delivered as though it were.
//
// ⚠ EVERY CASE ASSERTS THE REGION EXISTS FIRST. "The region is empty" is satisfied by a component that
// renders no region at all — which would be a strictly worse outcome and would pass a naive reading of
// every claim below. The region is located by ROLE and its presence asserted before its text is read.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

// Radix's popover and cmdk both measure themselves with observers jsdom does not implement. Stubbed
// here rather than in the shared setup — nothing asserted below is a measurement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

import { AddressAutocomplete } from "@/components/listing/address-autocomplete";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * The sentence, retyped ONCE here on purpose.
 *
 * The component does not export it, and this file deliberately does not ask it to: the claim under
 * test is that a particular string is NOT in a particular element at mount, and importing the string
 * from the module that decides where to put it would make half the assertion self-referential. If the
 * copy is reworded and this constant is not, case (2) fails loudly — which is the correct outcome for
 * a file asserting the placement of specific words.
 */
const LOCATED = /Location set\./i;

/** The static hint, matched the same way and for the same reason. */
const PICK_HINT = /Pick a suggestion so we can place you on the map\./i;

/**
 * THE region — asserted to be exactly one, never sampled.
 *
 * Two regions announcing one lookup is the defect 14-14's rule 6 names, so every read of the text also
 * re-asserts the count.
 */
function region(): HTMLElement {
  const found = screen.getAllByRole("status");
  expect(found, "the component must render exactly ONE status region").toHaveLength(1);
  return found[0];
}

const regionText = () => (region().textContent ?? "").replace(/\s+/g, " ").trim();

/** The whole rendered tree's text, for asking WHERE a sentence is rather than whether it exists. */
const documentText = (container: HTMLElement) =>
  (container.textContent ?? "").replace(/\s+/g, " ").trim();

function mount(props: Partial<React.ComponentProps<typeof AddressAutocomplete>> = {}) {
  return render(<AddressAutocomplete onResolved={props.onResolved ?? (() => {})} {...props} />);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("(1) a fresh draft — nothing located, nothing announced", () => {
  it("mounts the region EMPTY and reads the static hint in document order", () => {
    const { container } = mount();

    expect(region()).toBeTruthy();
    expect(regionText()).toBe("");
    // The hint is present, and it is NOT in the region — that separation is 14-14's discharge and this
    // case is what keeps it from silently reverting.
    expect(documentText(container)).toMatch(PICK_HINT);
    expect(regionText()).not.toMatch(PICK_HINT);
  });
});

describe("(2) an EDIT of an already-located listing — the path the discharge's reason was false on", () => {
  // Both seeds the wizard actually passes, and each on its own, because `located` is an OR: a fixture
  // supplying both cannot tell which one the region was reading.
  const seeds: ReadonlyArray<readonly [string, Partial<React.ComponentProps<typeof AddressAutocomplete>>]> = [
    ["both seeds, as wizard.tsx passes them", { hasCoordinates: true, initialLabel: "1 Ayala Ave, Makati, NCR" }],
    ["coordinates only", { hasCoordinates: true }],
    ["stored label only", { initialLabel: "1 Ayala Ave, Makati, NCR" }],
  ];

  for (const [name, props] of seeds) {
    it(`mounts the region EMPTY — ${name}`, () => {
      mount(props);

      expect(region()).toBeTruthy();
      expect(
        regionText(),
        "the region opened with text already in it. Nothing resolved — the host opened the step on a " +
          "listing that was already located — so this is an announcement of a fact, which is the " +
          "announce-on-arrival shape this file was rewritten to remove, arriving through the props.",
      ).toBe("");
    });
  }

  it("still SAYS the listing is located — outside the region, where a fact belongs", () => {
    const { container } = mount({ hasCoordinates: true, initialLabel: "1 Ayala Ave, Makati, NCR" });

    // The words did not disappear; they moved. A region emptied by deleting the sentence would pass
    // every assertion above and would be a worse surface than the one being fixed.
    expect(documentText(container)).toMatch(LOCATED);
    expect(regionText()).not.toMatch(LOCATED);
  });

  it("does not also show the pick-a-suggestion hint — one line, not two contradictory ones", () => {
    const { container } = mount({ hasCoordinates: true, initialLabel: "1 Ayala Ave, Makati, NCR" });

    // 14-14 decision 7's rule, re-asserted from the other side now that a second paragraph shares the
    // slot: "Pick a suggestion so we can place you on the map." beside "Location set." is the surface
    // telling a host two opposite things.
    expect(documentText(container)).not.toMatch(PICK_HINT);
  });
});

describe("(3) a lookup that FAILS writes the region — so the region is not merely inert", () => {
  it("carries the failure sentence, on a listing that was already located", async () => {
    // THE CONTROL FOR EVERY EMPTY-REGION CLAIM ABOVE. An element that never fills would satisfy all of
    // them; this drives a real resolution through the real code path and reads it back.
    vi.useFakeTimers();
    const fetchSpy = vi.fn(async () => {
      throw new Error("network");
    });
    vi.stubGlobal("fetch", fetchSpy);

    mount({ hasCoordinates: true, initialLabel: "1 Ayala Ave, Makati, NCR" });
    expect(regionText()).toBe("");

    // Open the combobox and type past the three-character floor the debounce gates on.
    await act(async () => {
      fireEvent.click(screen.getByRole("combobox", { name: "Search for your address" }));
    });
    const input = screen.getByPlaceholderText("Start typing a street, city…");
    await act(async () => {
      fireEvent.change(input, { target: { value: "Ayala" } });
    });

    // Past the debounce, then let the rejected fetch settle.
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchSpy, "the debounced lookup never fired, so nothing resolved").toHaveBeenCalled();
    expect(
      regionText(),
      "a lookup failed and the region said nothing. The region's whole job is the resolved outcome; " +
        "empty at mount is only correct if something fills it when a lookup lands.",
    ).toMatch(/couldn't reach address search/i);
  });
});

describe("(4) the region is the ONLY announcing element in this component", () => {
  it("renders exactly one, in every state this file can reach", () => {
    // Rule 6, as a count. Two regions for one lookup is the defect the discharge names by that number,
    // and the realistic regression is a second one added for the failure branch "for clarity".
    for (const props of [
      {},
      { hasCoordinates: true },
      { initialLabel: "1 Ayala Ave, Makati, NCR" },
      { hasCoordinates: true, initialLabel: "1 Ayala Ave, Makati, NCR" },
    ]) {
      const { unmount } = mount(props);
      expect(screen.getAllByRole("status")).toHaveLength(1);
      expect(screen.queryAllByRole("alert")).toHaveLength(0);
      unmount();
    }
  });

  it("names it, because the status role takes no name from its own text", () => {
    mount();
    // The value is checked against the inventory by `tests/design/live-regions.test.tsx`; what only a
    // render can say is that the attribute survives to the DOM at all.
    expect(region().getAttribute("aria-label")).toBe("Address lookup");
  });
});

describe("(5) query changes invalidate an in-flight Photon lookup", () => {
  it("keeps a delayed A response inert after B is typed, then permits B to resolve", async () => {
    vi.useFakeTimers();
    const onResolved = vi.fn();
    const pending: Array<{ resolve: (value: Response) => void }> = [];
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => pending.push({ resolve }))));

    mount({ audience: "search", onResolved });
    fireEvent.click(screen.getByRole("combobox", { name: "Search for your address" }));
    const input = screen.getByPlaceholderText("Type a street or city…");

    fireEvent.change(input, { target: { value: "Ayala" } });
    await act(async () => { vi.advanceTimersByTime(250); });
    expect(pending).toHaveLength(1);

    fireEvent.change(input, { target: { value: "BGC" } });
    await act(async () => {
      pending[0]?.resolve(new Response(JSON.stringify({
        features: [{ geometry: { coordinates: [121.0244, 14.5547] }, properties: { name: "Ayala Avenue", city: "Makati", state: "Metro Manila", country: "Philippines" } }],
      }), { status: 200 }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText("Ayala Avenue, Makati, Metro Manila, Philippines")).toBeNull();
    expect(onResolved).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(250); });
    expect(pending).toHaveLength(2);
    await act(async () => {
      pending[1]?.resolve(new Response(JSON.stringify({
        features: [{ geometry: { coordinates: [121.0344, 14.5547] }, properties: { name: "BGC", city: "Taguig", state: "Metro Manila", country: "Philippines" } }],
      }), { status: 200 }));
      await Promise.resolve();
      await Promise.resolve();
    });

    fireEvent.click(screen.getByText("BGC, Taguig, Metro Manila, Philippines"));
    expect(onResolved).toHaveBeenCalledWith(expect.objectContaining({ city: "Taguig", lat: 14.5547, lng: 121.0344 }));
  });
});
