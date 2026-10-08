import { afterEach, describe, expect, it, vi } from "vitest";
import { mockResend } from "../helpers/mocks";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function consumers(preview = false) {
  vi.resetModules();
  const app = preview ? "https://branch.example.vercel.app" : "https://app.example.test";
  const ops = preview ? "https://ops-preview.example.test" : "https://ops.example.test";
  for (const [key, value] of Object.entries({
    NODE_ENV: "production", BETTER_AUTH_URL: app, NEXT_PUBLIC_APP_URL: app,
    MARKETING_APP_URL: preview ? "https://marketing-preview.example.test" : "https://example.test",
    OPS_APP_URL: ops, VERCEL_ENV: preview ? "preview" : "production",
    VERCEL_URL: preview ? "branch.example.vercel.app" : "", MARKETING_PREVIEW_URL: "",
    RESEND_API_KEY: "re_test_mock_key", EMAIL_FROM: "FitOut <sender@example.test>",
  })) vi.stubEnv(key, value);
  const { metadata } = await import("@/app/layout");
  const email = await import("@/lib/email");
  const origins = await import("@/lib/app-origins");
  const { SUPPORT_EMAIL } = await import("@/lib/site");
  return { app, ops, metadata, email, origins, SUPPORT_EMAIL };
}

describe("actual application metadata and transactional email origins", () => {
  it.each([false, true])("renders metadata and real email CTAs with isolated preview=%s", async (preview) => {
    const { app, metadata, email, origins, SUPPORT_EMAIL } = await consumers(preview);
    expect(metadata.metadataBase?.toString()).toBe(app + "/");
    await email.sendBookingConfirmed("booker@example.test", "Court", "Tomorrow", "FIT-TEST", origins.absolutePublicUrl("/bookings/id"), null);
    await email.sendRequestDeclined("booker@example.test", "Court", "Tomorrow");
    await email.sendResetPassword("booker@example.test", origins.absolutePublicUrl("/api/auth/reset-password/opaque?callbackURL=%2Freset-password"));
    for (const sent of mockResend.sent()) {
      const links = [...sent.html!.matchAll(/href="(https?:[^\"]+)"/g)].map((match) => match[1].replaceAll("&amp;", "&"));
      expect(links.length).toBeGreaterThan(0);
      for (const href of links) {
        expect(new URL(href).origin).toBe(app);
        expect(sent.text).toContain(href);
      }
      expect(sent.from).toBe("FitOut <sender@example.test>");
      expect((sent as unknown as { replyTo: string }).replyTo).toBe(SUPPORT_EMAIL);
      expect(sent.html).not.toContain("localhost");
    }
    for (const path of ["/bookings/id", "/bookings/id/group", "/host/requests", "/terms", "/privacy"] as const) {
      expect(origins.absolutePublicUrl(path)).toBe(app + path);
    }
    const { renderEmail } = await import("@/lib/email-shell");
    const rendered = renderEmail({ heading: "Group and reminder", paragraphs: [], cta: { label: "View details", href: origins.absolutePublicUrl("/bookings/id/group") } });
    expect(rendered.text).toContain(app + "/bookings/id/group");
    expect(rendered.html).toContain("mailto:" + SUPPORT_EMAIL);
  });
  it.each([false, true])("retains isolated ops invitation origin with preview=%s", async (preview) => {
    const { ops, email, origins } = await consumers(preview);
    expect(await email.sendStaffInviteEmail("staff@example.test", origins.absoluteOpsUrl("/invite/opaque"))).toEqual({ delivered: true, transport: "resend" });
    expect(mockResend.last()?.html).toContain(ops + "/invite/opaque");
    expect(mockResend.last()?.text).toContain(ops + "/invite/opaque");
  });
});
