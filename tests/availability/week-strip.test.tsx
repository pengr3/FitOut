// @vitest-environment jsdom

// HFLOW-04 · D-152 / D-153 — the week strip's RENDERED half, and the two silent failures it exists to
// catch. `week-strip.test.ts` beside this file already proves the derivation over 48 cases; nothing here
// re-tests it. What is provable only against rendered output is the wiring, and both ways it can break
// are quiet:
//
//   • A PREVIEW THAT ONLY UPDATES AFTER A SAVE ROUND-TRIP HAS FAILED ITS OWN PURPOSE. D-152 exists so a
//     host who types nine in the morning where they meant nine at night sees it BEFORE they commit. Fed
//     `initialWindows` instead of the live watched value, the strip still renders, still looks correct on
//     first paint, and is simply always one save behind — a defect no typecheck and no snapshot notices.
//     Case 3 is the assertion that fails on it, and it is written as "the sentence changed AND nothing
//     was sent", because a preview that refreshed itself by re-reading the server would pass a weaker
//     test while breaking the same promise.
//
//   • A DECORATIVE GRID THAT IS NOT HIDDEN FROM ASSISTIVE TECHNOLOGY turns seven columns of meaningless
//     boxes into seven columns of announced noise. D-153 makes the bars decoration and the sentences the
//     meaning; if the grid loses `aria-hidden`, a screen-reader user gets the seven sentences AND every
//     day caption and every bar, and a sighted reviewer sees nothing wrong at all. Case 1 is the
//     assertion that fails on it.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — TWO PROBES, BOTH RUN AND BOTH REVERTED (23 August 2026). GREEN IS 6 PASSED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`). Command
// for both: `npx vitest run tests/availability/week-strip.test.tsx`
//
//   (a) THE PREVIEW WIRED TO THE SAVED VALUE. `weekly-hours-editor.tsx`'s `windows={liveWindows}`
//       replaced by `windows={initialWindows}` — i.e. the strip fed what was last saved instead of what
//       the host is typing, which is the one plausible wrong wiring and the one that still renders a
//       perfectly correct-looking strip. **1 failed / 5 passed**, on case 3 alone:
//
//         AssertionError: expected 'Monday: 9:00 AM to 5:00 PM' to be 'Monday: 6:00 AM to 5:00 PM'
//
//       That diff IS D-152 stated as a failure: the host has already picked six in the morning and the
//       preview is still describing the nine o'clock they are replacing. Reverted → 6 passed.
//
//   (b) THE DECORATIVE GRID UN-HIDDEN. `aria-hidden="true"` removed from the seven-column grid in
//       `week-strip.tsx` — the "helpful" edit that turns 14 pieces of decoration into announced noise.
//       **1 failed / 5 passed**, on case 1:
//
//         AssertionError: expected null to be 'true' // Object.is equality
//
//       The two clauses after it would have fired on the same edit — every bar and every day caption
//       stops being inside a hidden subtree — but the attribute assertion is first and expectations
//       fail fast. Reverted → 6 passed.
//
// WHAT THIS FILE CANNOT SEE, stated so the next reader under-trusts it. jsdom computes no layout, so
// "the bar is 6.66px tall at the 320px floor" is not assertable here and is not attempted — the geometry
// is checked as the percentages the component writes, and whether a 33 by 7 pixel mark is LEGIBLE is a
// human call routed to 14-VALIDATION § Manual-Only (D-131 is the standing reason this split exists).
// Nor does jsdom implement the accessibility tree: "hidden from assistive technology" is asserted here as
// the two things that are checkable — the attribute on the grid, and the fact that every bar and caption
// lies inside that subtree while the seven sentences lie outside it — plus a role query, which Testing
// Library resolves with `hidden: false` and therefore genuinely will not reach into an aria-hidden
// subtree.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

// The editor's only server coupling. Stubbed as the TRANSPORT under test: case 3 asserts this mock's
// call count is zero, which is what "the preview is live rather than post-save" means mechanically.
vi.mock("@/app/actions/operating-hours", () => ({
  saveOperatingHours: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { saveOperatingHours } from "@/app/actions/operating-hours";
import { WeekStrip } from "@/components/availability/week-strip";
import { WeeklyHoursEditor } from "@/components/availability/weekly-hours-editor";
// F-1 reads its expected sentence OUT OF THE SCHEMA rather than spelling it. A literal here would be a
// second copy of the one authority, and the fix's whole claim is that there is only ever one.
import { hoursWindowSchema } from "@/lib/validation/availability";

// Radix's select measures itself with a ResizeObserver jsdom does not implement. Stubbed here rather
// than in the shared setup so the blast radius is this file; nothing asserted below is a measurement.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const CITY = "Cebu City";

/** The strip's structure, walked once so no case re-derives it. */
function readStrip(root: HTMLElement) {
  const grid = root.querySelector<HTMLElement>('[data-testid="week-strip"]');
  if (!grid) throw new Error("the strip rendered no grid");
  const columns = Array.from(grid.children) as HTMLElement[];
  return {
    grid,
    columns,
    /** Every column's track (the first child) and the positioned bars inside it. */
    tracks: columns.map((column) => column.firstElementChild as HTMLElement),
    segments: columns.flatMap((column) =>
      Array.from((column.firstElementChild as HTMLElement).children),
    ) as HTMLElement[],
  };
}

/** `"37.5%"` → `37.5`. The component writes percentages; jsdom does not resolve them to pixels. */
const percent = (value: string) => Number.parseFloat(value.replace("%", ""));

/** Is this element inside a subtree that assistive technology is told to skip? */
const isHiddenFromAT = (el: Element) => el.closest('[aria-hidden="true"]') !== null;

const ALARM = /destructive|-red-|-amber-|-orange-|-yellow-/;

const paintedClasses = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>("*")).flatMap((el) =>
    Array.from(el.classList).filter((c) => !c.includes(":")),
  );

describe("WeekStrip — the bars are decoration and the sentences are the meaning (D-153)", () => {
  it("(1) hides the whole grid from assistive technology: seven sentences reachable, zero bars", () => {
    const { container } = render(
      <WeekStrip
        cityLabel={CITY}
        windows={[
          { dayOfWeek: 1, openTime: "06:00", closeTime: "22:00" },
          { dayOfWeek: 5, openTime: "08:00", closeTime: "12:00" },
        ]}
      />,
    );
    const { grid, segments } = readStrip(container);

    expect(grid.getAttribute("aria-hidden")).toBe("true");

    // NOT VACUOUS: there are bars to hide. A strip that drew nothing would satisfy every clause below
    // perfectly, which is the shape of vacuity `card-pattern-coverage.test.ts`'s probe (c) measured.
    expect(segments.length).toBe(2);
    for (const bar of segments) expect(isHiddenFromAT(bar)).toBe(true);
    // The day captions are inside the same subtree, so they are hidden by inheritance — each one is
    // repeated as the subject of its own sentence, and announcing both would say every weekday twice.
    for (const column of readStrip(container).columns) {
      expect(isHiddenFromAT(column.querySelector("p") as Element)).toBe(true);
    }

    // …and the MEANING is reachable. `getByRole` resolves with `hidden: false`, so this query cannot
    // see into the grid at all: seven items is the text equivalent and nothing else.
    const announced = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(announced).toEqual([
      "Sunday: closed",
      "Monday: 6:00 AM to 10:00 PM",
      "Tuesday: closed",
      "Wednesday: closed",
      "Thursday: closed",
      "Friday: 8:00 AM to 12:00 PM",
      "Saturday: closed",
    ]);
  });

  it("(2) renders exactly seven sentences, one per weekday, in weekday order", () => {
    const { container } = render(<WeekStrip cityLabel={CITY} windows={[]} />);

    const list = container.querySelector<HTMLElement>('[data-testid="week-strip-text"]');
    expect(list?.tagName).toBe("UL");
    const items = Array.from(list?.querySelectorAll("li") ?? []);
    expect(items).toHaveLength(7);
    // Pinned against the LABELS, not against seven of anything: an ISO re-basing that kept the count
    // and shifted the names would pass a length assertion and misalign every column against the day
    // rows directly beneath it.
    expect(items.map((li) => li.textContent?.split(":")[0])).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
    // The columns are in the same order and there are seven of them — this is the pairing D-153 rests
    // on, and it is the only place the drawn order and the announced order are compared as rendered.
    expect(readStrip(container).columns).toHaveLength(7);
  });

  it("(4) draws two windows that touch at an endpoint as two adjacent bars with no gap", () => {
    const { container } = render(
      <WeekStrip
        cityLabel={CITY}
        windows={[
          { dayOfWeek: 3, openTime: "09:00", closeTime: "12:00" },
          { dayOfWeek: 3, openTime: "12:00", closeTime: "15:00" },
        ]}
      />,
    );
    const { tracks } = readStrip(container);
    const wednesday = Array.from(tracks[3].children) as HTMLElement[];

    // TWO elements, not one. Coalescing them would draw the same picture and announce a range the host
    // never typed — the "tidy-up" 14-04 watched its own derivation fail against.
    expect(wednesday).toHaveLength(2);

    const [first, second] = wednesday.map((bar) => ({
      top: percent(bar.style.top),
      height: percent(bar.style.height),
    }));
    expect(first.top).toBeCloseTo(37.5, 6);
    expect(first.height).toBeCloseTo(12.5, 6);
    // NO GAP AND NO OVERLAP: the second bar starts exactly where the first ends, so the pair merges
    // into one visual run. That is correct rather than an artefact — the space IS open continuously
    // across the boundary, which is what the half-open convention the schema shares with the exclusion
    // constraint means. The tolerance is floating-point slack on a percentage, far below one device
    // pixel of a 160px track.
    expect(second.top).toBeCloseTo(first.top + first.height, 6);
    expect(second.height).toBeCloseTo(12.5, 6);

    // And the sentence names BOTH ranges, from the same call that positioned the two bars.
    expect(screen.getAllByRole("listitem")[3].textContent).toBe(
      "Wednesday: 9:00 AM to 12:00 PM, and 12:00 PM to 3:00 PM",
    );
  });

  it("(5) draws an unset week as seven empty tracks and says so without alarm", () => {
    const { container } = render(<WeekStrip cityLabel={CITY} windows={[]} />);
    const { tracks, segments } = readStrip(container);

    expect(tracks).toHaveLength(7);
    expect(segments).toHaveLength(0);
    expect(screen.getByText("Closed every day — no hours set yet.")).toBeTruthy();
    expect(screen.getByText(`Midnight to midnight · ${CITY} time`)).toBeTruthy();

    // AN UNSET WEEK IS NOT AN ERROR. It is the truthful picture of a listing nobody has set up yet, and
    // the place that fact becomes actionable is the shipped hours-missing signal — not here.
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(0);
    expect(paintedClasses(container).filter((c) => ALARM.test(c))).toEqual([]);
  });

  it("(6) renders ZERO live regions, so a later helpful addition fails here", () => {
    // GATE-03 rule 6. The select the host just changed already announces its own new value; a second
    // announcement for one action is the defect, not the courtesy. Asserted as a COUNT rather than as
    // "the banned politeness level is absent", so `aria-live="polite"` and `role="status"` are caught
    // by the same clause that catches the assertive one.
    const { container } = render(
      <WeekStrip cityLabel={CITY} windows={[{ dayOfWeek: 2, openTime: "07:00", closeTime: "09:00" }]} />,
    );

    expect(
      container.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]'),
    ).toHaveLength(0);
  });
});

describe("WeekStrip inside the editor — the preview is LIVE, not post-save (D-152)", () => {
  it("(3) re-draws the day the host just edited, with zero network calls", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { container } = render(
      <WeeklyHoursEditor
        listingId="listing-under-test"
        cityLabel={CITY}
        gmtLabel="GMT+8"
        initialWindows={[{ dayOfWeek: 1, openTime: "09:00", closeTime: "17:00" }]}
      />,
    );

    const mondayBefore = () => screen.getAllByRole("listitem")[1].textContent;
    expect(mondayBefore()).toBe("Monday: 9:00 AM to 5:00 PM");

    // Radix mirrors each Select into a hidden native <select> for form submission, and firing `change`
    // on it drives the SAME `onValueChange` the visible trigger does — without needing the pointer
    // capture APIs jsdom has never implemented. The first one is the open time of the only window.
    const openTime = container.querySelectorAll("select")[0];
    act(() => {
      fireEvent.change(openTime, { target: { value: "06:00" } });
    });

    // THE ASSERTION D-152 EXISTS FOR: the sentence for that day changed, from a value that was never
    // saved and never round-tripped.
    expect(mondayBefore()).toBe("Monday: 6:00 AM to 5:00 PM");
    // …and no other day moved, so the change is attributable to the edit rather than to a re-render.
    expect(screen.getAllByRole("listitem")[0].textContent).toBe("Sunday: closed");

    // AND NOTHING WAS SENT. Both halves matter: the server action is the editor's only transport, and
    // `fetch` is what a "helpful" refresh would reach for instead.
    expect(vi.mocked(saveOperatingHours)).toHaveBeenCalledTimes(0);
    expect(fetchSpy).toHaveBeenCalledTimes(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WR-03 — THE HEADING OUTLINE THE AVAILABILITY ROUTE PUTS THESE TWO PANELS INSIDE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `PanelCard` rendered its `title` as an unconditional `<h2>` and had no level prop. Plan 14-12 moved a
// shipped `<h3>Set your weekly hours</h3>` onto it and plan 14-13 mounted this strip's own panel beside
// it, so a route whose section is ALREADY headed `<h2>Weekly hours</h2>` grew two more sibling `<h2>`s
// for content subordinate to it. The commit message said *"every word is byte-identical; only the box
// is new"* — the box was not the only thing that changed; the heading LEVEL did.
//
// WHY IT IS SILENT. Nothing looks wrong: `text-heading` sizes an `<h2>` and an `<h3>` identically, so a
// sighted reviewer sees a title. What breaks is the only structural answer a screen-reader user has to
// "what is inside what" — three peers where one is the parent of the other two.
//
// ⚠ WHAT IS ASSERTED IS THE PROPERTY, NOT THE SPELLING. A case reading `titleAs="h3"` off the source
// would pass on a prop that is accepted and ignored. These render the editor INSIDE the section heading
// the route actually gives it and count what comes out — so any future panel added to this editor is
// covered without an edit here, and the claim is the one the outline makes.
//
// WHAT THIS CANNOT SEE: the route's own two `<section>`s and `BlocksEditor` are not mounted here, so
// this is the availability page's outline only as far as the editor contributes to it. The whole-route
// reading is `e2e/host-headings.spec.ts`, which documents at its line 93 that it says nothing about
// `<h2>` and below — see this phase's `deferred-items.md` for why that was left standing.

describe("WR-03 — the weekly-hours panels are SUBORDINATE to the section that heads them", () => {
  /** The route's own shape: a section with its second-level heading, and the editor inside it. */
  function renderInsideTheSection(initialWindows: Parameters<typeof WeeklyHoursEditor>[0]["initialWindows"]) {
    return render(
      <section>
        <h2>Weekly hours</h2>
        <WeeklyHoursEditor
          listingId="listing-under-test"
          cityLabel={CITY}
          gmtLabel="GMT+8"
          initialWindows={initialWindows}
        />
      </section>,
    );
  }

  it("(7) contributes NO second-level heading to a section that already has one", () => {
    // No windows, so BOTH panels render: the advisory and the strip.
    const { container } = renderInsideTheSection([]);

    const levelTwo = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(
      levelTwo,
      "the editor added a sibling <h2> to the section that heads it. Both of its panels are content " +
        "BELOW `Weekly hours`, not peers of it, and a reader with three peers has no outline — only " +
        "a list. This is the level `blocks-editor.tsx` preserves next door for the same reason.",
    ).toEqual(["Weekly hours"]);
  });

  it("(8) heads both of its panels at level three, by name", () => {
    renderInsideTheSection([]);

    for (const title of ["Set your weekly hours", "Your week at a glance"]) {
      expect(
        screen.getByRole("heading", { name: title, level: 3 }),
        `"${title}" is not a third-level heading`,
      ).toBeTruthy();
      expect(screen.queryByRole("heading", { name: title, level: 2 })).toBeNull();
    }
  });

  it("(9) still heads them — the fix is a LEVEL change, never a demotion to a paragraph", () => {
    // The failure mode a `<p>` would produce is the one `EmptyState`'s own `titleAs` docblock names:
    // an outline repaired by deleting the entry from it. Both titles must remain real headings.
    renderInsideTheSection([]);

    const headings = screen
      .getAllByRole("heading")
      .map((h) => h.textContent?.trim())
      .filter(Boolean);
    expect(headings).toContain("Set your weekly hours");
    expect(headings).toContain("Your week at a glance");
  });

  it("(10) the strip's own panel is level three wherever it is mounted, not only inside the editor", () => {
    // Mounted directly, because the level is the STRIP's decision and not an accident of its parent —
    // the editor is its only call site today and that is exactly the assumption worth pinning.
    render(<WeekStrip cityLabel={CITY} windows={[]} />);

    expect(screen.getByRole("heading", { name: "Your week at a glance", level: 3 })).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// F-1 — THE IMPOSSIBLE WINDOW NAMES ITS REASON ON ITS OWN ROW, AND SAVE STAYS PRESSABLE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Walk B's fact 3, made a gate. A host whose Monday window was 5 AM – 6 AM and who drags the OPEN time
// to the evening lands on 6 PM → 6 AM, and before this the product said nothing: the strip's column
// emptied and that was the entire pre-save signal. The PM's ruling was "explain on the row, keep Save
// live" — so both halves are asserted together, because either one alone is satisfiable by the wrong fix
// (a disabled Save "explains" nothing, and a message that also greys the button is not what was ruled).
//
// ⚠ THE MECHANISM, MEASURED RATHER THAN ASSUMED (24 August 2026). The UAT log offered a hypothesis and
// said plainly it was not a diagnosis. It was probed before anything was built on it, and it holds
// exactly: the schema attaches `Close time must be after open time.` to the `closeTime` path, and
// react-hook-form's onChange path looks an error up at the path of the field that CHANGED. Changing
// `openTime` makes that lookup walk `windows.0.openTime` → `windows.0`, find nothing, and write only
// that empty result into form state — so the sibling's issue is computed by the resolver and then
// discarded. The proof it was computed: pressing Save in the same state DID render the sentence and DID
// NOT call the server action. The message and its wiring were already correct; only the onChange path
// never populated it.
//
// WATCHED RED — TWO PROBES, BOTH RUN AND BOTH REVERTED (24 August 2026). GREEN IS 12 PASSED. Command
// for both: `npx vitest run tests/availability/week-strip.test.tsx`.
//
//   (a) THE FIX REMOVED — the open select back to a bare `onValueChange={field.onChange}`, i.e. the
//       tree exactly as the UAT pass found it. **2 failed / 10 passed**, both on the same clause:
//
//         Unable to find an element with the text: Close time must be after open time.
//
//       That IS F-1: the sentence the schema computed on that keystroke never reached the row. Both
//       cases fail here because (12) must first find the message before it can ask about the button.
//       Restored → 12 passed.
//
//   (b) SAVE GATED ON CLIENT VALIDITY — the fix in place and the submit button changed to
//       `disabled={saving || !form.formState.isValid}`, which is the "improvement" the ruling
//       forbids and the one a later reader is most likely to reach for. **1 failed / 11 passed**, on
//       case (12) alone and on its own clause:
//
//         expected true to be false
//
//       (11) stayed green throughout, which is the point of splitting them: the two halves of the PM's
//       ruling fail independently. Reverted → 12 passed.
//
// WHAT THIS CANNOT SEE: jsdom computes no layout, so "the sentence sits next to the offending day" is
// asserted STRUCTURALLY — the message is inside Monday's row and inside no other day's — rather than as
// a position. The `<select>` indices are Radix's hidden native mirrors, in document order, which is the
// same idiom case (3) above already relies on.

describe("F-1 — a window whose close is not after its open explains itself on that day's row", () => {
  /** The sentence the SHARED schema attaches to this exact mistake. Never spelled here. */
  const REASON = (() => {
    const parsed = hoursWindowSchema.safeParse({
      dayOfWeek: 1,
      openTime: "18:00",
      closeTime: "06:00",
    });
    if (parsed.success) {
      throw new Error(
        "`hoursWindowSchema` now ACCEPTS 18:00–06:00. This case exists because it refuses it; if the " +
          "rule moved, the two cases below are asserting against a mistake the product no longer makes.",
      );
    }
    return parsed.error.issues[0].message;
  })();

  /** Walk B's realistic path: an early-morning window whose OPEN is later dragged to the evening. */
  function dragMondayOpenToTheEvening() {
    const view = render(
      <WeeklyHoursEditor
        listingId="listing-under-test"
        cityLabel={CITY}
        gmtLabel="GMT+8"
        initialWindows={[
          { dayOfWeek: 1, openTime: "05:00", closeTime: "06:00" },
          // A second, perfectly ordinary day. Without it "the message is on the offending row" is
          // indistinguishable from "the message is somewhere on the page".
          { dayOfWeek: 3, openTime: "09:00", closeTime: "17:00" },
        ]}
      />,
    );
    const mondayOpen = view.container.querySelectorAll("select")[0];
    act(() => {
      fireEvent.change(mondayOpen, { target: { value: "18:00" } });
    });
    return view;
  }

  it("(11) renders the SCHEMA's own sentence on the offending day, and on no other", async () => {
    const { container } = dragMondayOpenToTheEvening();

    // The strip already empties Monday's column — that is the shipped D-152 signal and it is the ONLY
    // one F-1 says is not enough. Asserted first so a regression that broke the strip instead of
    // fixing the message cannot read as a pass.
    expect(screen.getAllByRole("listitem")[1].textContent).toBe("Monday: closed");

    const message = await screen.findByText(REASON);

    // ON THE ROW — located by the weekday's own label rather than by a container class, so the claim is
    // "inside the row headed Monday" and not "inside whichever box happens to wrap it". Each weekday
    // row opens with a `<span>` holding exactly that day's name; the strip's sentences are `<li>`s
    // reading `Monday: …`, so an exact span match cannot resolve to one of those instead.
    const rowHeaded = (day: string) => {
      const label = screen.getByText(day, { selector: "span", exact: true });
      return label.parentElement as HTMLElement;
    };
    expect(
      rowHeaded("Monday").contains(message),
      "the reason rendered somewhere other than the row of the day it is about",
    ).toBe(true);
    expect(
      rowHeaded("Wednesday").contains(message),
      "the reason landed on an ordinary day's row as well as the offending one",
    ).toBe(false);

    // …and exactly once. A message repeated under every window on the page is not "next to the
    // offending day", it is noise that happens to include the right row.
    expect(screen.getAllByText(REASON)).toHaveLength(1);
  });

  it("(12) leaves Save pressable, and sends nothing while the host is still typing", async () => {
    dragMondayOpenToTheEvening();
    await screen.findByText(REASON);

    // THE OTHER HALF OF THE PM'S RULING, AND THE HALF A LATER "improvement" WILL REACH FOR FIRST. The
    // server re-validates every write with this same schema and stays the authority on what may be
    // stored (D-130); a client that greys the button has made itself a second authority on it.
    const save = screen.getByRole("button", { name: /save hours/i }) as HTMLButtonElement;
    expect(
      save.disabled,
      "`Save hours` was disabled while the form was invalid. The PM ruled the opposite — explain on " +
        "the row and leave the button pressable — and D-130 is why: the server re-validates with the " +
        "same schema, so the client must not become a second opinion about what can be saved.",
    ).toBe(false);

    // Surfacing a message is a RENDER, not a round trip.
    expect(vi.mocked(saveOperatingHours)).toHaveBeenCalledTimes(0);
  });
});
