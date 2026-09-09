// @vitest-environment jsdom

import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";

const h = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  selectMock: vi.fn(),
  getSessionMock: vi.fn(),
  loadVerificationMock: vi.fn(),
  loadMissingHoursMock: vi.fn(),
  readDbNowMock: vi.fn(),
  queryAgendaMock: vi.fn(),
  startPayoutOnboardingMock: vi.fn(),
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
  startPayoutOnboarding: h.startPayoutOnboardingMock,
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

  it("keeps one responsive semantic tree with visible state text and touch-sized actions", async () => {
    render(await HostDashboardPage());

    const roadmap = screen
      .getByRole("heading", { level: 2, name: "Get ready to take bookings" })
      .closest("section");
    const list = within(roadmap as HTMLElement).getByRole("list");
    expect(list.className).toContain("grid-cols-1");
    expect(list.className).toContain("sm:grid-cols-2");
    expect(list.className).toContain("gap-4");
    expect(list.className).toContain("sm:gap-6");

    const steps = within(list).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    for (const step of steps) {
      expect(within(step).getByRole("heading", { level: 3 })).toBeTruthy();
      expect(step.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
      expect(step.textContent).toMatch(/Done|Current|Waiting|Not passed|Paused|Next/);
    }

    const action = within(list).getByRole("link", { name: "Create listing" });
    expect(action.className.split(/\s+/)).toContain("h-11");
  });

  it("replaces the roadmap with one compact readiness receipt in the same section slot", async () => {
    queueSelectResult(
      [{ id: "listing_ready", status: "published", reviewState: "approved" }],
      [{ p: 0 }],
      [
        {
          paymongoAccountId: "acct_ready",
          payoutsEnabled: true,
          activationStatus: "activated",
        },
      ],
    );
    h.loadVerificationMock.mockResolvedValue({
      status: "approved",
      reason: null,
      suspended: false,
      updatedAt: DB_NOW,
    });

    render(await HostDashboardPage());

    const readyHeading = screen.getByRole("heading", {
      level: 2,
      name: "Ready to take bookings",
    });
    const readySection = readyHeading.closest("section");
    expect(readySection).not.toBeNull();
    expect(readySection?.textContent).toContain(
      "You have a listing that guests can book.",
    );
    expect(within(readySection as HTMLElement).queryByRole("list")).toBeNull();
    expect(
      screen.queryByRole("heading", { level: 2, name: "Get ready to take bookings" }),
    ).toBeNull();
  });
});

describe("payout onboarding recovery", () => {
  it("keeps a rejected payout action inline and available for retry without navigating", async () => {
    queueSelectResult(
      [{ id: "listing_draft", status: "draft", reviewState: "pending" }],
      [{ p: 0 }],
      [],
    );
    h.loadVerificationMock.mockResolvedValue({
      status: "approved",
      reason: null,
      suspended: false,
      updatedAt: DB_NOW,
    });
    h.startPayoutOnboardingMock.mockRejectedValueOnce(
      new Error("server action transport failed"),
    );
    const hrefBefore = window.location.href;

    render(await HostDashboardPage());

    const payoutAction = screen.getByRole("button", { name: "Set up payouts" });
    fireEvent.click(payoutAction);

    expect(
      await screen.findByText("We couldn't start payout setup. Please try again."),
    ).toBeVisible();
    expect(window.location.href).toBe(hrefBefore);
    expect(screen.getByRole("button", { name: "Set up payouts" })).toBeEnabled();
    expect(h.startPayoutOnboardingMock).toHaveBeenCalledTimes(1);
  });
});
