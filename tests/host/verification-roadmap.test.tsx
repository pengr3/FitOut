// @vitest-environment jsdom

import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

const h = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  selectMock: vi.fn(),
  getSessionMock: vi.fn(),
  loadVerificationMock: vi.fn(),
  loadMissingHoursMock: vi.fn(),
  readDbNowMock: vi.fn(),
  queryAgendaMock: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((href: string) => {
    throw new Error(`unexpected redirect to ${href}`);
  }),
}));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: h.getSessionMock } } }));
vi.mock("@/lib/db", () => ({ db: { select: h.selectMock } }));
vi.mock("@/lib/booking/bookings-query", () => ({
  readDbNow: h.readDbNowMock,
  queryHostAgenda: h.queryAgendaMock,
}));
vi.mock("@/lib/listing/hours-signal", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/listing/hours-signal")>();
  return { ...actual, loadPublishedListingsMissingHours: h.loadMissingHoursMock };
});
vi.mock("@/lib/host/verification-status", () => ({
  loadHostVerification: h.loadVerificationMock,
}));
vi.mock("@/app/actions/paymongo-connect", () => ({
  startPayoutOnboarding: vi.fn(),
}));

import HostDashboardPage from "@/app/(host)/host/page";

const DB_NOW = new Date("2026-09-09T04:00:00.000Z");

function queueSelectResult(...results: unknown[][]) {
  h.selectResults.splice(0, h.selectResults.length, ...results);
}

beforeEach(() => {
  h.getSessionMock.mockResolvedValue({
    user: {
      id: "host_zero",
      firstName: "Maria",
      email: "maria@example.com",
      emailVerified: true,
      canHost: true,
    },
  });
  h.readDbNowMock.mockResolvedValue(DB_NOW);
  h.queryAgendaMock.mockResolvedValue({ today: [], todayTruncated: false, next: null });
  h.loadMissingHoursMock.mockResolvedValue([]);
  h.loadVerificationMock.mockResolvedValue({
    status: "unverified",
    reason: null,
    suspended: false,
    updatedAt: null,
  });

  h.selectMock.mockImplementation(() => {
    const rows = h.selectResults.shift() ?? [];
    const query = {
      from: vi.fn(() => query),
      innerJoin: vi.fn(() => query),
      where: vi.fn(async () => rows),
    };
    return query;
  });

  // Dashboard selects: non-deleted listings, pending request count, payout row.
  queueSelectResult([], [{ p: 0 }], []);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("the zero-listing host roadmap through the real dashboard composition", () => {
  it("renders the four ordered gates and gives the only advancing control to Step 3", async () => {
    render(await HostDashboardPage());

    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Get ready to take bookings",
    });
    const roadmap = heading.closest("section");
    expect(roadmap).not.toBeNull();

    const steps = within(roadmap as HTMLElement).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(
      steps.map((step) =>
        within(step).getByRole("heading", { level: 3 }).textContent,
      ),
    ).toEqual([
      "Get your account checked",
      "Set up payouts",
      "List a space",
      "FitOut checks your space",
    ]);

    expect(steps.map((step) => step.textContent)).toEqual([
      expect.stringContaining("Step 1 of 4"),
      expect.stringContaining("Step 2 of 4"),
      expect.stringContaining("Step 3 of 4"),
      expect.stringContaining("Step 4 of 4"),
    ]);
    expect(steps[0].textContent).toContain("Current");
    expect(steps[2].textContent).toContain("Current");
    expect(steps[3].textContent).toContain("Next");

    const actions = within(roadmap as HTMLElement).getAllByRole("link");
    expect(actions).toHaveLength(1);
    expect(actions[0].textContent).toBe("Create listing");
    expect(actions[0].getAttribute("href")).toBe("/host/listings/new");
    expect(actions[0].getAttribute("data-variant")).toBe("brand");

    const identity = steps[0].querySelector('[data-verification-owed="unverified"]');
    expect(identity).not.toBeNull();
  });

  it("keeps the existing empty-state copy but removes its duplicate create action", async () => {
    render(await HostDashboardPage());

    const emptyHeading = screen.getByRole("heading", { level: 2, name: "No listings yet" });
    const emptyState = emptyHeading.closest('[data-testid="empty-state"]');
    expect(emptyState?.textContent).toContain(
      "List your space and start earning. We'll walk you through it step by step.",
    );
    expect(within(emptyState as HTMLElement).queryAllByRole("link")).toHaveLength(0);
  });

  it("removes the legacy payout and verification rows from the remaining signals", async () => {
    render(await HostDashboardPage());

    const signals = screen.getByTestId("host-signals");
    expect(signals.querySelector("[data-payout-banner]")).toBeNull();
    expect(signals.querySelector("[data-verification-owed]")).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
