// @vitest-environment jsdom

// HOURS-01 / HOURS-02 — the RENDERED half of copy-to-all. `copy-hours.test.ts` beside this file already
// proves the transformation over 18 cases; nothing here re-tests it. What is provable only against
// rendered output is the WIRING, and the ways it can break quietly are the ones below.
//
//   • A WARNING THAT ARRIVES AFTER THE COPY HAS FAILED THE REQUIREMENT IT IS FOR. HOURS-02 says the
//     host is told BEFORE it applies which days already have hours. A test that checked the warning
//     only after confirming would pass on a product that surprises them — so case (1) asserts the
//     warning while the overlay is still open and the schedule is still untouched, and asserts the
//     schedule is untouched in the same breath.
//
//   • A COPY THAT QUIETLY SAVED would pass a weaker "the days changed" test while breaking D-130. The
//     copy is a client form-state edit; the server action is the editor's ONE transport and it must be
//     called zero times. Case (2) asserts both halves together.
//
//   • AN UNDO THAT RESTORES A FLATTENED WEEK. The two shapes a naive restore gets wrong are a day with
//     SEVERAL windows and a day with NONE, so the fixture carries both and case (3) asserts them by
//     name rather than asserting "something came back".
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED BEFORE GREEN (31 August 2026). Command:
// `npx vitest run tests/availability/copy-hours-editor.test.tsx`
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Run against the UNWIRED editor — the day rows carrying only their add-hours control and no overlay
// in the tree. **12 failed (12)**, every one of them on the control it could not find:
//
//   TestingLibraryElementError: Unable to find an accessible element with the role "button" and
//   name "Copy Monday's hours"
//
// Wired → 12 passed. That first red is honest but WEAK — it says the feature is absent, not that these
// cases can tell a wrong wiring from a right one. The cases that carry real discriminating power are
// (1), which fails on a product that applies before it warns; (2) and (3), which fail on a copy that
// reaches the server; and (9)/(10), which fail on the focus defect D-168's mitigation shape names.
//
// ⚠ WHY THE OUTSIDE OF THE OVERLAY IS READ THROUGH THE DOM AND NOT THROUGH ROLE QUERIES. Radix marks
// everything outside an open modal as hidden from assistive technology, which is correct behaviour and
// exactly what makes `getAllByRole` return nothing for the week strip while the picker is open. The
// strip and the day rows are therefore read with plain DOM queries here — the same idiom
// `week-strip.test.tsx`'s own `readStrip` uses — so "the schedule has not changed yet" is a claim about
// the tree rather than an artefact of a query that could not reach it.
//
// ⚠ WHY THE FOCUS CASES POLL INSTEAD OF FLUSHING ONCE, measured rather than assumed while writing them.
// Radix does not dispatch its close-time focus event during the unmount commit: its focus scope defers
// the whole thing behind a zero-delay timer (its own comment cites a React unmount-focus bug). So a
// single flush of pending microtasks lands BEFORE the handler has run at all, and the case reads a
// document body that is about to stop being the answer. The probe: the same case with six sequential
// flushes and no polling still saw the body, and the identical case wrapped in `waitFor` passed. These
// cases therefore poll, and the product code defers its focus call through state for the same reason.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react";

// The editor's ONE server coupling. Stubbed as the transport under test: the copy must never reach it.
vi.mock("@/app/actions/operating-hours", () => ({
  saveOperatingHours: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { saveOperatingHours } from "@/app/actions/operating-hours";
import { WeeklyHoursEditor } from "@/components/availability/weekly-hours-editor";

// Radix's select and dialog both measure themselves with an observer jsdom does not implement. Stubbed
// here rather than in the shared setup so the blast radius is this file.
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
});

const CITY = "Cebu City";

/**
 * Monday holds TWO windows, Tuesday is CLOSED, Wednesday holds one. Those three shapes are the whole
 * argument: multi-window source, closed target, and a target whose hours get replaced.
 */
const FIXTURE = [
  { dayOfWeek: 1, openTime: "06:00", closeTime: "09:00" },
  { dayOfWeek: 1, openTime: "17:00", closeTime: "22:00" },
  { dayOfWeek: 3, openTime: "09:00", closeTime: "17:00" },
];

function renderEditor(initialWindows = FIXTURE) {
  return render(
    <WeeklyHoursEditor
      listingId="listing-under-test"
      cityLabel={CITY}
      gmtLabel="GMT+8"
      initialWindows={initialWindows}
    />,
  );
}

/** The strip's seven sentences, read through the DOM so an open modal cannot hide them. */
const stripSentences = (root: HTMLElement) =>
  Array.from(root.querySelectorAll('[data-testid="week-strip-text"] li')).map((li) => li.textContent);

/** One weekday's editor row, located by the day name the row opens with. */
const rowHeaded = (root: HTMLElement, day: string) =>
  (within(root).getByText(day, { selector: "span", exact: true }).parentElement as HTMLElement);

/** How many windows that day's row is currently editing (each window renders an open and a close). */
const windowCount = (root: HTMLElement, day: string) =>
  rowHeaded(root, day).querySelectorAll("select").length / 2;

/** The save control, read through the DOM for the reason in the header. */
const saveButton = (root: HTMLElement) =>
  root.querySelector<HTMLButtonElement>('button[type="submit"]') as HTMLButtonElement;

/** Open the picker for a weekday from its own row. */
function openCopyFor(day: string) {
  fireEvent.click(screen.getByRole("button", { name: `Copy ${day}'s hours` }));
}

/** Tick a day in the open picker, by the sentence that day currently reads. */
function pick(sentence: string) {
  fireEvent.click(screen.getByRole("checkbox", { name: sentence }));
}

describe("copy-to-all — the host is told what will be replaced BEFORE it applies (HOURS-02)", () => {
  it("(1) names exactly the picked days that already have hours, while nothing has been applied yet", async () => {
    const { container } = renderEditor();

    openCopyFor("Monday");
    await screen.findByRole("heading", { name: "Copy Monday's hours" });

    // Nothing is selected yet, so there is nothing to warn about.
    expect(screen.queryByText(/already ha[sv]e? hours/i)).toBeNull();

    pick("Tuesday: closed");
    pick("Wednesday: 9:00 AM to 5:00 PM");

    // Wednesday has hours and Tuesday does not, so the sentence names one of them and not the other.
    const warning = screen.getByText(/already has hours/i);
    expect(warning.textContent).toBe("Wednesday already has hours. Copying replaces them.");

    // …AND THE SCHEDULE IS STILL UNTOUCHED. Without this clause the case above would also pass on a
    // product that applied the copy the moment a box was ticked and then explained itself afterwards.
    expect(stripSentences(container)[3]).toBe("Wednesday: 9:00 AM to 5:00 PM");
    expect(stripSentences(container)[2]).toBe("Tuesday: closed");
    expect(vi.mocked(saveOperatingHours)).toHaveBeenCalledTimes(0);
  });

  it("(2) applies the copy to the day rows and the strip, and calls the server ZERO times", async () => {
    const { container } = renderEditor();

    openCopyFor("Monday");
    await screen.findByRole("heading", { name: "Copy Monday's hours" });
    pick("Tuesday: closed");
    pick("Wednesday: 9:00 AM to 5:00 PM");
    fireEvent.click(screen.getByRole("button", { name: "Copy to 2 days" }));

    // THE DAY ROWS: both targets now edit Monday's two windows.
    expect(windowCount(container, "Tuesday")).toBe(2);
    expect(windowCount(container, "Wednesday")).toBe(2);
    // …and the source is not consumed by its own copy.
    expect(windowCount(container, "Monday")).toBe(2);

    // THE STRIP: the same three days, said the same way, from the same live form value (D-152/D-153).
    const monday = "Monday: 6:00 AM to 9:00 AM, and 5:00 PM to 10:00 PM";
    expect(stripSentences(container)[1]).toBe(monday);
    expect(stripSentences(container)[2]).toBe(monday.replace("Monday", "Tuesday"));
    expect(stripSentences(container)[3]).toBe(monday.replace("Monday", "Wednesday"));
    // Untouched days did not move.
    expect(stripSentences(container)[5]).toBe("Friday: closed");

    // NOTHING WAS SENT. A copy that quietly saved would satisfy every clause above.
    expect(vi.mocked(saveOperatingHours)).toHaveBeenCalledTimes(0);
  });
});

describe("copy-to-all — the undo restores the schedule EXACTLY (HOURS-02 · D-137)", () => {
  it("(3) puts a multi-window day and a closed day back the way they were", async () => {
    const { container } = renderEditor();

    // The undo affordance does not exist before there is anything to undo.
    expect(screen.queryByRole("button", { name: "Undo copy" })).toBeNull();

    openCopyFor("Monday");
    await screen.findByRole("heading", { name: "Copy Monday's hours" });
    pick("Tuesday: closed");
    pick("Wednesday: 9:00 AM to 5:00 PM");
    fireEvent.click(screen.getByRole("button", { name: "Copy to 2 days" }));

    const undo = await screen.findByRole("button", { name: "Undo copy" });
    expect(screen.getByText("Copied Monday's hours to Tuesday and Wednesday.")).toBeTruthy();

    fireEvent.click(undo);

    // THE CLOSED DAY IS CLOSED AGAIN — the shape a restore that only re-writes non-empty days misses.
    expect(windowCount(container, "Tuesday")).toBe(0);
    expect(stripSentences(container)[2]).toBe("Tuesday: closed");
    // THE SINGLE-WINDOW DAY IS SINGLE AGAIN — not two windows, and not Monday's times.
    expect(windowCount(container, "Wednesday")).toBe(1);
    expect(stripSentences(container)[3]).toBe("Wednesday: 9:00 AM to 5:00 PM");
    // …and the source day still holds BOTH of its windows.
    expect(windowCount(container, "Monday")).toBe(2);
    expect(stripSentences(container)[1]).toBe("Monday: 6:00 AM to 9:00 AM, and 5:00 PM to 10:00 PM");

    // The affordance retires with the record it described.
    expect(screen.queryByRole("button", { name: "Undo copy" })).toBeNull();
    expect(vi.mocked(saveOperatingHours)).toHaveBeenCalledTimes(0);
  });

  it("(4) copies a CLOSED day onto a day that had hours, having named it first", async () => {
    const { container } = renderEditor();

    openCopyFor("Tuesday");
    await screen.findByRole("heading", { name: "Copy Tuesday's hours" });
    pick("Wednesday: 9:00 AM to 5:00 PM");

    // Named BEFORE it applies, exactly as for an ordinary copy — closing a day is a real overwrite.
    expect(screen.getByText(/already has hours/i).textContent).toBe(
      "Wednesday already has hours. Copying replaces them.",
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy to 1 day" }));

    expect(windowCount(container, "Wednesday")).toBe(0);
    expect(stripSentences(container)[3]).toBe("Wednesday: closed");
    // The sentence does not claim hours were copied, because none were.
    expect(screen.getByText("Copied Tuesday's closed day to Wednesday.")).toBeTruthy();
  });

  it("(13) retires the undo affordance once the copy has been SAVED", async () => {
    // HOURS-02's undo is a before-Save affordance, and this is where "before Save" ends. Left up
    // after a successful save it would offer to reverse something it cannot: it restores FORM state,
    // and the database now holds the copied schedule.
    const { container } = renderEditor();

    openCopyFor("Monday");
    await screen.findByRole("heading", { name: "Copy Monday's hours" });
    pick("Tuesday: closed");
    fireEvent.click(screen.getByRole("button", { name: "Copy to 1 day" }));
    await screen.findByRole("button", { name: "Undo copy" });

    fireEvent.click(saveButton(container));
    await waitFor(() => expect(vi.mocked(saveOperatingHours)).toHaveBeenCalledTimes(1));

    // What the save carried is the copied schedule, through the UNCHANGED submit path (D-130).
    const sent = vi.mocked(saveOperatingHours).mock.calls[0][1];
    expect(sent.windows.filter((window) => window.dayOfWeek === 2)).toHaveLength(2);

    await waitFor(() => expect(screen.queryByRole("button", { name: "Undo copy" })).toBeNull());
    expect(screen.queryByText(/^Copied Monday/)).toBeNull();
  });
});

describe("copy-to-all — what it must NOT change (D-130 · GATE-NOREG)", () => {
  it("(5) leaves Save pressable before, during and after a copy", async () => {
    const { container } = renderEditor();
    expect(saveButton(container).disabled).toBe(false);

    openCopyFor("Monday");
    await screen.findByRole("heading", { name: "Copy Monday's hours" });
    expect(saveButton(container).disabled).toBe(false);

    pick("Tuesday: closed");
    fireEvent.click(screen.getByRole("button", { name: "Copy to 1 day" }));
    await screen.findByRole("button", { name: "Undo copy" });

    // D-130: the client form is never the authority, so nothing this feature adds may gate the button.
    // `week-strip.test.tsx` case (12) already fails on the validity spelling of this defect.
    expect(saveButton(container).disabled).toBe(false);
  });

  it("(6) keeps the seven day rows, the add control and the source day's own windows", async () => {
    const { container } = renderEditor();

    // Seven rows, one per weekday, still headed by name.
    for (const day of ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]) {
      expect(rowHeaded(container, day)).toBeTruthy();
    }
    // The add control is still on every row beside the new copy control.
    expect(screen.getAllByRole("button", { name: /add hours/i })).toHaveLength(7);
    expect(screen.getAllByRole("button", { name: /^Copy .+'s hours$/ })).toHaveLength(7);

    // And adding a window still works after a copy has been applied.
    openCopyFor("Monday");
    await screen.findByRole("heading", { name: "Copy Monday's hours" });
    pick("Tuesday: closed");
    fireEvent.click(screen.getByRole("button", { name: "Copy to 1 day" }));
    await screen.findByRole("button", { name: "Undo copy" });

    const before = windowCount(container, "Friday");
    fireEvent.click(within(rowHeaded(container, "Friday")).getByRole("button", { name: /add hours/i }));
    expect(windowCount(container, "Friday")).toBe(before + 1);
  });

  it("(7) filters NO weekday out of the picker — the hours lock is the server's rule (T-19-04)", async () => {
    // A client-side pre-check would be a SECOND authority on what may be saved, which is exactly what
    // D-130 forbids. `saveOperatingHours` evaluates the lock against the persisted occupancy mode and
    // the real bookings, and its refusal already reaches this form through the shipped toast and the
    // field error pinned onto the windows path. So the picker offers all six other weekdays, always.
    renderEditor();

    openCopyFor("Monday");
    await screen.findByRole("heading", { name: "Copy Monday's hours" });

    expect(screen.getAllByRole("checkbox")).toHaveLength(6);
    // …and Monday is not among them: a day is never its own target.
    expect(screen.queryByRole("checkbox", { name: /^Monday:/ })).toBeNull();
  });
});

describe("copy-to-all — reachable and operable by keyboard alone (GATE-A11Y · D-168)", () => {
  it("(8) steers focus back to the copy control when the picker is dismissed", async () => {
    renderEditor();

    const trigger = screen.getByRole("button", { name: "Copy Monday's hours" });
    trigger.focus();
    fireEvent.click(trigger);
    await screen.findByRole("heading", { name: "Copy Monday's hours" });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // THE DEFECT THIS PREVENTS: the overlay opens with no trigger element of Radix's own, so Radix
    // suppresses the browser's focus restore and then aims at a reference nothing populated — leaving
    // focus on the document body, from where the next Tab restarts the page.
    expect(document.body.contains(trigger)).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("(9) steers focus onto the undo control after a copy applies, and that control names what happened", async () => {
    renderEditor();

    openCopyFor("Monday");
    await screen.findByRole("heading", { name: "Copy Monday's hours" });
    pick("Tuesday: closed");
    fireEvent.click(screen.getByRole("button", { name: "Copy to 1 day" }));

    const undo = await screen.findByRole("button", { name: "Undo copy" });

    // The outcome reaches a screen-reader host through MOVED FOCUS rather than through a live region
    // (D-152's reasoning applied to this surface): focus lands on the undo control and that control's
    // accessible description is the sentence saying what was copied.
    await waitFor(() => expect(document.activeElement).toBe(undo));
    const describedBy = undo.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      "Copied Monday's hours to Tuesday.",
    );
  });

  it("(10) returns focus to the copy control that started it when the copy is undone", async () => {
    renderEditor();

    const trigger = screen.getByRole("button", { name: "Copy Monday's hours" });
    openCopyFor("Monday");
    await screen.findByRole("heading", { name: "Copy Monday's hours" });
    pick("Tuesday: closed");
    fireEvent.click(screen.getByRole("button", { name: "Copy to 1 day" }));

    fireEvent.click(await screen.findByRole("button", { name: "Undo copy" }));

    // The undone-from control is the one place focus can land that is neither the body nor a control
    // that has just been removed from the page.
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("(11) renders every control this feature adds as a real, focusable control", async () => {
    renderEditor();

    const trigger = screen.getByRole("button", { name: "Copy Monday's hours" });
    expect(trigger.tagName).toBe("BUTTON");
    fireEvent.click(trigger);
    await screen.findByRole("heading", { name: "Copy Monday's hours" });

    // The confirm is DISABLED until something is picked, and a disabled control is not focusable —
    // so a day is picked first and the confirm is exercised in the state a host can actually reach.
    pick("Tuesday: closed");

    for (const control of [
      ...screen.getAllByRole("checkbox"),
      screen.getByRole("button", { name: "Cancel" }),
      screen.getByRole("button", { name: /^Copy to / }),
    ]) {
      control.focus();
      expect(document.activeElement).toBe(control);
    }

    // …and the undo control, once there is one.
    fireEvent.click(screen.getByRole("button", { name: /^Copy to / }));
    const undo = await screen.findByRole("button", { name: "Undo copy" });
    undo.focus();
    expect(document.activeElement).toBe(undo);
  });

  it("(12) renders NO live region on the picker — the outcome is announced by moved focus", async () => {
    renderEditor();

    openCopyFor("Monday");
    const heading = await screen.findByRole("heading", { name: "Copy Monday's hours" });
    const overlay = heading.closest('[data-testid="responsive-dialog"]') as HTMLElement;

    // The same count-shaped assertion `week-strip.test.tsx` case (6) makes about the strip: asked as a
    // count rather than as "the interrupting level is absent", so the polite spellings are caught too.
    expect(
      overlay.querySelectorAll('[aria-live], [role="status"], [role="alert"], [role="log"]'),
    ).toHaveLength(0);
  });
});
