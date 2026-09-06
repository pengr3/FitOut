// @vitest-environment jsdom

// D-19.1-D lives in the availability suite, not the design suite, because the proof needs the real
// booking-selection harness. Rebuilding that provider in tests/design would create the second source
// of truth this directory has already had to repair once.

import * as React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act } from "react";
import { cleanup, render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver =
  globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/app/actions/availability", () => ({
  getDayAvailability: vi.fn(),
  getOpenMonthAvailability: vi.fn(),
}));

import type { DayAvailability } from "@/lib/availability/read-model";
import {
  AvailabilityCalendar,
  BookingSelectionProvider,
  type DayLocal,
} from "@/components/availability/availability-calendar";
import { Calendar } from "@/components/ui/calendar";

const TIMEZONE = "Asia/Manila";
const PINNED_TODAY: DayLocal = { year: 2026, month: 9, day: 14 };
const PINNED_ISO = "2026-09-14";
const CLOCKS = ["2026-09-05T15:59:00.000Z", "2026-09-05T16:01:00.000Z"] as const;

const EXCLUSIVE_DAY: DayAvailability = {
  timezone: TIMEZONE,
  unitCount: 1,
  hasHours: false,
  bookingMode: "instant",
  occupancyMode: "exclusive",
  openCapacity: null,
  slots: [],
};

const OPEN_DAY: DayAvailability = {
  ...EXCLUSIVE_DAY,
  occupancyMode: "open_capacity",
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function markedDayAt(
  clock: (typeof CLOCKS)[number],
  occupancyMode: "exclusive" | "open_capacity",
): string | null {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(clock));
  const initialDay = occupancyMode === "exclusive" ? EXCLUSIVE_DAY : OPEN_DAY;
  const { container, unmount } = render(
    <BookingSelectionProvider
      listingId="listing_today_ring"
      timezone={TIMEZONE}
      initialDate={PINNED_TODAY}
      initialDay={initialDay}
    >
      <AvailabilityCalendar
        listingId="listing_today_ring"
        timezone={TIMEZONE}
        cityLabel="Makati"
        gmtLabel="GMT+8"
        unitCount={1}
        bookable={false}
        initialDate={PINNED_TODAY}
        initialDay={initialDay}
        occupancyMode={occupancyMode}
        initialFullDates={[]}
        todayDate={PINNED_TODAY}
      />
    </BookingSelectionProvider>,
  );
  const marked = container.querySelector<HTMLElement>('[data-today="true"]')?.dataset.day ?? null;
  unmount();
  return marked;
}

describe("the availability today ring is a pure function of venue-local today", () => {
  it("the hourly calendar marks the same venue-local cell under two system clocks", () => {
    expect(CLOCKS.map((clock) => markedDayAt(clock, "exclusive"))).toEqual([
      PINNED_ISO,
      PINNED_ISO,
    ]);
  });

  it("the drop-in twin marks the same venue-local cell under two system clocks", () => {
    expect(CLOCKS.map((clock) => markedDayAt(clock, "open_capacity"))).toEqual([
      PINNED_ISO,
      PINNED_ISO,
    ]);
  });

  it("both component sources pass today explicitly and neither reads a clock", () => {
    const paths = [
      "src/components/availability/availability-calendar.tsx",
      "src/components/availability/date-pass-picker.tsx",
    ];
    const regions = paths.map((path) => {
      const source = readFileSync(resolve(process.cwd(), path), "utf8");
      const start = source.indexOf(
        path.endsWith("date-pass-picker.tsx")
          ? "export function DatePassPicker"
          : "export function AvailabilityCalendar",
      );
      expect(start, `could not find the component body in ${path}`).toBeGreaterThan(-1);
      return {
        path,
        source: source
          .slice(start)
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/(^|[^:])\/\/.*$/gm, "$1"),
      };
    });

    expect(regions, "the source census discovered no calendar components").toHaveLength(2);
    for (const { path, source } of regions) {
      expect(
        /<Calendar\s[\s\S]*?\btoday=\{todayStart\}/.test(source),
        `${path} does not hand its vendored Calendar an explicit venue-local today`,
      ).toBe(true);
      for (const forbidden of ["new Date(", "Date.now(", "getTimezoneOffset("]) {
        expect(source.includes(forbidden), `${path} reads the clock with ${forbidden}`).toBe(false);
      }
    }
  });
});

describe("server render and client hydration cannot disagree about the today ring", () => {
  function hydrateAcrossDayBoundary(explicitToday: boolean): string[] {
    vi.useFakeTimers({ toFake: ["Date"] });
    const node = (
      <Calendar
        mode="single"
        timeZone={TIMEZONE}
        defaultMonth={new Date("2026-09-01T00:00:00.000Z")}
        {...(explicitToday ? { today: new Date("2026-09-14T00:00:00.000Z") } : {})}
      />
    );

    vi.setSystemTime(new Date(CLOCKS[0]));
    const html = renderToString(node);
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.appendChild(container);

    vi.setSystemTime(new Date(CLOCKS[1]));
    const complaints: string[] = [];
    const errorSpy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      complaints.push(args.map(String).join(" "));
    });
    let root: ReturnType<typeof hydrateRoot> | null = null;
    act(() => {
      root = hydrateRoot(container, node, {
        onRecoverableError: (error) => {
          complaints.push(error instanceof Error ? error.message : String(error));
        },
      });
    });
    act(() => root?.unmount());
    errorSpy.mockRestore();
    container.remove();
    return complaints;
  }

  it("the explicit venue-local today hydrates without a marked-cell mismatch", () => {
    expect(hydrateAcrossDayBoundary(true)).toEqual([]);
  });

  it("CONTROL — withholding today is required to fail across the day boundary", () => {
    expect(
      hydrateAcrossDayBoundary(false).length,
      "the clock-reading control did not complain, so the hydration proof is measuring nothing",
    ).toBeGreaterThan(0);
  });
});
