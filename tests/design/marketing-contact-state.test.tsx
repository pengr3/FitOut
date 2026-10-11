// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Contact from "@/app/marketing/contact/page";
import { SUPPORT_EMAIL } from "@/lib/site";
import { SiteFooter } from "@/components/patterns/site-footer";
vi.mock("@/lib/app-origins", () => ({ absoluteMarketingUrl: (path: string) => `https://marketing.example.test${path}`, absolutePublicUrl: (path: string) => `https://app.example.test${path}` }));
vi.mock("@/components/marketing/contact-form", () => ({ ContactForm: () => <form aria-label="Contact inquiry" /> }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("Contact privacy and availability", () => {
  it.each(["preview", "production"])("keeps the form available in %s even when delivery is disabled", (environment) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", environment);
    vi.stubEnv("CONTACT_PRODUCTION_ENABLED", "false");
    vi.stubEnv("RESEND_API_KEY", "");
    const { container } = render(<><Contact /><SiteFooter /></>);
    expect(screen.getByRole("form", { name: "Contact inquiry" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Email FitOut" })).toBeNull();
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.textContent).not.toContain(SUPPORT_EMAIL);
    expect(screen.getByRole("link", { name: "Support" }).getAttribute("href")).toBe("https://marketing.example.test/contact");
    expect(screen.queryByText(/temporarily unavailable/)).toBeNull();
  });
});
