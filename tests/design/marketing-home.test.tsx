// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Home, * as homeModule from "@/app/marketing/page";

vi.mock("@/lib/app-origins", () => ({
  absoluteAppUrl: (path: string) => `https://app.example.test${path}`,
  absoluteMarketingUrl: (path: string) => `https://marketing.example.test${path}`,
}));
// Preserve image attributes in jsdom without Next's optimizer rewriting sources.
vi.mock("next/image", () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement("img", props) }));
afterEach(cleanup);
const manifest = JSON.parse(readFileSync("public/marketing/screenshots/manifest.json", "utf8"));

describe("Court shared-audience Home", () => {
  it("shows balanced actual search and host setup captures", () => {
    render(<Home />);
    const images = screen.queryAllByRole("img");
    expect(images.map((img) => img.getAttribute("src"))).toEqual([manifest.captures.search.path, manifest.captures.verification.path]);
    for (const [index, name] of ["search", "verification"].entries()) {
      expect(images[index].getAttribute("width")).toBe(String(manifest.captures[name].width));
      expect(images[index].getAttribute("height")).toBe(String(manifest.captures[name].height));
      expect(images[index].getAttribute("alt")?.length).toBeGreaterThan(30);
      expect(images[index].getAttribute("sizes")).toBeTruthy();
    }
    expect(images[0].closest("figure")?.parentElement?.className).toContain("md:grid-cols-2");
  });
  it("has one centered headline and equally prominent marketing audience entries", () => {
    render(<Home />);
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Good plans need a place."]);
    expect(screen.getByRole("heading", { level: 1 }).parentElement?.className).toContain("text-center");
    const player = screen.getByRole("link", { name: "I want to play" });
    const host = screen.getByRole("link", { name: "I have a space" });
    expect(player.getAttribute("href")).toBe("/players");
    expect(host.getAttribute("href")).toBe("/hosts");
    expect(player.className).toBe(host.className);
    expect(player.className).toContain("h-11");
    expect(player.className).toContain("focus-visible:ring-2");
    expect(document.querySelector('a[href^="https://app."]')).toBeNull();
  });
  it("explains both audiences honestly and canonicalizes the visible marketing root", () => {
    render(<Home />);
    expect(screen.getByText(/Find a court, gym or studio/)).toBeTruthy();
    expect(screen.getByText(/Demo app screens/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/guaranteed|instant approval|thousands|trusted by|payouts are live/i);
    expect((homeModule as { metadata?: { alternates?: { canonical?: string } } }).metadata?.alternates?.canonical).toBe("https://marketing.example.test/");
    expect(screen.getByRole("main").id).toBe("main-content");
  });
  it("retains Court semantic type and approved local images without client code", () => {
    const source = readFileSync("src/app/marketing/page.tsx", "utf8");
    expect(source).not.toContain('"use client"');
    expect(source).toContain("text-display");
    expect(source).toContain("text-body");
    expect(source).not.toMatch(/text-\[(?:\d|#)|(?:bg|text)-(?:red|orange|gray|slate)-|text-[2-9]xl/);
    expect(source).not.toContain("/marketing/players");
    expect(source).not.toContain("/marketing/hosts");
  });
});
