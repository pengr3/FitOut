// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import MarketingLayout, * as layoutModule from "@/app/marketing/layout";
import { SITE_TAGLINE } from "@/lib/site";

vi.mock("@/lib/app-origins", () => ({
  MARKETING_ORIGIN: "https://marketing.example.test",
  absoluteAppUrl: (path: string) => `https://app.example.test${path}`,
}));
afterEach(cleanup);
const destinations = [["Home", "/"], ["Hosts", "/hosts"], ["Players", "/players"], ["About", "/about"], ["FAQ", "/faq"], ["Contact", "/contact"]];

describe("marketing shell", () => {
  it("has the six public destinations in the agreed order", () => {
    render(<MarketingHeader appUrl="https://app.example.test/" />);
    const nav = screen.queryByRole("navigation", { name: "Main navigation" });
    expect(nav, "the public navigation must be present").not.toBeNull();
    expect(within(nav!).getAllByRole("link", { hidden: true }).map((a) => [a.textContent, a.getAttribute("href")])).toEqual(destinations);
  });
  it("keeps Open App independent and in the same tab", () => {
    render(<MarketingHeader appUrl="https://app.example.test/" />);
    const link = screen.getByRole("link", { name: "Open App" });
    expect(link.getAttribute("href")).toBe("https://app.example.test/");
    expect(link.hasAttribute("target")).toBe(false);
  });
  it("opens a disclosure and closes on Escape with trigger focus restored", () => {
    render(<MarketingHeader appUrl="https://app.example.test/" />);
    const trigger = screen.getByRole("button", { name: "Menu" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    const nav = document.getElementById(trigger.getAttribute("aria-controls")!);
    expect(nav?.className).toContain("hidden");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const home = within(nav!).getByRole("link", { name: "Home" });
    home.focus();
    fireEvent.keyDown(home, { key: "Escape" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
  });
  it("closes after choosing a public page and uses shared focus and touch recipes", () => {
    render(<MarketingHeader appUrl="https://app.example.test/" />);
    const trigger = screen.getByRole("button", { name: "Menu" });
    fireEvent.click(trigger);
    const hosts = screen.getByRole("link", { name: "Hosts" });
    fireEvent.click(hosts);
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    for (const control of [trigger, hosts, screen.getByRole("link", { name: "Open App" })]) {
      expect(control.className).toContain("focus-visible:ring-2");
      expect(control.className).toMatch(/(?:min-)?h-11/);
    }
  });
  it("uses marketing metadata authority and app legal links without an email alternative", () => {
    render(<MarketingFooter />);
    expect(screen.getByText(SITE_TAGLINE)).toBeTruthy();
    for (const [label, path] of [["Terms", "/terms"], ["Privacy", "/privacy"]]) {
      const link = screen.getByRole("link", { name: label });
      expect(link.getAttribute("href")).toBe(`https://app.example.test${path}`);
      expect(link.hasAttribute("target")).toBe(false);
    }
    expect(screen.getByRole("link", { name: "Contact" }).getAttribute("href")).toBe("/contact");
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect((layoutModule as { metadata?: { metadataBase?: URL } }).metadata?.metadataBase?.origin).toBe("https://marketing.example.test");
  });
  it("renders children in a session-free shell and keeps origin helpers out of the client", () => {
    render(<MarketingLayout><main>Public page</main></MarketingLayout>);
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("contentinfo")).toBeTruthy();
    expect(screen.getByRole("main").textContent).toBe("Public page");
    for (const file of ["src/app/marketing/layout.tsx", "src/components/marketing/header.tsx", "src/components/marketing/footer.tsx"]) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/(?:@\/lib\/(?:auth|db)|next\/headers|PublicHeader|getSession)/);
      expect(source).not.toMatch(/href=["']\/marketing(?:\/|["'])/);
      if (source.includes('"use client"')) expect(source).not.toContain("@/lib/app-origins");
    }
  });
});
