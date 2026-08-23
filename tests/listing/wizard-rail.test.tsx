// @vitest-environment jsdom

// HFLOW-02 / 14-CONTEXT D-148 + D-151 — the wizard's step rail, asserted against RENDERED output.
//
// WHAT SILENT FAILURE THIS FILE CATCHES.
//
// The rail stopped being decoration: its visited markers are real controls now. Three separate things
// can rot without a single type error, and all three are invisible until a host is already lost:
//
//   1. THE MARKER THAT NAMES A DIFFERENT STEP THAN THE ONE IT GOES TO. The walked list is
//      MODE-DEPENDENT — the booking-mode step is removed from the flow in drop-in mode (OC-10) — so
//      position 6 asks about accepting bookings in one mode and about cancellations in the other.
//      Anything in the rail that resolves a step by NUMERIC POSITION against the wrong list therefore
//      renders a marker whose name points at a question the host will not be taken to. That is the
//      wizard's oldest recorded defect class: the publish checklist used to carry bare numeric literals
//      as link targets, and inserting a step silently repointed every row after it. `wizard.tsx`'s own
//      comments state the rule — nothing in that file is addressed by index — and this file is the
//      executable half of it. Case (6) walks the mode switch that exposes it; cases (3) and (6) read
//      every marker's accessible name against the EXPORTED step list rather than against retyped copies
//      of those sentences, so a title edit cannot make the test agree with a broken rail.
//
//   2. THE ACCENT SPREADING. The rail paints exactly one marker with the accent fill — the CURRENT step
//      — and that marker is deliberately NOT a control, because navigating to where you already are is
//      not an action and a second reachable accent fill in one viewport spends the app's scarcest
//      signal on nothing. `tests/design/brand-recipe.test.ts` pins the SOURCE count; this file pins what
//      is actually RENDERED, which is the claim a host experiences. Cases (1) and (2).
//
//   3. THE KEYBOARD TRAP IN REVERSE — a marker that looks pressable but cannot be reached, or a future
//      marker that can be. On a nine-step form that is the difference between a rail and a decoration
//      with a cursor. Cases (3) and (4).
//
// And case (7) is GATE-NOREG for D-151: the truthful step count across the occupancy fork ALREADY
// works, so it is protected here rather than built. It is read TWICE, independently — the marker count
// out of the rail's own subtree, and the counter sentence out of the page — because a single reading
// cannot tell "the rail renders eight markers" apart from "something printed the number eight".
// `tests/listing/wizard-occupancy.test.tsx` cases (3) and (4) are the third reading and stay unedited.
//
// ⚠ WHAT jsdom CANNOT DO, STATED RATHER THAN IMPLIED. There is no layout engine here: every
// `getBoundingClientRect()` is zero and no stylesheet is applied. So case (3)'s target-size claim is
// made where it can honestly be made — the marker's box comes from the DECLARED constant, and the
// declared constant's own value clears the WCAG 2.5.8 AA floor. The MEASURED proof (24x24 CSS px at the
// 320px viewport floor, nine markers on one line, adjacent centres 32px apart) lives in
// `e2e/overflow-320.spec.ts` and in 14-RESEARCH § M3. This file must not be read as having measured a
// pixel.
//
// The wizard is a client component whose server couplings are the listing actions, the auth client and
// two heavy child components. Those are stubbed exactly as the occupancy file stubs them; every piece of
// markup asserted below is the wizard's own.

import * as React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, within, cleanup, fireEvent, act } from "@testing-library/react";

// jsdom implements no ResizeObserver, and Radix's radio indicator measures itself with one. Stubbing it
// here (rather than in the shared setup) keeps the blast radius to this file — the measurement plays no
// part in anything asserted below.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

// A STABLE router stub, unlike the occupancy file's fresh-per-call one, because case (5) asserts an
// ABSENCE: pressing a marker must move the rendered step and must NOT navigate. A `vi.fn()` minted
// inside the hook can never be found again to be asked whether it was called.
const nav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

vi.mock("@/app/actions/listing", () => ({
  saveListingStep: vi.fn(async () => ({ ok: true as const })),
  publishListing: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/lib/auth-client", () => ({ authClient: { sendVerificationEmail: vi.fn() } }));
vi.mock("@/components/listing/photo-uploader", () => ({ PhotoUploader: () => null }));
vi.mock("@/components/listing/address-autocomplete", () => ({ AddressAutocomplete: () => null }));

// next/link has no App-Router context in jsdom — swap ONLY the primitive, keep the markup around it real
// (the same remedy tests/listing/listing-card.test.tsx and the occupancy file both use).
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import {
  ListingWizard,
  STEPS,
  type ModeLockDisplay,
  type WizardListing,
} from "@/app/(host)/host/listings/[id]/edit/wizard";
import { STEP_MARKER_BOX } from "@/lib/design/measurements";

afterEach(cleanup);
beforeEach(() => {
  nav.push.mockClear();
  nav.refresh.mockClear();
});

// ── The two walked lists, stated as an EXPECTATION rather than imported ───────────────────────────────
// D-151's fork re-expressed here on purpose. Importing the wizard's own filtered list would make this
// file agree with the wizard by construction — the walked list is exactly what is under test. The step
// TITLES still come from the exported list, so a copy edit moves one place; only the FORK is restated.
// Widened to `string` deliberately: as literal unions the two lists cannot be compared to each other,
// and the last assertion in case (7) — that the drop-in flow is the whole-space flow MINUS exactly the
// booking-mode step — is a comparison between them.
const WHOLE_SPACE: readonly string[] = STEPS.map((s) => s.title);
const DROP_IN: readonly string[] = STEPS.filter((s) => s.key !== "booking").map((s) => s.title);

/** D-151, as data: nine steps whole-space, eight drop-in, and the removed one is the booking step. */
const EXPECTED_STEP_COUNTS = { whole: 9, dropIn: 8 } as const;

/**
 * The accent background utility, in TWO PIECES so this file cannot trip the scan that counts it.
 *
 * `tests/design/brand-recipe.test.ts` counts occurrences of that utility per source file, and although
 * its scanner reads `src/` rather than `tests/`, the repo's standing rule (14-UI-SPEC § Color, and three
 * plans that learned it the hard way) is that a gate's own vocabulary is never written whole anywhere a
 * text scan might one day be pointed. Same reason the wizard names it descriptively in its comments.
 */
const ACCENT_FILL = "bg-" + "brand";

/**
 * The WCAG 2.5.8 AA target-size floor, in CSS pixels.
 *
 * The same number, for the same reason, as `e2e/overflow-320.spec.ts`'s own floor — 24 rather than 44
 * because 44 is this app's `size="touch"` figure and WCAG 2.5.5, while 24 is the AA conformance bar the
 * declared marker box was retained to meet.
 */
const TARGET_FLOOR_PX = 24;

/** Tailwind's default spacing step, in CSS pixels: `--spacing` is 0.25rem against a 16px root. */
const SPACING_STEP_PX = 4;

const UNLOCKED: ModeLockDisplay = { locked: false };

const CARD = { wholeSpace: "Whole space", dropIn: "Drop-in passes" } as const;

// ── Fixtures ─────────────────────────────────────────────────────────────────────────────────────────
// `primarySpaceType` is a D-08 vocabulary value, not the colloquial word (09-06's fixture lesson).
function makeListing(overrides: Partial<WizardListing> = {}): WizardListing {
  return {
    id: "listing-1",
    title: "Sunset Strength Floor",
    description: "Platforms, racks and a lot of chalk.",
    primarySpaceType: "gym_fitness_floor",
    addressLine1: "1 Ayala Ave",
    addressLine2: null,
    city: "Makati",
    region: "NCR",
    postalCode: "1200",
    country: "PH",
    neighborhood: null,
    lat: 14.5547,
    lng: 121.0244,
    maxOccupancy: 30,
    hourlyRateCents: 50000,
    dayRateCents: 300000,
    occupancyMode: "exclusive",
    perHeadPriceCents: null,
    included: null,
    extraHeadFee: null,
    currency: "php",
    bookingMode: "instant",
    cancellationPolicy: "standard",
    showExactAddress: false,
    status: "published",
    amenities: [],
    activityTags: [],
    photoCount: 3,
    photos: [],
    ...overrides,
  };
}

/** A published drop-in listing that STILL carries its exclusive rates — the occupancy file's lesson. */
function makeOpenListing(overrides: Partial<WizardListing> = {}): WizardListing {
  return makeListing({ occupancyMode: "open_capacity", perHeadPriceCents: 35000, ...overrides });
}

function mount(listing: WizardListing, modeLock: ModeLockDisplay = UNLOCKED, emailVerified = false) {
  return render(
    <ListingWizard
      listing={listing}
      hostEmail="host@example.com"
      emailVerified={emailVerified}
      modeLock={modeLock}
    />,
  );
}

/** The rendered step question. Throws if the document ever holds more than one level-one heading. */
function heading(): string {
  return screen.getByRole("heading", { level: 1 }).textContent ?? "";
}

/** One "Save and continue" (autosave is stubbed ok, so the wizard simply advances). */
async function advance() {
  const btn = screen.getByRole("button", { name: /Get started|Save and continue/ });
  await act(async () => {
    fireEvent.click(btn);
  });
}

/** Walk forward until the given step heading is on screen. Throws (with the real heading) if unreachable. */
async function advanceTo(title: string) {
  for (let i = 0; i < 12; i += 1) {
    if (heading() === title) return;
    await advance();
  }
  throw new Error(`never reached "${title}" — stuck at "${heading()}"`);
}

// ── Rail readers ─────────────────────────────────────────────────────────────────────────────────────

/** The rail's own subtree. Every count, order and absence below is scoped inside it. */
function rail(): HTMLElement {
  return screen.getByTestId("wizard-step-rail");
}

/** One marker element per step, in rail order — whichever element each list item happens to render. */
function markers(): HTMLElement[] {
  return [...rail().querySelectorAll("li")].map((li) => {
    const el = li.firstElementChild;
    if (!el) throw new Error("a rail list item rendered no marker at all");
    return el as HTMLElement;
  });
}

function classes(el: Element): string[] {
  return (el.getAttribute("class") ?? "").split(/\s+/).filter(Boolean);
}

function accentFilled(): HTMLElement[] {
  return markers().filter((el) => classes(el).includes(ACCENT_FILL));
}

/** The accessible name a visited marker must resolve to, composed from the exported step list. */
function markerName(position: number, title: string): string {
  return `Go back to step ${position + 1}: ${title}`;
}

/**
 * Every element the keyboard can reach, in DOCUMENT order.
 *
 * DOCUMENT ORDER IS TAB ORDER ONLY WHILE NO POSITIVE `tabindex` EXISTS, so that precondition is
 * asserted rather than assumed — see the guard inside case (4). jsdom does not implement sequential
 * focus navigation, so the order has to be computed; computing it from a precondition that is itself
 * checked is the honest version of that.
 */
function tabbables(): HTMLElement[] {
  const nodes = document.querySelectorAll<HTMLElement>(
    "a[href], button, input, select, textarea, [tabindex]",
  );
  return [...nodes].filter(
    (el) => el.getAttribute("tabindex") !== "-1" && !el.hasAttribute("disabled"),
  );
}

function card(cardTitle: string): HTMLElement {
  const el = screen.getByText(cardTitle).closest("label");
  if (!el) throw new Error(`no card wrapper for "${cardTitle}"`);
  return el as HTMLElement;
}

/** Choose an occupancy mode on the occupancy step by pressing its radio. */
async function chooseMode(cardTitle: string) {
  const radio = within(card(cardTitle)).getByRole("radio");
  await act(async () => {
    fireEvent.click(radio);
  });
}

/** Press a visited marker by the step title it names. */
async function pressMarker(position: number, title: string) {
  const btn = within(rail()).getByRole("button", { name: markerName(position, title) });
  await act(async () => {
    fireEvent.click(btn);
  });
}

describe("the wizard step rail (HFLOW-02 / D-148)", () => {
  // ── (1) + (2) the accent ───────────────────────────────────────────────────────────────────────────
  it("(1) paints exactly ONE accent-filled marker at every step, in both occupancy modes", async () => {
    for (const [listing, titles] of [
      [makeListing(), WHOLE_SPACE],
      [makeOpenListing(), DROP_IN],
    ] as const) {
      const { unmount } = mount(listing, UNLOCKED, true);

      for (const [i, title] of titles.entries()) {
        await advanceTo(title);

        const filled = accentFilled();
        expect(
          filled,
          `at step ${i + 1} ("${title}") the rail painted ${filled.length} accent-filled markers. ` +
            `Exactly one is the contract: the accent is the only signal of WHICH step the form is ` +
            `showing, and a second one spends it on nothing.`,
        ).toHaveLength(1);

        // …and it is the marker for the step actually on screen, not merely some marker.
        expect(filled[0].textContent).toBe(String(i + 1));
        expect(filled[0].closest("li")?.getAttribute("aria-current")).toBe("step");
      }

      unmount();
    }
  });

  it("(2) the accent-filled marker is never a button and never carries the button role", async () => {
    mount(makeListing(), UNLOCKED, true);

    for (const [i, title] of WHOLE_SPACE.entries()) {
      await advanceTo(title);
      const [filled] = accentFilled();

      expect(
        filled.tagName,
        `at step ${i + 1} the accent-filled marker is a <${filled.tagName.toLowerCase()}>. The ` +
          `current-step marker must stay a NON-CONTROL: navigating to where you already are is not ` +
          `an action, and making it one puts a second reachable accent fill in the viewport.`,
      ).not.toBe("BUTTON");
      expect(filled.getAttribute("role")).not.toBe("button");
      // The strongest reading of "not a control": the keyboard cannot reach it either.
      expect(tabbables()).not.toContain(filled);
    }
  });

  // ── (3) names and hit area ─────────────────────────────────────────────────────────────────────────
  it("(3) every visited marker is a named control whose declared box clears the target-size floor", async () => {
    mount(makeListing(), UNLOCKED, true);
    await advanceTo(WHOLE_SPACE[5]); // the pricing step — five steps are behind it

    const buttons = within(rail()).getAllByRole("button");
    expect(buttons).toHaveLength(5);

    // NON-EMPTY, read through the accessible-name computation rather than off an attribute: a role
    // query with a `/.+/` name matches only elements whose COMPUTED name has something in it.
    expect(within(rail()).getAllByRole("button", { name: /.+/ })).toHaveLength(5);

    // …and each one names ITS OWN step, from the exported list. This is the assertion that fails when
    // a marker is resolved against the wrong list — see case (6).
    for (let i = 0; i < 5; i += 1) {
      const named = within(rail()).getByRole("button", { name: markerName(i, WHOLE_SPACE[i]) });
      expect(named).toBe(buttons[i]);
    }

    // THE BOX IS DECLARED, NOT TYPED. jsdom lays nothing out (see the file header), so the honest claim
    // is that the marker reads the constant and the constant clears the floor.
    const box = /^size-(\d+(?:\.\d+)?)$/.exec(STEP_MARKER_BOX);
    expect(
      box,
      `STEP_MARKER_BOX is "${STEP_MARKER_BOX}", which this test cannot convert to pixels. If the ` +
        `constant changed shape, re-derive the floor check here rather than deleting it — a control ` +
        `below ${TARGET_FLOOR_PX}px is a WCAG 2.5.8 AA failure, not a style preference.`,
    ).not.toBeNull();
    expect(Number(box?.[1]) * SPACING_STEP_PX).toBeGreaterThanOrEqual(TARGET_FLOOR_PX);

    for (const btn of buttons) {
      expect(classes(btn)).toContain(STEP_MARKER_BOX);
    }
  });

  // ── (4) tab order ──────────────────────────────────────────────────────────────────────────────────
  it("(4) reaches every visited marker in rail order before the step's first field, and no future marker", async () => {
    mount(makeListing(), UNLOCKED, true);
    await advanceTo(WHOLE_SPACE[5]);

    // GUARD-THE-GUARD: document order is tab order only while nothing claims a positive tabindex.
    const positive = [...document.querySelectorAll("[tabindex]")].filter(
      (el) => Number(el.getAttribute("tabindex")) > 0,
    );
    expect(
      positive,
      "an element claims a positive tabindex, so document order is no longer tab order and this " +
        "assertion has quietly stopped meaning what it says.",
    ).toEqual([]);

    const order = tabbables();
    const visited = within(rail()).getAllByRole("button");

    // Every visited marker is reachable, and they arrive in RAIL order.
    const positions = visited.map((b) => order.indexOf(b));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));

    // ZERO future markers are reachable: the rail holds nine markers and exactly five are in the order.
    expect(markers()).toHaveLength(EXPECTED_STEP_COUNTS.whole);
    expect(order.filter((el) => rail().contains(el))).toEqual(visited);

    // …and all of them come before the step's first field.
    const form = document.querySelector("form");
    expect(form, "the wizard rendered no form").not.toBeNull();
    const firstField = order.find((el) => form!.contains(el));
    expect(firstField, "the pricing step rendered nothing focusable").toBeDefined();
    expect(Math.max(...positions)).toBeLessThan(order.indexOf(firstField!));
  });

  // ── (5) pressing a marker ──────────────────────────────────────────────────────────────────────────
  it("(5) pressing a visited marker renders that step's question and performs NO navigation", async () => {
    mount(makeListing(), UNLOCKED, true);
    await advanceTo(WHOLE_SPACE[5]);

    const before = window.location.href;
    await pressMarker(2, WHOLE_SPACE[2]);

    expect(heading()).toBe(WHOLE_SPACE[2]);
    // The wizard is ONE route. A rail that routed would lose the unsaved form state it is standing on.
    expect(window.location.href).toBe(before);
    expect(nav.push).not.toHaveBeenCalled();
    expect(nav.refresh).not.toHaveBeenCalled();
  });

  // ── (6) THE MODE SWITCH ────────────────────────────────────────────────────────────────────────────
  it("(6) survives a mid-flow occupancy switch with no marker naming another step's question", async () => {
    mount(makeListing(), UNLOCKED, true);

    // Walk into the fork's shadow, then come back to the fork itself through the rail.
    await advanceTo(WHOLE_SPACE[5]);
    expect(markers()).toHaveLength(EXPECTED_STEP_COUNTS.whole);
    await pressMarker(4, WHOLE_SPACE[4]);
    expect(heading()).toBe(WHOLE_SPACE[4]);

    // …and change the answer that decides which steps exist.
    await chooseMode(CARD.dropIn);

    // The list shrank under a rail that is still standing on the same step.
    expect(markers()).toHaveLength(EXPECTED_STEP_COUNTS.dropIn);
    expect(heading()).toBe(DROP_IN[4]);

    // EVERY marker still names the step at its own position IN THE MODE NOW RENDERED. This is the
    // assertion an implementation that resolves a step by position against the unfiltered list fails:
    // position 6 would announce the booking-mode question while the step there asks about cancellations.
    const interactive = within(rail()).getAllByRole("button");
    for (const [i, title] of DROP_IN.entries()) {
      const marker = markers()[i];
      if (interactive.includes(marker)) {
        expect(
          marker.getAttribute("aria-label"),
          `marker ${i + 1} is interactive but does not name the step at position ${i + 1} of the ` +
            `drop-in flow. A marker that names one question and moves to another is the exact ` +
            `failure the by-KEY rule exists to prevent.`,
        ).toBe(markerName(i, title));
      } else {
        // A non-control marker carries its number as content and nothing that could name a step.
        expect(marker.textContent).toBe(String(i + 1));
      }
    }

    // Only the steps genuinely behind the host are pressable, and the one the fork removed is gone
    // from the rail entirely rather than lingering as a marker with a stale name.
    expect(interactive.map((b) => b.getAttribute("aria-label"))).toEqual(
      DROP_IN.slice(0, 4).map((title, i) => markerName(i, title)),
    );
    expect(
      within(rail()).queryByRole("button", { name: new RegExp(WHOLE_SPACE[6]) }),
    ).toBeNull();

    // …and walking forward from the fork lands on the drop-in flow's own next questions.
    await advance();
    expect(heading()).toBe(DROP_IN[5]);
    await advance();
    expect(heading()).toBe(DROP_IN[6]);
    expect(within(rail()).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(
      DROP_IN.slice(0, 6).map((title, i) => markerName(i, title)),
    );

    // ⚠ ONE STEP FURTHER, AND THIS IS THE STEP THAT MAKES THE CASE FALSIFIABLE. Positions 1 to 6 hold
    // the same question in both modes; the two lists first disagree at POSITION 7, which asks about
    // accepting bookings in whole-space and about cancellations in drop-in. Only from the review step
    // is that position both BELOW the current one and therefore a named control — so stopping the walk
    // any earlier would leave the disagreement unread and the case green against a rail that resolves
    // its markers against the unfiltered list.
    await advance();
    expect(heading()).toBe(DROP_IN[7]);
    expect(within(rail()).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(
      DROP_IN.slice(0, 7).map((title, i) => markerName(i, title)),
    );
    expect(
      within(rail()).getByRole("button", { name: markerName(6, DROP_IN[6]) }).getAttribute("aria-label"),
      "position 7 must name the drop-in flow's own question there. Naming the whole-space question " +
        "instead is a marker resolved by NUMERIC POSITION against a list this host is not walking.",
    ).not.toContain(WHOLE_SPACE[6]);
  });

  // ── (7) D-151 as GATE-NOREG ────────────────────────────────────────────────────────────────────────
  it("(7) renders 8 markers and counts to 8 in drop-in, 9 and 9 in whole-space (D-151)", async () => {
    // TWO INDEPENDENT READINGS OF ONE FACT, on purpose. The marker count comes out of the rail's own
    // subtree; the number the host READS comes out of the counter sentence. A single reading cannot
    // distinguish "the rail renders eight markers" from "something printed the number eight".
    for (const [listing, titles, expected] of [
      [makeOpenListing(), DROP_IN, EXPECTED_STEP_COUNTS.dropIn],
      [makeListing(), WHOLE_SPACE, EXPECTED_STEP_COUNTS.whole],
    ] as const) {
      const { unmount } = mount(listing, UNLOCKED, true);

      expect(titles).toHaveLength(expected);
      expect(markers()).toHaveLength(expected);
      expect(screen.getByText(`Step 1 of ${expected}`)).toBeTruthy();

      // Held at every step, not only the first — a counter that stops agreeing halfway is still a
      // progress bar that lies.
      for (const [i, title] of titles.entries()) {
        await advanceTo(title);
        expect(markers()).toHaveLength(expected);
        expect(screen.getByText(`Step ${i + 1} of ${expected}`)).toBeTruthy();
      }

      unmount();
    }

    // The removed step is the booking-mode one, and it is removed from the LIST rather than skipped.
    expect(WHOLE_SPACE.filter((t) => !DROP_IN.includes(t))).toEqual([WHOLE_SPACE[6]]);
  });
});
