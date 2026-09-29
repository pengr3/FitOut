// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import HostEarningsError from "@/app/(host)/host/earnings/error";
import HostEarningsLoading from "@/app/(host)/host/earnings/loading";
import { PayoutStateBadge } from "@/components/host/payout-state-badge";
import { PayoutRow } from "@/components/host/payout-row";

afterEach(cleanup);

describe("Court earnings route states", () => {
  it("retries through unstable_retry with neutral copy and no stale total or internal error", () => {
    const retry = vi.fn();
    render(<HostEarningsError error={new Error("provider_secret sentinel")} unstable_retry={retry} />);
    expect(screen.getByText("We couldn't load your earnings. Try again.")).toBeTruthy();
    expect(screen.queryByText(/provider_secret|Pending earnings|Paid out/)).toBeNull();
    const button = screen.getByRole("button", { name: "Try again" });
    expect(button.className).toContain("min-h-11");
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByText("Earnings unavailable")).toBeTruthy();
  });

  it("loads the page shell and row skeleton without totals or a payout control", () => {
    render(<HostEarningsLoading />);
    expect(screen.getByRole("heading", { name: "Earnings" })).toBeTruthy();
    expect(screen.getByText("Loading your earnings")).toBeTruthy();
    expect(screen.queryByText(/Pending earnings|Paid out|Set up payouts|Try again/)).toBeNull();
  });

  it("pairs every visible status with a distinct icon", () => {
    const statuses = ["upcoming", "review", "clearing", "scheduled", "processing", "paid", "refunded", "failed"] as const;
    const icons = new Set<string>();
    for (const status of statuses) {
      const { container, unmount } = render(<PayoutStateBadge status={status} />);
      expect(container.textContent?.length).toBeGreaterThan(2);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
      icons.add(svg?.innerHTML ?? "");
      unmount();
    }
    // The status labels are the primary accessible difference; icons are supplemental.
    expect(icons.size).toBe(statuses.length);
  });

  it("renders long Unicode and markup-looking space titles as text", () => {
    const title = "🏸 Long court <img src=x onerror=alert(1)> 日本語繁體中文";
    const { container } = render(<PayoutRow row={{ bookingId: "b", spaceTitle: title,
      whenLabel: "Oct 2, 2026", grossCents: 200_000, commissionCents: 20_000,
      netCents: 180_000, debitCents: 0, currency: "php", status: "clearing",
      estimated: true, timing: "The guest's payment is confirmed. We're waiting for it to reach FitOut before scheduling your payout." }} />);
    expect(container.textContent).toContain(title);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("Estimated payout");
  });
});
