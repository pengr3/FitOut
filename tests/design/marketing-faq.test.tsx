// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Faq, { metadata } from "@/app/marketing/faq/page";

vi.mock("@/lib/app-origins", () => ({
  absoluteAppUrl: (path: string) => `https://app.example.test${path}`,
  absoluteMarketingUrl: (path: string) => `https://marketing.example.test${path}`,
}));
afterEach(cleanup);
describe("stacked marketing FAQ", () => {
  it("places Players before Hosts on one page", () => {
    render(<Faq />);
    expect(screen.queryAllByRole("heading", { level: 2 }).map((h) => h.textContent), "two audience sections in Players-first order").toEqual(["Players", "Hosts"]);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole("tablist")).toBeNull();
    for (const audience of ["Players", "Hosts"]) {
      const section = screen.getByRole("region", { name: audience });
      expect(section.querySelectorAll("details").length).toBeGreaterThanOrEqual(6);
    }
  });
  it("opens and closes every question with Enter and Space", () => {
    render(<Faq />);
    const summaries = document.querySelectorAll("summary");
    expect(summaries.length).toBeGreaterThanOrEqual(12);
    for (const summary of summaries) {
      const details = summary.parentElement as HTMLDetailsElement;
      expect(details.open).toBe(false);
      summary.focus();
      expect(document.activeElement).toBe(summary);
      fireEvent.keyDown(summary, { key: "Enter" });
      expect(details.open).toBe(true);
      fireEvent.keyDown(summary, { key: " " });
      expect(details.open).toBe(false);
      expect(summary.className).toContain("focus-visible:ring-ring");
    }
  });
  it("explains sessions, group bookings and genuine readiness limits", () => {
    render(<Faq />);
    const players = screen.getByRole("region", { name: "Players" });
    const hosts = screen.getByRole("region", { name: "Hosts" });
    expect(players.textContent).toMatch(/browse without signing in/i);
    expect(players.textContent).toMatch(/available date and session/i);
    expect(players.textContent).toMatch(/exclusive booking reserves the space/i);
    expect(players.textContent).toMatch(/open.capacity.*admissions/i);
    expect(players.textContent).toMatch(/confirmed exclusive booking.*invite/i);
    expect(players.textContent).toMatch(/refund.*before.*confirm/i);
    expect(hosts.textContent).toMatch(/email verification.*payout setup.*host approval.*listing review.*publication.*operating hours/i);
    expect(hosts.textContent).toMatch(/does not guarantee/i);
    expect(hosts.textContent).toMatch(/settlement.*available funds/i);
    expect(hosts.textContent).toMatch(/dispatch.*bank.*arrival/i);
    expect(hosts.textContent).toMatch(/on hold/i);
    expect(screen.getByRole("main").textContent).not.toMatch(/all hosts are verified|guaranteed payout|paid within 24 hours|instant approval/i);
  });
  it("links actual app support and legal destinations and marketing Contact", () => {
    render(<Faq />);
    const main = screen.getByRole("main");
    const links = within(main).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("https://app.example.test/bookings");
    expect(links).toContain("https://app.example.test/terms");
    expect(links).toContain("https://app.example.test/privacy");
    expect(links).toContain("https://app.example.test/start-hosting");
    expect(links).toContain("/contact");
    expect(metadata.alternates?.canonical).toBe("https://marketing.example.test/faq");
  });
});
