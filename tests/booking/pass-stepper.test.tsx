// @vitest-environment jsdom

// 09-UI-SPEC § 2c — the PRE-HOLD pass stepper, plus the regression gate on the split that produced it.
//
// WHY THIS FILE EXISTS IN TWO HALVES.
//
//   (A) PassStepper is the OC-06 binding: a drop-in booker's head count must be final BEFORE the hold,
//   because the capacity claim grants min(requested, remaining) inside the hold's own transaction and
//   D-126 refuses every later re-price. So its copy, its bounds and its callback contract are the whole
//   feature, not decoration — a stepper that silently emitted an unclamped number would hand the server a
//   request it can only ever grant DOWN, turning the OC-07 partial path into the happy path.
//
//   (B) PaxStepper is a UAT-passed money surface (08-17 step 2) whose markup was EXTRACTED into
//   StepperControl by this plan. The extraction was proven byte-identical at the time (three prop frames —
//   the min bound, a mid value and the max bound — rendered before and after the split, identical to the
//   byte). A byte digest is not a maintainable gate, so what survives here is the load-bearing structure:
//   the four shipped strings, the id the reserve page's label points at, the hit areas (`h-11 w-40` shell,
//   two `size-9` buttons), the read-only `tabular-nums` input, and the disabled states at both bounds.
//   If any of those moved, the reserve page changed and someone must re-run the money walkthrough.
//
// ⚠️ THE ZERO-ARITHMETIC CONTRACT AS A TEST (T-09-38). The grep gate proves no price CODE exists in the
// three files; case (9) proves no price appears in the rendered OUTPUT of either binding. Greps guard the
// source; only a render guards what a booker sees.
//
// The server action module is stubbed for the same reason cancellation-copy.test.tsx stubs it: PaxStepper's
// only server coupling is that import ("use server" → DB + next/headers), and stubbing it keeps the render
// pure without touching a single line of the markup under test.

import * as React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/actions/booking", () => ({ updateDeclaredPax: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { PassStepper } from "@/components/booking/pass-stepper";
import { PaxStepper } from "@/components/booking/pax-stepper";

afterEach(cleanup);

function renderPassStepper(value: number, max: number) {
  const onChange = vi.fn();
  const view = render(<PassStepper value={value} max={max} onChange={onChange} />);
  return { ...view, onChange };
}

describe("PassStepper — the pre-hold pass count (OC-06 / OC-18)", () => {
  it("(1) asks for passes, in the phase's booker vocabulary", () => {
    const { container } = renderPassStepper(1, 6);

    expect(screen.getByText("How many passes?")).toBeTruthy();
    expect(screen.getByText("One pass per person, including you.")).toBeTruthy();
    // Never the reserve page's wording: this is a pass count, not a persisted headcount.
    expect(container.textContent).not.toContain("How many people are coming?");
  });

  it("(2) its controls are named for passes, not guests", () => {
    renderPassStepper(2, 6);

    expect(screen.getByRole("button", { name: "Add a pass" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove a pass" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add a guest" })).toBeNull();
  });

  it("(3) uses its own id — two steppers must never share one", () => {
    const { container } = renderPassStepper(1, 6);

    expect(container.querySelector("#requested-passes")).toBeTruthy();
    expect(container.querySelector("#declared-pax")).toBeNull();
  });

  it("(4) clicking + emits value + 1", () => {
    const { onChange } = renderPassStepper(2, 6);

    fireEvent.click(screen.getByRole("button", { name: "Add a pass" }));

    expect(onChange.mock.calls).toEqual([[3]]);
  });

  it("(5) clicking − emits value − 1", () => {
    const { onChange } = renderPassStepper(3, 6);

    fireEvent.click(screen.getByRole("button", { name: "Remove a pass" }));

    expect(onChange.mock.calls).toEqual([[2]]);
  });

  it("(6) arrow keys do the same — the read-only input stays keyboard-operable", () => {
    const { onChange } = renderPassStepper(2, 6);
    const input = screen.getByLabelText("How many passes?");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(onChange.mock.calls).toEqual([[3], [1]]);
  });

  it("(7) is bounded by the date's remaining count and by 1 — and cannot ASK past either end", () => {
    // At the top: the picked date's `remaining` (OC-18 — the ONLY bound; v1 has no per-booker head cap,
    // so a booker may legitimately take the whole day). Courtesy only — the server re-clamps (T-09-05).
    const atMax = renderPassStepper(4, 4);
    expect(screen.getByRole("button", { name: "Add a pass" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Remove a pass" }).hasAttribute("disabled")).toBe(false);
    // Keyboard is not a way around the bound either.
    fireEvent.keyDown(screen.getByLabelText("How many passes?"), { key: "ArrowUp" });
    expect(atMax.onChange).not.toHaveBeenCalled();

    cleanup();

    const atMin = renderPassStepper(1, 4);
    expect(screen.getByRole("button", { name: "Remove a pass" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Add a pass" }).hasAttribute("disabled")).toBe(false);
    fireEvent.keyDown(screen.getByLabelText("How many passes?"), { key: "ArrowDown" });
    expect(atMin.onChange).not.toHaveBeenCalled();
  });

  it("(8) shows the count with tabular figures so stepping does not shift the layout", () => {
    const { container } = renderPassStepper(3, 6);
    const input = container.querySelector<HTMLInputElement>("#requested-passes");

    expect(input?.value).toBe("3");
    expect(input?.readOnly).toBe(true);
    expect(input?.className).toContain("tabular-nums");
  });

  it("(9) renders no money at all — the zero-arithmetic contract as rendered output (T-09-38)", () => {
    for (const view of [
      renderPassStepper(3, 6),
      (cleanup(), render(<PaxStepper holdId="hold-abc" declaredPax={3} maxOccupancy={12} />)),
    ]) {
      expect(view.container.textContent).not.toMatch(/₱|PHP/);
      // No decimal money pattern either — a peso figure would arrive as "1,050.00".
      expect(view.container.textContent).not.toMatch(/\d[\d,]*\.\d{2}/);
    }
  });
});

describe("PaxStepper — the shipped reserve-page binding did not move (08-17 step 2)", () => {
  function renderPax(declaredPax: number, maxOccupancy = 12) {
    return render(
      <PaxStepper holdId="hold-abc" declaredPax={declaredPax} maxOccupancy={maxOccupancy} />,
    );
  }

  it("(10) keeps all four shipped strings, byte-for-byte", () => {
    renderPax(2);

    expect(screen.getByText("How many people are coming?")).toBeTruthy();
    expect(screen.getByText("This includes you. Up to 12.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add a guest" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove a guest" })).toBeTruthy();
  });

  it("(11) keeps the shipped id, shell and hit areas the extraction had to carry across", () => {
    const { container } = renderPax(2);

    const input = container.querySelector<HTMLInputElement>("#declared-pax");
    expect(input).toBeTruthy();
    expect(input?.readOnly).toBe(true);
    expect(input?.className).toContain("text-center");
    expect(input?.className).toContain("tabular-nums");
    expect(input?.value).toBe("2");
    expect(input?.getAttribute("max")).toBe("12");

    // The 44px shell and the two 36px tap targets — the shipped touch sizing.
    expect(container.querySelector(".h-11.w-40")).toBeTruthy();
    expect(container.querySelectorAll("button.size-9")).toHaveLength(2);
  });

  it("(12) still disables at both ends of the listing's own cap", () => {
    renderPax(1);
    expect(screen.getByRole("button", { name: "Remove a guest" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Add a guest" }).hasAttribute("disabled")).toBe(false);

    cleanup();

    renderPax(12);
    expect(screen.getByRole("button", { name: "Add a guest" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Remove a guest" }).hasAttribute("disabled")).toBe(false);
  });
});
