// @vitest-environment jsdom

// WR-02 — THE WIZARD'S NAVIGATION AGAINST AN IN-FLIGHT AUTOSAVE (HFLOW-02 · D-148 / D-150).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT SILENT FAILURE THIS FILE CATCHES — A HOST'S CHOICE OF STEP, SILENTLY OVERRIDDEN
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 14-09 turned the rail's visited markers from inert `<span>`s into real `<button>`s, and 14-10
// made the publish checklist's `Fix` control reachable from the FIRST step. Both are navigation. Every
// OTHER navigation affordance in this wizard is gated on the in-flight save lock — Back carries it, the
// advance carries it, publish and save-as-draft carry it — and these two shipped without it.
//
// The sequence a host can produce, with no error and no report:
//
//   1. on some step, press **Save and continue**;
//   2. while the request is out, press a rail marker for an earlier step — the wizard moves there;
//   3. the save resolves, and the advance fires from the position captured AT THE CLICK, throwing the
//      host to a step they did not ask for.
//
// Nothing about that looks broken. The wizard simply ends up somewhere else, and a host who was
// deliberately going back to fix an answer is now two steps forward from where they started. On a
// nine-step form whose whole subject is a draft, that is a host losing their place in the middle of
// editing — and D-150's entire argument is that a host must be told the truth about their draft.
//
// A SECOND, QUIETER HALF, and it is the one a disabled attribute alone does not close. The advance also
// read the WALKED STEP LIST out of the same captured closure, and that list is MODE-DEPENDENT: the
// booking-mode step is filtered out in drop-in (OC-10). The occupancy radios are NOT gated on the save
// lock — they are form fields, not navigation — so a host CAN switch mode while a save is out. Under
// the captured list the arrival then gets recorded under the key of a step that does not exist in the
// mode the host is now in, and the marker for the step they ARE standing on stays permanently inert.
// `deferred-items.md` `[14-09]` predicted this arriving "one plan later" and asked for exactly this
// probe; case (5) is it.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE INSTRUMENT: A SAVE THAT DOES NOT RESOLVE UNTIL THIS FILE SAYS SO
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every other wizard test pins `saveListingStep` to resolve immediately, which makes the in-flight
// window zero-width and therefore unobservable — which is precisely why three files could assert this
// wizard from three directions and none of them could see this. Here the action returns a promise this
// file holds the resolver for, so the in-flight window is as wide as the assertions inside it.
//
// ⚠ THE ABSENCE IS ASSERTED FROM BOTH SIDES. "The marker is disabled" is satisfied by a rail that
// renders no markers at all, and by a wizard stuck on step one. So every in-flight case first proves
// the control EXISTS and is enabled at rest, then proves it is disabled in flight, then proves it is
// enabled again after the save resolves. A permanently-dead rail fails the first and third.
//
// The stubs are the ones `wizard-rail.test.tsx` and `wizard-save-state.test.tsx` use, for the same
// reasons; only the autosave is different, and its difference is the point.

import * as React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, within, cleanup, fireEvent, act } from "@testing-library/react";

// jsdom implements no ResizeObserver, and Radix's radio indicator measures itself with one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

const nav = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));

const actions = vi.hoisted(() => ({
  saveListingStep: vi.fn(),
  publishListing: vi.fn(),
}));

vi.mock("@/app/actions/listing", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => nav }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/lib/auth-client", () => ({ authClient: { sendVerificationEmail: vi.fn() } }));
vi.mock("@/components/listing/photo-uploader", () => ({ PhotoUploader: () => null }));
vi.mock("@/components/listing/address-autocomplete", () => ({ AddressAutocomplete: () => null }));

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

const UNLOCKED: ModeLockDisplay = { locked: false };

const WIZARD_SOURCE_PATH = "src/app/(host)/host/listings/[id]/edit/wizard.tsx";

/** The step titles, read from the exported list so a copy edit moves one place. */
const stepTitle = (key: (typeof STEPS)[number]["key"]) => {
  const found = STEPS.find((s) => s.key === key);
  if (!found) throw new Error(`no step keyed ${key}`);
  return found.title;
};

const CARD = { wholeSpace: "Whole space", dropIn: "Drop-in passes" } as const;

// ── Fixtures ─────────────────────────────────────────────────────────────────────────────────────────

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

function mount(listing: WizardListing = makeListing()) {
  return render(
    <ListingWizard
      listing={listing}
      hostEmail="host@example.com"
      emailVerified={false}
      modeLock={UNLOCKED}
    />,
  );
}

// ── Readers ──────────────────────────────────────────────────────────────────────────────────────────

function heading(): string {
  return screen.getByRole("heading", { level: 1 }).textContent ?? "";
}

function rail(): HTMLElement {
  return screen.getByTestId("wizard-step-rail");
}

/** Every rail marker that is a CONTROL — i.e. every visited, returnable step. */
function railButtons(): HTMLElement[] {
  return within(rail()).queryAllByRole("button");
}

const markerName = (position: number, title: string) =>
  `Go back to step ${position + 1}: ${title}`;

function advanceControl(): HTMLElement {
  return screen.getByRole("button", { name: /Get started|Save and continue/ });
}

function checklistContainer(): HTMLElement {
  const found = [...document.querySelectorAll<HTMLElement>('[data-testid="publish-checklist"]')];
  if (found.length !== 1) {
    throw new Error(`expected exactly one checklist container, found ${found.length}`);
  }
  return found[0];
}

/**
 * Open the persistent checklist's disclosure, IDEMPOTENTLY.
 *
 * jsdom implements no media-query engine, so `usePublishChecklistPlacement` falls back to the
 * collapsible placement and its rows are unmounted until it is opened. Asking `aria-expanded` first
 * rather than toggling is `publish-checklist.test.tsx`'s recorded lesson: the `<aside>` survives a step
 * change, so an unconditional second click closes what the first opened.
 */
async function openTheCollapsible() {
  const btn = screen.queryByRole("button", { name: /ready to publish/i });
  if (!btn) throw new Error("the persistent placement rendered no disclosure trigger");
  if (btn.getAttribute("aria-expanded") === "true") return;
  await act(async () => {
    fireEvent.click(btn);
  });
}

/** Every `Fix` control the checklist is currently rendering. */
function fixControls(): HTMLElement[] {
  return within(checklistContainer()).queryAllByRole("button", { name: "Fix" });
}

// ── The deferred autosave ────────────────────────────────────────────────────────────────────────────

type SaveResult = { ok: true } | { ok: false; error: string };

let pending: ((r: SaveResult) => void) | null = null;

/** Press the advance and leave the save IN FLIGHT. Returns the resolver. */
async function beginSave(): Promise<(r?: SaveResult) => Promise<void>> {
  actions.saveListingStep.mockImplementation(
    () =>
      new Promise<SaveResult>((resolve) => {
        pending = resolve;
      }),
  );
  await act(async () => {
    fireEvent.click(advanceControl());
  });
  const resolve = pending;
  if (!resolve) throw new Error("the advance did not call the autosave action at all");
  pending = null;
  return async (r: SaveResult = { ok: true }) => {
    await act(async () => {
      resolve(r);
      // Two microtask turns: one for the action's promise, one for the state updates behind it.
      await Promise.resolve();
    });
    actions.saveListingStep.mockResolvedValue({ ok: true });
  };
}

/** One advance that resolves immediately — the walking helper, not the instrument. */
async function advance() {
  await act(async () => {
    fireEvent.click(advanceControl());
  });
}

async function advanceTo(title: string) {
  for (let i = 0; i < 12; i += 1) {
    if (heading() === title) return;
    await advance();
  }
  throw new Error(`never reached "${title}" — stuck at "${heading()}"`);
}

function card(cardTitle: string): HTMLElement {
  const el = screen.getByText(cardTitle).closest("label");
  if (!el) throw new Error(`no card wrapper for "${cardTitle}"`);
  return el as HTMLElement;
}

async function chooseMode(cardTitle: string) {
  const radio = within(card(cardTitle)).getByRole("radio");
  await act(async () => {
    fireEvent.click(radio);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  pending = null;
  actions.saveListingStep.mockResolvedValue({ ok: true });
  actions.publishListing.mockResolvedValue({ ok: true });
});

afterEach(cleanup);

// ═══════════════════════════════════════════════════════════════════════════════════════════════════

describe("(1) the rail respects the in-flight save lock, like every other navigation control", () => {
  it("is enabled at rest, disabled while a save is out, and enabled again once it resolves", async () => {
    mount();
    await advanceTo(stepTitle("photos"));

    // AT REST — and this half is what stops the case passing on a rail that renders nothing.
    const before = railButtons();
    expect(before.length, "the rail rendered no returnable markers to test").toBeGreaterThan(0);
    for (const btn of before) expect(btn.hasAttribute("disabled")).toBe(false);

    const settle = await beginSave();

    // IN FLIGHT.
    const during = railButtons();
    expect(during).toHaveLength(before.length);
    for (const btn of during) {
      expect(
        btn.hasAttribute("disabled"),
        `${btn.getAttribute("aria-label")} stayed pressable while an autosave was in flight. ` +
          "Every other navigation control in this wizard is gated on that lock; a rail press that " +
          "races the save is silently overridden when it resolves.",
      ).toBe(true);
    }

    await settle();

    const after = railButtons();
    expect(after.length).toBeGreaterThan(0);
    for (const btn of after) expect(btn.hasAttribute("disabled")).toBe(false);
  });

  it("cannot be pressed into moving the wizard while the save is out", async () => {
    mount();
    await advanceTo(stepTitle("photos"));
    const at = heading();

    const settle = await beginSave();

    // The exact press the sequence in the header describes: a marker for an EARLIER step.
    const marker = within(rail()).getByRole("button", {
      name: markerName(0, stepTitle("type")),
    });
    await act(async () => {
      fireEvent.click(marker);
    });

    expect(
      heading(),
      "the wizard moved on a press that should have been inert, which is the first half of the race",
    ).toBe(at);

    await settle();

    // …and the save's own advance still lands exactly one step on, at the step the host asked for by
    // pressing the advance in the first place.
    expect(heading()).toBe(stepTitle("occupancy"));
  });
});

describe("(2) the publish checklist's fix control carries the same lock", () => {
  it("is enabled at rest, disabled in flight, enabled again after", async () => {
    // A listing missing its title, so at least one row is unmet and therefore renders a `Fix`.
    mount(makeListing({ title: null }));
    await openTheCollapsible();

    const before = fixControls();
    expect(before.length, "no unmet row rendered a fix control to test").toBeGreaterThan(0);
    for (const btn of before) expect(btn.hasAttribute("disabled")).toBe(false);

    const settle = await beginSave();
    await openTheCollapsible();

    const during = fixControls();
    expect(during.length).toBeGreaterThan(0);
    for (const btn of during) {
      expect(
        btn.hasAttribute("disabled"),
        "a checklist fix control stayed pressable during an in-flight save. 14-10 made these " +
          "reachable from the FIRST step, so they are forward navigation and race the save exactly " +
          "as the rail does.",
      ).toBe(true);
    }

    await settle();
    await openTheCollapsible();
    for (const btn of fixControls()) expect(btn.hasAttribute("disabled")).toBe(false);
  });

  it("does not move the wizard when pressed during an in-flight save", async () => {
    mount(makeListing({ title: null }));
    await openTheCollapsible();
    const at = heading();

    const settle = await beginSave();
    await openTheCollapsible();

    const fix = fixControls()[0];
    await act(async () => {
      fireEvent.click(fix);
    });
    expect(heading()).toBe(at);

    await settle();
  });
});

describe("(3) the review step's own checklist takes the lock too", () => {
  it("disables its fix controls while a save is out", async () => {
    // The review step renders the inline placement; the persistent one is suppressed there, so this is
    // a genuinely second call site and not the same node under another name.
    mount(makeListing({ title: null }));
    await advanceTo(stepTitle("review"));

    const before = fixControls();
    expect(before.length, "the review placement rendered no fix control").toBeGreaterThan(0);
    for (const btn of before) expect(btn.hasAttribute("disabled")).toBe(false);

    // On the review step the advance is `Save as draft` (the listing is not publishable), which drives
    // the same autosave through the same lock.
    actions.saveListingStep.mockImplementation(
      () =>
        new Promise<SaveResult>((resolve) => {
          pending = resolve;
        }),
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save as draft" }));
    });
    const resolve = pending;
    expect(resolve, "the draft save did not call the autosave action").toBeTruthy();

    for (const btn of fixControls()) expect(btn.hasAttribute("disabled")).toBe(true);

    await act(async () => {
      resolve?.({ ok: false, error: "nope" });
      await Promise.resolve();
    });
  });
});

describe("(4) a refused save does not leave the wizard locked", () => {
  it("re-enables the rail when the server refuses, so the host can still go back and fix it", async () => {
    mount();
    await advanceTo(stepTitle("photos"));
    const at = heading();

    const settle = await beginSave();
    await settle({ ok: false, error: "We couldn't find that listing, or it isn't yours to edit." });

    // The refusal keeps the host where they were (`wizard-save-state.test.tsx` case 1 owns that claim);
    // what this case adds is that the LOCK lifted. A wizard that refuses a save and then leaves every
    // navigation control dead is a host with a broken draft and no way to reach the field.
    expect(heading()).toBe(at);
    const after = railButtons();
    expect(after.length).toBeGreaterThan(0);
    for (const btn of after) expect(btn.hasAttribute("disabled")).toBe(false);
  });
});

describe("(5) a mid-flight occupancy switch leaves every walked step returnable", () => {
  it("records the arrival the host actually made", async () => {
    // The occupancy radios are FORM FIELDS, not navigation, so they are deliberately not behind the
    // save lock — the walked list really can change while a save is out. This walks that.
    //
    // ⚠ WHAT THIS CASE CAN AND CANNOT SEE, stated rather than implied, because the honest answer is
    // narrower than it looks. `deferred-items.md` [14-09] already worked out why: the mode can only be
    // changed ON the occupancy step, and the two walked lists are IDENTICAL at and below that position
    // — occupancy is 4 and the next step is `pricing` in both — so the advance that resolves after this
    // switch targets the same step under either list. The captured-list bug therefore has no
    // OBSERVABLE consequence here, and this case would pass against it. It is kept because it is the
    // walk that WOULD expose it the moment D-148 is widened to allow a forward jump, which is exactly
    // what that deferred entry asks the widening plan to re-run. The source assertion below is what
    // covers the captured read itself.
    mount();
    await advanceTo(stepTitle("occupancy"));
    expect(heading()).toBe(stepTitle("occupancy"));

    const settle = await beginSave();
    await chooseMode(CARD.dropIn);
    await settle();

    expect(heading()).toBe(stepTitle("pricing"));

    // Walk on, so the two steps behind the host become `done` markers the rail has to answer for.
    await advance();
    expect(heading()).toBe(stepTitle("cancellation"));

    for (const [position, key] of [
      [4, "occupancy"],
      [5, "pricing"],
    ] as const) {
      expect(
        within(rail()).getByRole("button", { name: markerName(position, stepTitle(key)) }),
        `step ${position + 1} is a step the host has stood on and it is not returnable`,
      ).toBeTruthy();
    }

    // …and no marker names a question from the mode they left.
    const names = railButtons().map((b) => b.getAttribute("aria-label") ?? "");
    expect(names.join(" | ")).not.toContain(stepTitle("booking"));
  });

  it("(5b · SOURCE) the advance resolves its target from the LIVE position, never a captured one", () => {
    // WHY THIS IS A SOURCE ASSERTION AND NOT A RENDERED ONE. Every navigation control in this wizard
    // is now behind the in-flight lock, so nothing a host can press moves `step` while a save is out —
    // which means the captured read has no reachable consequence TODAY and no rendered probe can drive
    // it red. That is a property of five `disabled` attributes all staying correct, not of the code
    // being right, and the next affordance added to this wizard is one attribute away from restoring
    // the race. `wizard-save-state.test.tsx` reads its own no-scheduled-callback rule out of the source
    // for the same reason and with the same words: the rendered half structurally cannot see it.
    //
    // Scoped to the advance's own body, anchored on the two function names either side of it, so
    // narrowing the slice fails loudly instead of quietly making the rule mean nothing.
    const src = readFileSync(resolve(process.cwd(), WIZARD_SOURCE_PATH), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\/\*|\*)/.test(line))
      .join("\n");

    const start = src.indexOf("async function saveAndContinue(");
    const end = src.indexOf("async function saveAsDraft(");
    expect(start, `${WIZARD_SOURCE_PATH} no longer declares saveAndContinue`).toBeGreaterThan(-1);
    expect(end, `${WIZARD_SOURCE_PATH} no longer declares saveAsDraft`).toBeGreaterThan(start);
    const advanceBody = src.slice(start, end);

    expect(
      advanceBody,
      "the advance reads the step index out of its own closure. That value is as of the CLICK, and " +
        "this line runs after an await — so any future control that escapes the in-flight lock puts " +
        "the host on a step they did not choose, silently. Move one step from wherever the host IS.",
    ).not.toMatch(/\bstep\s*[+-]/);
  });
});
