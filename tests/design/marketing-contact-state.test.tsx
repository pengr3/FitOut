// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Contact from "@/app/marketing/contact/page";
import { SUPPORT_EMAIL } from "@/lib/site";
vi.mock("@/lib/app-origins", () => ({ absoluteMarketingUrl: (path: string) => `https://marketing.example.test${path}` }));
vi.mock("@/components/marketing/contact-form", () => ({ ContactForm: () => <form aria-label="Contact inquiry" /> }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("Contact availability", () => {
  it("offers the existing email when deployed delivery is disabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONTACT_PRODUCTION_ENABLED", "false");
    render(<Contact />);
    expect(screen.queryByRole("form")).toBeNull();
    expect(screen.getByRole("link", { name: "Email FitOut" }).getAttribute("href")).toBe(`mailto:${SUPPORT_EMAIL}`);
    expect(screen.getByText(/contact form is temporarily unavailable/)).toBeTruthy();
  });
  it("keeps the form when deployed sending is configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("CONTACT_PRODUCTION_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "inert-unit-test-marker");
    render(<Contact />);
    expect(screen.getByRole("form", { name: "Contact inquiry" })).toBeTruthy();
    expect(screen.queryByText(/temporarily unavailable/)).toBeNull();
  });
});
