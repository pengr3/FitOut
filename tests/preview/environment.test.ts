import { afterEach, describe, expect, it, vi } from "vitest";
import { assertPreviewDatabase, assertPreviewPaymentKey, PREVIEW_DATABASE_HOST, previewRecipientAllowed } from "@/lib/preview-environment";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

describe("Preview isolation", () => {
  it("accepts only the inventoried sandbox direct and pooled endpoints", () => {
    for (const host of [PREVIEW_DATABASE_HOST, PREVIEW_DATABASE_HOST.replace(".c-4", "-pooler.c-4")]) {
      const url = `postgresql://tester:private@${host}/neondb?sslmode=require`;
      expect(assertPreviewDatabase(url)).toBe(url);
    }
  });
  it.each([undefined, "", "not-a-url", "postgresql://user:pass@ep-aged-bonus-b3n08ajs.c-4.ap-southeast-1.aws.neon.tech/neondb",
    `postgresql://user:pass@${PREVIEW_DATABASE_HOST}.attacker.test/neondb`,
    `postgresql://user:pass@${PREVIEW_DATABASE_HOST}/other`, `https://${PREVIEW_DATABASE_HOST}/neondb`,
    `postgresql://user:pass@${PREVIEW_DATABASE_HOST}:5544/neondb`])("refuses a different target before connecting", (url) => {
    expect(() => assertPreviewDatabase(url)).toThrow();
  });
  it.each(["sk_live_123", "", "placeholder", "pk_test_123"]) ("rejects non-test payment credentials", (key) => {
    expect(() => assertPreviewPaymentKey(key)).toThrow(/test key/);
  });
  it("allows an actual test-key shape", () => {
    expect(() => assertPreviewPaymentKey("sk_test_Abc123")).not.toThrow();
  });
  it("sends preview email only to an exact tester address", () => {
    expect(previewRecipientAllowed("Tester@example.com", "other@example.com, tester@example.com")).toBe(true);
    for (const to of ["customer@example.com", "tester@example.com.attacker.test", "Tester <tester@example.com>", "tester@example.com, customer@example.com"]) {
      expect(previewRecipientAllowed(to, "tester@example.com")).toBe(false);
    }
    expect(previewRecipientAllowed("tester@example.com", undefined)).toBe(false);
  });
  it("the real payment client refuses a live key without a network request", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_live_NeverSend");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const { getCheckoutSession } = await import("@/lib/paymongo");
    await expect(getCheckoutSession("cs_preview")).rejects.toThrow(/Live keys are refused/);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("the separate Contact alert transport also refuses a non-tester recipient",async()=>{
    vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("CONTACT_ALERT_EMAIL","ops@example.com");
    vi.stubEnv("RESEND_API_KEY","re_fake");vi.stubEnv("PREVIEW_EMAIL_RECIPIENTS","tester@example.com");
    const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
    const {sendContactControlAlert}=await import("@/lib/contact-alert-mail");
    await expect(sendContactControlAlert({id:"preview",kind:"global_budget",observedAt:"2026-10-21T00:00:00Z"})).rejects.toThrow("allowlisted tester");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("the real payment client sends test credentials to PayMongo", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("PAYMONGO_SECRET_KEY", "sk_test_Allowed123");
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{id:"cs_preview",attributes:{status:"active"}}}),{status:200}));
    vi.stubGlobal("fetch", fetch);
    const { getCheckoutSession } = await import("@/lib/paymongo");
    await expect(getCheckoutSession("cs_preview")).resolves.toMatchObject({status:"active"});
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe("https://api.paymongo.com/v1/checkout_sessions/cs_preview");
  });
});
