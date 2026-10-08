// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Hosts, * as hostsModule from "@/app/marketing/hosts/page";
import Players, * as playersModule from "@/app/marketing/players/page";

vi.mock("@/lib/app-origins", () => ({
  absoluteAppUrl: (path: string) => `https://app.example.test${path}`,
  absoluteMarketingUrl: (path: string) => `https://marketing.example.test${path}`,
}));
vi.mock("next/image", () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement("img", props) }));
afterEach(cleanup);
const manifest = JSON.parse(readFileSync("public/marketing/screenshots/manifest.json", "utf8"));

describe("honest marketing audience journeys", () => {
  it("presents exactly four numbered host steps with the approved captures", () => {
    render(<Hosts />);
    const list = screen.queryByRole("list", { name: "Host setup steps" });
    expect(list, "four illustrated host steps must be present").not.toBeNull();
    expect(list!.tagName).toBe("OL");
    const steps = within(list!).getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps.map((step) => within(step).getByRole("heading", { level: 3 }).textContent)).toEqual(["Create your account", "Complete verification and payout setup", "Prepare your listing", "Become bookable"]);
    expect(steps.map((step) => within(step).getByRole("img").getAttribute("src"))).toEqual(["account", "verification", "listing", "bookable"].map((name) => manifest.captures[name].path));
  });
  it("presents exactly three player steps from anonymous search to unpaid review", () => {
    render(<Players />);
    const list = screen.getByRole("list", { name: "Player booking steps" });
    expect(list.tagName).toBe("OL");
    const steps = within(list).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps.map((step) => within(step).getByRole("heading", { level: 3 }).textContent)).toEqual(["Find a space", "Choose an available session", "Book your session"]);
    expect(steps.map((step) => within(step).getByRole("img").getAttribute("src"))).toEqual(["search", "session", "booking"].map((name) => manifest.captures[name].path));
    expect(screen.getByText(/Browse before signing in/)).toBeTruthy();
    expect(screen.getByText(/^Choose your activity, location and group size/)).toBeTruthy();
    expect(screen.getByText(/Sign in or create an account when needed to book/)).toBeTruthy();
    expect(screen.getByText(/before payment; this is not a confirmed booking/)).toBeTruthy();
  });
  it.each([
    ["hosts", Hosts, hostsModule, "Start hosting", "/start-hosting"],
    ["players", Players, playersModule, "Find a space", "/"],
  ] as const)("%s uses checked same-tab app entry and visible marketing canonical", (path, Page, pageModule, label, appPath) => {
    render(<Page />);
    const link = screen.getByRole("link", { name: label });
    expect(link.getAttribute("href")).toBe(`https://app.example.test${appPath}`);
    expect(link.hasAttribute("target")).toBe(false);
    expect(link.className).toContain("h-11");
    expect(link.className).toContain("focus-visible:ring-2");
    expect((pageModule as { metadata?: { alternates?: { canonical?: string } } }).metadata?.alternates?.canonical).toBe(`https://marketing.example.test/${path}`);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("main").id).toBe("main-content");
  });
  it("explains readiness and review without approval or payment promises", () => {
    render(<Hosts />);
    expect(screen.getByText(/Confirm your payout recipient details/)).toBeTruthy();
    expect(screen.getByText(/does not guarantee approval or payment release/)).toBeTruthy();
    expect(screen.getByText(/email verification, payout setup, host approval, listing review/)).toBeTruthy();
    expect(screen.getByText(/existing edit wizard/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/instantly bookable|all hosts are verified|guaranteed payouts|approved immediately/i);
  });
  it.each([Hosts, Players])("renders real-dimension accessible images in a server-only step composition", (Page) => {
    render(<Page />);
    for (const image of screen.getAllByRole("img")) {
      const entry = Object.values(manifest.captures).find((capture) => (capture as { path: string }).path === image.getAttribute("src")) as { width: number; height: number };
      expect(entry).toBeTruthy();
      expect(image.getAttribute("width")).toBe(String(entry.width));
      expect(image.getAttribute("height")).toBe(String(entry.height));
      expect(image.getAttribute("alt")?.length).toBeGreaterThan(30);
      expect(image.getAttribute("sizes")).toBeTruthy();
      expect(image.getAttribute("loading")).toBe("lazy");
    }
    const source = readFileSync("src/components/marketing/audience-steps.tsx", "utf8");
    expect(source).not.toContain('"use client"');
    expect(source).toContain("text-heading");
    expect(source).toContain("text-body");
    expect(source).not.toMatch(/text-\[(?:\d|#)|(?:bg|text)-(?:red|orange|gray|slate)-|text-[2-9]xl/);
  });
});
