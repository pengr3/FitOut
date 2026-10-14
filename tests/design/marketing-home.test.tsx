// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Home, * as homeModule from "@/app/marketing/page";
import manifest from "../../public/marketing/screenshots/manifest.json";

vi.mock("@/lib/app-origins", () => ({ absoluteMarketingUrl: (path: string) => `https://marketing.example.test${path}` }));
vi.mock("next/image", () => ({ default: ({ fill, preload, unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; preload?: boolean; unoptimized?: boolean }) => { void fill; void preload; void unoptimized; return React.createElement("img", props); } }));
afterEach(cleanup);

describe("photo-led Court marketing Home", () => {
  it("has one headline and both audience entries", () => {
    render(<Home />);
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Good plans need a place."]);
    expect(screen.getByRole("link", { name: "I want to play" }).getAttribute("href")).toBe("/players");
    expect(screen.getByRole("link", { name: "I have a space" }).getAttribute("href")).toBe("/hosts");
    expect(screen.getByRole("main").id).toBe("main-content");
  });
  it("shows the real populated app capture with matching dimensions", () => {
    render(<Home />);
    const image = screen.getByAltText(/real FitOut app/);
    expect(image.getAttribute("src")).toBe(manifest.captures.search.path);
    expect(image.getAttribute("width")).toBe(String(manifest.captures.search.width));
    expect(image.getAttribute("height")).toBe(String(manifest.captures.search.height));
    for (const name of ["Courts", "Gyms", "Studios"]) expect(screen.getByRole("heading", { name })).toBeTruthy();
  });
  it("omits internal capture disclaimers and keeps the visible marketing canonical", () => {
    render(<Home />);
    expect(document.body.textContent).not.toMatch(/Demo app screens|providers|guaranteed|thousands|trusted by|payouts are live/i);
    expect(homeModule.metadata.alternates?.canonical).toBe("https://marketing.example.test/");
  });
});
