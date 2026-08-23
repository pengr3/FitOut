// @vitest-environment jsdom

// HFLOW-02 / 14-CONTEXT D-149 / 14-UI-SPEC § The persistent publish checklist —
// ONE CHECKLIST PER DOCUMENT, AT EVERY STEP, IN BOTH OCCUPANCY MODES.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SILENT FAILURE THIS FILE CATCHES
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-149 gives the publish checklist three placements — a side panel from the large breakpoint up, a
// collapsible summary below it, and the review step's inline one — over a single row array. Two of them
// on one document is TWO PLACES A HOST CAN READ A DIFFERENT ANSWER to "am I ready to publish", and
// neither one looks broken on its own: each renders correct rows, each is internally consistent, and the
// defect is the RELATION between them. On the review step the suppression that prevents it is one
// boolean deep (`currentKey !== "review"`), which is exactly the shape a later edit reintroduces while
// reading as a simplification.
//
// Nothing else can catch it. `wizard-occupancy.test.tsx` asserts the review checklist's CONTENT and
// would be perfectly green with a second checklist beside it; `wizard-rail.test.tsx` scopes everything
// inside the rail's own subtree. A count over the whole document is the assertion, and it has to be
// written as one.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT JSDOM CAN AND CANNOT DECIDE HERE, STATED RATHER THAN WORKED AROUND
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The two PERSISTENT placements are chosen by a media query (`usePublishChecklistPlacement`), and
// **jsdom implements no `window.matchMedia` at all** — measured, not assumed: `typeof
// window.matchMedia` is `"undefined"` in this environment. The hook guards on exactly that and falls
// back to the collapsible, so every wizard render in this file produces the SMALL-SCREEN placement.
//
// That is not a gap this file papers over; it is why the file is shaped the way it is:
//
//   • The COUNT (cases 1 and 2) is placement-independent. One container is one container whichever
//     shape it takes, so the walk asserts the thing that matters at every width from the one width
//     jsdom has.
//   • The PANEL placement's own markup (cases 3 and 6) is asserted by rendering the component DIRECTLY
//     with `placement="panel"`, not by simulating a viewport. A stubbed `matchMedia` would assert that
//     the stub works.
//   • The WIDTH-DEPENDENT half — that the panel is the one painted at 1024 and the collapsible the one
//     painted at 320 — is a browser claim and is declared in plan 14-16's visual baselines. It was also
//     MEASURED once by hand during 14-10 (containers = 1 at 320 / 768 / 1280 in Chromium, with the
//     trigger present and `aria-expanded="false"` at the two narrow widths and the panel heading
//     present at the wide one); that reading is in the plan summary, not in this file, because a
//     one-off drive is evidence and not a gate.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE PREAMBLE IS THE OCCUPANCY FILE'S, DELIBERATELY
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Same stubs, same fixtures, same walk helpers as `tests/listing/wizard-occupancy.test.tsx` and
// `tests/listing/wizard-rail.test.tsx`. The wizard is a client component whose server couplings are the
// listing actions, the auth client and two heavy children; those are stubbed and every piece of markup
// asserted below is the wizard's own. The open fixture keeps its exclusive rates for 09-07's reason: a
// fork that keyed on "the rates happen to be null" would pass against a null-rate fixture and then be
// wrong on a real converted listing.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act, within } from "@testing-library/react";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

vi.mock("@/app/actions/listing", () => ({
  saveListingStep: vi.fn(async () => ({ ok: true as const })),
  publishListing: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
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
  type StepKey,
  type WizardListing,
} from "@/app/(host)/host/listings/[id]/edit/wizard";
import {
  PublishChecklist,
  publishChecklistTriggerLabel,
  type PublishChecklistRow,
} from "@/components/host/publish-checklist";
import { publishSchema } from "@/lib/validation/listing";

afterEach(cleanup);

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

/** A drop-in listing that STILL carries its exclusive rates — 09-07's fixture lesson. */
function makeOpenListing(overrides: Partial<WizardListing> = {}): WizardListing {
  return makeListing({ occupancyMode: "open_capacity", perHeadPriceCents: 35000, ...overrides });
}

const UNLOCKED: ModeLockDisplay = { locked: false };

function mount(listing: WizardListing, emailVerified = false) {
  return render(
    <ListingWizard
      listing={listing}
      hostEmail="host@example.com"
      emailVerified={emailVerified}
      modeLock={UNLOCKED}
    />,
  );
}

/**
 * The walked step list for a mode, composed FROM the exported step list rather than retyped.
 *
 * OC-10 removes the booking-mode step from the drop-in flow — from the LIST, not merely from what is
 * shown — so the two walks have different lengths and a hard-coded 9 would be wrong for one of them.
 */
function walked(mode: "exclusive" | "open_capacity"): readonly { key: StepKey; title: string }[] {
  return mode === "open_capacity" ? STEPS.filter((s) => s.key !== "booking") : STEPS;
}

function stepTitle(key: StepKey): string {
  const step = STEPS.find((s) => s.key === key);
  if (!step) throw new Error(`no step keyed "${key}" in the exported step list`);
  return step.title;
}

function heading(): string {
  return screen.getByRole("heading", { level: 1 }).textContent ?? "";
}

async function advance() {
  const btn = screen.getByRole("button", { name: /Get started|Save and continue/ });
  await act(async () => {
    fireEvent.click(btn);
  });
}

// ── Checklist readers ────────────────────────────────────────────────────────────────────────────────

/** Every checklist CONTAINER on the document. The whole file exists to keep this at length 1. */
function containers(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-testid="publish-checklist"]')];
}

function theContainer(): HTMLElement {
  const found = containers();
  if (found.length !== 1) {
    throw new Error(`expected exactly one checklist container, found ${found.length}`);
  }
  return found[0];
}

/**
 * The row LABELS inside a container, as a set.
 *
 * Read off the row's second child rather than its whole text: the first child is the done marker (a
 * glyph) and the third, when the row is unmet, is the fix control, so `li.textContent` would fold a
 * control's copy into the label and make two placements look different for a reason that is not the
 * label.
 */
function rowLabels(container: HTMLElement): string[] {
  return [...container.querySelectorAll("li")].map(
    (li) => (li.children[1] as HTMLElement | undefined)?.textContent?.trim() ?? "",
  );
}

/** The collapsible placement's trigger. Absent from the review placement, by construction. */
function trigger(): HTMLElement | null {
  return screen.queryByRole("button", { name: /ready to publish/i });
}

/**
 * Open the disclosure, IDEMPOTENTLY.
 *
 * Written as a toggle first, and that was wrong in a way worth recording: the `<aside>` holding the
 * persistent placement stays MOUNTED across a step change, so its open state survives the advance —
 * and a second unconditional click at the next step closed it again. The reading came back empty and
 * looked like a placement that renders no rows. Asking `aria-expanded` first is what makes the helper
 * describe the state it wants rather than the action it takes.
 */
async function openTheCollapsible() {
  const btn = trigger();
  if (!btn) throw new Error("the persistent placement rendered no disclosure trigger");
  if (btn.getAttribute("aria-expanded") === "true") return;
  await act(async () => {
    fireEvent.click(btn);
  });
}

/** A row's marker: the first child of its list item, in every placement. */
function markers(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll("li")].map((li) => {
    const el = li.firstElementChild;
    if (!el) throw new Error("a checklist row rendered no marker at all");
    return el as HTMLElement;
  });
}

// ── The gate's own fork, read from the schema rather than retyped ─────────────────────────────────────

/**
 * A payload `publishSchema` accepts, per mode. Built here so the probe below can remove ONE field at a
 * time and ask the real gate whether that field was required in that mode.
 */
function publishablePayload(mode: "exclusive" | "open_capacity") {
  const base = {
    title: "Sunset Strength Floor",
    description: "Platforms, racks and a lot of chalk.",
    primarySpaceType: "gym_fitness_floor" as const,
    addressLine1: "1 Ayala Ave",
    city: "Makati",
    region: "NCR",
    country: "PH",
    lat: 14.5547,
    lng: 121.0244,
    maxOccupancy: 30,
    bookingMode: "instant" as const,
    cancellationPolicy: "standard" as const,
    occupancyMode: mode,
    unitCount: 1,
  };
  return mode === "open_capacity"
    ? { ...base, perHeadPriceCents: 35000 }
    : { ...base, hourlyRateCents: 50000, dayRateCents: 300000 };
}

/** The four money/capacity fields the checklist forks over. */
const FORKED_FIELDS = [
  "maxOccupancy",
  "hourlyRateCents",
  "dayRateCents",
  "perHeadPriceCents",
] as const;
type ForkedField = (typeof FORKED_FIELDS)[number];

/**
 * THE ROW EACH GATE FIELD IS SUPPOSED TO NAME (07-15's two-places rule, written down once).
 *
 * This map is the CLAIM the assertion tests, not a convenience: a publish requirement has to land in
 * two places — the gate that enforces it and the checklist that names it — and the failure this catches
 * is a gate requirement with no row (a host at a dead Publish button with nothing marked unmet) or a
 * row the gate never checks (a host chasing a field that was never blocking).
 */
const ROW_FOR_FIELD: Record<"exclusive" | "open_capacity", Record<ForkedField, string | null>> = {
  exclusive: {
    maxOccupancy: "Capacity",
    hourlyRateCents: "Hourly rate",
    dayRateCents: "Day rate",
    perHeadPriceCents: null,
  },
  open_capacity: {
    maxOccupancy: "Drop-in cap",
    hourlyRateCents: null,
    dayRateCents: null,
    perHeadPriceCents: "Price per person",
  },
};

/** Which of the four the REAL schema refuses to publish without, in this mode. */
function fieldsTheGateRequires(mode: "exclusive" | "open_capacity"): string[] {
  const required: string[] = [];
  const control = publishSchema.safeParse(publishablePayload(mode));
  if (!control.success) {
    throw new Error(
      `the base payload for ${mode} is not publishable, so removing a field from it proves nothing: ` +
        JSON.stringify(control.error.issues),
    );
  }
  for (const field of FORKED_FIELDS) {
    const payload = { ...publishablePayload(mode) } as Record<string, unknown>;
    if (!(field in payload)) continue; // absent already — the gate cannot be requiring it
    delete payload[field];
    const result = publishSchema.safeParse(payload);
    if (!result.success && result.error.issues.some((i) => i.path[0] === field)) {
      required.push(field);
    }
  }
  return required.sort();
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════

describe("the persistent publish checklist (HFLOW-02 / D-149)", () => {
  // ── (1) + (2) THE COUNT ────────────────────────────────────────────────────────────────────────────
  it("(1) renders exactly ONE checklist per document at every step of the whole-space flow", async () => {
    mount(makeListing());
    const flow = walked("exclusive");
    expect(flow).toHaveLength(9);

    for (const [i, step] of flow.entries()) {
      expect(heading(), `walked to position ${i}`).toBe(step.title);
      expect(
        containers(),
        `at step ${i + 1} of ${flow.length} ("${step.title}") the document holds ` +
          `${containers().length} checklist containers. Exactly one is the rule: two is two places a ` +
          "host can read a different answer to \"am I ready to publish\", and the suppression that " +
          "prevents it on the review step is one boolean deep.",
      ).toHaveLength(1);
      if (i < flow.length - 1) await advance();
    }

    // …and the LAST one is the review step's inline placement, not a leftover persistent one: it
    // carries no disclosure trigger, because the review step's checklist is never collapsed.
    expect(heading()).toBe(stepTitle("review"));
    expect(trigger()).toBeNull();
  });

  it("(2) renders exactly ONE checklist per document at every step of the drop-in flow", async () => {
    mount(makeOpenListing());
    const flow = walked("open_capacity");
    // D-151: eight, not nine — the booking-mode step is removed from the LIST in this mode.
    expect(flow).toHaveLength(8);
    expect(flow.some((s) => s.key === "booking")).toBe(false);

    for (const [i, step] of flow.entries()) {
      expect(heading(), `walked to position ${i}`).toBe(step.title);
      expect(containers(), `drop-in step ${i + 1} of ${flow.length}`).toHaveLength(1);
      if (i < flow.length - 1) await advance();
    }
    expect(heading()).toBe(stepTitle("review"));
    expect(trigger()).toBeNull();
  });

  // ── (3) THE ROW SETS ───────────────────────────────────────────────────────────────────────────────
  it("(3) the persistent placement and the review placement name the SAME rows, in both modes", async () => {
    for (const [mode, listing] of [
      ["exclusive", makeListing()],
      ["open_capacity", makeOpenListing()],
    ] as const) {
      const { unmount } = mount(listing);
      const flow = walked(mode);

      // Read the persistent placement at EVERY step before the review one. The rows live inside the
      // disclosure, which defaults closed (case 4), so each reading opens it first.
      const perStep: string[][] = [];
      for (let i = 0; i < flow.length - 1; i += 1) {
        await openTheCollapsible();
        perStep.push(rowLabels(theContainer()));
        await advance();
      }

      expect(heading()).toBe(stepTitle("review"));
      const review = rowLabels(theContainer());
      expect(review.length, `${mode}: the review placement rendered no rows`).toBeGreaterThan(0);

      for (const [i, labels] of perStep.entries()) {
        // SET equality, not order-sensitive equality: the claim is that neither placement can name a
        // row the other does not, and a future placement that sorted its rows differently would still
        // be telling the host the same thing.
        expect(
          [...labels].sort(),
          `${mode}: at step ${i + 1} the persistent placement names a different SET of rows from the ` +
            "review placement. Both are handed the same array, so this can only be a placement that " +
            "filters or adds rows of its own.",
        ).toEqual([...review].sort());
      }

      // …and the FORK is the publish gate's own fork (07-15's two-places rule).
      const required = fieldsTheGateRequires(mode);
      const named = required
        .map((f) => ROW_FOR_FIELD[mode][f as ForkedField])
        .filter((label): label is string => label !== null);
      expect(
        named.length,
        `${mode}: the gate requires ${required.join(", ")} but ROW_FOR_FIELD names no row for one of ` +
          "them — which is the shape 07-15 forbids: a publish requirement with nothing to tell the host.",
      ).toBe(required.length);
      for (const label of named) {
        expect(review, `${mode}: the gate requires a value the checklist never names`).toContain(label);
      }
      // …and the OTHER mode's rows are absent, which is what makes it a fork rather than a superset.
      for (const label of Object.values(
        ROW_FOR_FIELD[mode === "exclusive" ? "open_capacity" : "exclusive"],
      )) {
        if (label === null || named.includes(label)) continue;
        expect(review, `${mode}: the other mode's row "${label}" leaked into this mode`).not.toContain(
          label,
        );
      }

      unmount();
    }
  });

  // ── (4) THE DISCLOSURE ─────────────────────────────────────────────────────────────────────────────
  it("(4) the small-screen trigger carries the done-of-total figure and defaults CLOSED", async () => {
    // emailVerified false, so exactly one of the TEN rows is unmet and the figure is not 10 of 10.
    // Ten, counted rather than assumed: title, description, space type, address, capacity, hourly
    // rate, day rate, three photos, a cancellation tier and a verified email.
    mount(makeListing());

    const btn = trigger();
    expect(btn, "the persistent placement rendered no disclosure trigger").not.toBeNull();
    expect(btn!.getAttribute("aria-expanded")).toBe("false");

    // CLOSED means the rows are NOT in the document — not merely hidden. That is what keeps a
    // ten-row panel from pushing the first input below the fold on every step of a nine-step form,
    // and it is why `wizard-occupancy.test.tsx`'s field-label queries still resolve to one element.
    expect(rowLabels(theContainer())).toEqual([]);

    // The figure is the component's own composition, not a retyped sentence.
    expect(btn!.textContent).toContain(publishChecklistTriggerLabel(9, 10));

    await openTheCollapsible();
    expect(trigger()!.getAttribute("aria-expanded")).toBe("true");
    const labels = rowLabels(theContainer());
    expect(labels).toHaveLength(10);
    expect(labels).toContain("Verified email");

    // …and the figure tracks the rows rather than a constant: nine of the ten are done.
    expect(markers(theContainer())).toHaveLength(10);
  });

  // ── (5) THE FIX AFFORDANCE ─────────────────────────────────────────────────────────────────────────
  it("(5) a row's fix control moves the wizard to THAT row's step, from the first step", async () => {
    // An unmet TITLE, whose row resolves to the details step — two positions ahead of where the host
    // is standing. This is the affordance that did not exist before D-149: until the checklist became
    // persistent, a fix link could only ever move BACKWARD from the review step.
    mount(makeListing({ title: null }));
    expect(heading()).toBe(stepTitle("type"));

    await openTheCollapsible();
    const container = theContainer();
    const titleRow = [...container.querySelectorAll("li")].find(
      (li) => (li.children[1] as HTMLElement | undefined)?.textContent?.trim() === "Title",
    );
    expect(titleRow, "the checklist rendered no row labelled Title").toBeDefined();

    const fix = within(titleRow as HTMLElement).getByRole("button", { name: "Fix" });
    await act(async () => {
      fireEvent.click(fix);
    });

    // BY KEY, from the exported list. A numeric literal here would pass in whole-space mode and be
    // wrong in drop-in, which is the rot `wizard.tsx`'s own docblocks forbid.
    expect(heading()).toBe(stepTitle("details"));
    // …and it is still exactly one checklist after the jump.
    expect(containers()).toHaveLength(1);
  });

  // ── (6) THE MARKER ─────────────────────────────────────────────────────────────────────────────────
  it("(6) the done marker holds a hidden glyph and NO text node, in every placement", async () => {
    // Why this is asserted at all: the marker carries the ONE filled success surface DS-10 left
    // standing in the repo, and it survives ONLY because it is a glyph and not a label. The moment a
    // text node lands in it, the pairing that is measured at 3.83 against a 3.05 non-text bar becomes
    // a text pairing measured at 3.24 against 4.5 — a real contrast failure that no colour gate can
    // see, because the classes did not change.
    const assertMarkers = (container: HTMLElement, where: string) => {
      const found = markers(container);
      expect(found.length, `${where}: no rows to check`).toBeGreaterThan(0);
      for (const marker of found) {
        expect(
          marker.textContent,
          `${where}: a checklist marker holds a text node. It must hold a glyph and nothing else.`,
        ).toBe("");
        const glyph = marker.querySelector("svg");
        expect(glyph, `${where}: a checklist marker holds no glyph at all`).not.toBeNull();
        expect(
          glyph!.getAttribute("aria-hidden"),
          `${where}: the marker's glyph is not hidden from assistive technology, so the done state is ` +
            "announced twice — once by the glyph and once by the row copy beside it.",
        ).toBe("true");
      }
    };

    // (a) the collapsible placement, through the wizard.
    const wizard = mount(makeListing());
    await openTheCollapsible();
    assertMarkers(theContainer(), "collapsible placement");
    wizard.unmount();

    // (b) the review placement, through the wizard.
    const review = mount(makeListing());
    for (let i = 0; i < walked("exclusive").length - 1; i += 1) await advance();
    expect(heading()).toBe(stepTitle("review"));
    assertMarkers(theContainer(), "review placement");
    review.unmount();

    // (c) the PANEL placement, rendered directly — see the file header for why this is not a simulated
    // viewport. It is the placement jsdom can never choose, and its markup still has to be asserted.
    const rows: PublishChecklistRow[] = [
      { label: "Title", done: true, step: 1 },
      { label: "3+ photos", done: false, step: 3 },
    ];
    render(<PublishChecklist placement="panel" rows={rows} onFix={() => {}} />);
    expect(containers()).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Ready to publish?" })).toBeTruthy();
    // The panel is NOT a disclosure: it has no trigger and its rows are readable with no interaction.
    expect(trigger()).toBeNull();
    expect(rowLabels(theContainer())).toEqual(["Title", "3+ photos"]);
    assertMarkers(theContainer(), "panel placement");
  });
});
