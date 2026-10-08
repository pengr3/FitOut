// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import MarketingAbout, { metadata } from "@/app/marketing/about/page";

vi.mock("@/lib/app-origins", () => ({ absoluteMarketingUrl: (path: string) => `https://marketing.example.test${path}` }));
afterEach(cleanup);

describe("marketing About", () => {
  it("connects player plans and host spaces through real actions", () => {
    render(<MarketingAbout />);
    const main = screen.getByRole("main");
    expect(within(main).queryAllByRole("heading", { level: 1 }), "About needs one clear explanation heading").toHaveLength(1);
    expect(main.textContent).toMatch(/game with friends/);
    expect(main.textContent).toMatch(/solo workout/);
    expect(main.textContent).toMatch(/practice/);
    expect(main.textContent).toMatch(/courts, gyms and studios/);
    expect(main.textContent).toMatch(/check availability/);
    expect(main.textContent).toMatch(/discoverable and bookable/);
    expect(main.textContent).toMatch(/set availability and manage bookings/);
    expect(main.textContent).toMatch(/checks/);
    expect(main.textContent).toMatch(/bridg/i);
    expect(main.textContent).not.toMatch(/founded|launched in|thousands|millions|guaranteed|trusted by|five.star/i);
  });
  it("keeps audience destinations and its own canonical", () => {
    render(<MarketingAbout />);
    expect(screen.getByRole("link", { name: "Explore as a player" }).getAttribute("href")).toBe("/players");
    expect(screen.getByRole("link", { name: "Get to know hosting" }).getAttribute("href")).toBe("/hosts");
    expect(screen.getByRole("link", { name: "Contact us" }).getAttribute("href")).toBe("/contact");
    expect(metadata.alternates?.canonical).toBe("https://marketing.example.test/about");
  });
});
