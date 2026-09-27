// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { SlotPicker } from "@/components/availability/slot-picker";
import type { AvailabilitySlot } from "@/lib/availability/read-model";

class ResizeObserverStub { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});

const slots: AvailabilitySlot[] = [
  { startUtc: "2026-10-01T04:00:00.000Z", endUtc: "2026-10-01T05:00:00.000Z", state: "available", freeUnits: 1, unitCount: 1 },
  { startUtc: "2026-10-01T05:00:00.000Z", endUtc: "2026-10-01T06:00:00.000Z", state: "unavailable", freeUnits: 0, unitCount: 1 },
];

it("books 12 PM to 1 PM as one hour even when the 1 PM slot is unavailable", () => {
  const onSelectionChange = vi.fn();
  render(<SlotPicker slots={slots} timezone="Asia/Manila" unitCount={1} mode="instant" disabled={false} onSelectionChange={onSelectionChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Start at 12:00 PM" }));
  fireEvent.click(screen.getByRole("button", { name: "End at 1:00 PM" }));
  expect(onSelectionChange).toHaveBeenLastCalledWith({
    startUtc: slots[0].startUtc,
    endUtc: slots[0].endUtc,
    fullDay: false,
  });
  const checkout = screen.getByRole("button", { name: "1:00 PM — checkout selected; booking ends here" });
  expect(checkout.getAttribute("aria-pressed")).toBe("true");
  expect(checkout.getAttribute("class")).toContain("bg-brand/15");
  expect(checkout.hasAttribute("disabled")).toBe(true);
});

it("highlights an available checkout time without adding another charged hour", () => {
  const availableSlots = slots.map((slot) => ({ ...slot, state: "available" as const, freeUnits: 1 }));
  const onSelectionChange = vi.fn();
  render(<SlotPicker slots={availableSlots} timezone="Asia/Manila" unitCount={1} mode="instant" disabled={false} onSelectionChange={onSelectionChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Start at 12:00 PM" }));
  fireEvent.click(screen.getByRole("button", { name: "End at 1:00 PM" }));

  expect(onSelectionChange).toHaveBeenLastCalledWith({
    startUtc: availableSlots[0].startUtc,
    endUtc: availableSlots[0].endUtc,
    fullDay: false,
  });
  const checkout = screen.getByRole("button", { name: "1:00 PM — checkout selected; booking ends here" });
  expect(checkout.getAttribute("aria-pressed")).toBe("true");
  expect(checkout.getAttribute("class")).toContain("bg-brand/15");
});

it("offers hourly checkout without a full-day control when the host has no day rate", () => {
  const onSelectionChange = vi.fn();
  render(<SlotPicker slots={slots} timezone="Asia/Manila" unitCount={1} mode="instant" disabled={false} allowFullDay={false} onSelectionChange={onSelectionChange} />);
  expect(screen.queryByRole("button", { name: "Book full day" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Start at 12:00 PM" }));
  fireEvent.click(screen.getByRole("button", { name: "End at 1:00 PM" }));
  expect(onSelectionChange).toHaveBeenLastCalledWith({ startUtc: slots[0].startUtc, endUtc: slots[0].endUtc, fullDay: false });
});
