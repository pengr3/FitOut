import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const publicOriginCallers = [
  "src/lib/notifications.ts",
  "src/lib/payments/confirm-booking-payment.ts",
  "src/inngest/functions/request-expiry.ts",
  "src/inngest/functions/reminders.ts",
] as const;

const bookingAndGroupCallers = [
  "src/app/(app)/bookings/[id]/group/page.tsx",
  "src/app/actions/booking.ts",
  "src/app/actions/cancel-booking.ts",
  "src/app/actions/re-request.ts",
] as const;

async function publicUrlFor(environment: Record<string, string>, pathname: `/${string}`) {
  vi.resetModules();
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  const { absolutePublicUrl } = await import("@/lib/app-origins");
  return absolutePublicUrl(pathname);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("runtime public-origin callers", () => {
  it("uses the canonical production authority", async () => {
    await expect(
      publicUrlFor(
        {
          BETTER_AUTH_URL: "https://fitout.live",
          NEXT_PUBLIC_APP_URL: "",
          OPS_APP_URL: "https://ops.fitout.live",
          VERCEL: "",
          VERCEL_ENV: "",
          VERCEL_URL: "",
        },
        "/bookings/booking-123?source=notification",
      ),
    ).resolves.toBe("https://fitout.live/bookings/booking-123?source=notification");
  });

  it("uses the exact Preview authority", async () => {
    await expect(
      publicUrlFor(
        {
          BETTER_AUTH_URL: "",
          NEXT_PUBLIC_APP_URL: "",
          OPS_APP_URL: "http://ops.localhost:3000",
          VERCEL: "1",
          VERCEL_ENV: "preview",
          VERCEL_URL: "fitout-origin-preview.vercel.app",
        },
        "/bookings/booking-123?source=notification",
      ),
    ).resolves.toBe(
      "https://fitout-origin-preview.vercel.app/bookings/booking-123?source=notification",
    );
  });

  it("keeps every notification and scheduled-email caller on the shared authority", () => {
    for (const caller of publicOriginCallers) {
      const source = readFileSync(join(process.cwd(), caller), "utf8");
      expect(source.includes('from "@/lib/app-origins"'), caller).toBe(true);
      expect(source.includes("absolutePublicUrl("), caller).toBe(true);
      expect(source.match(/process\.env\.(?:BETTER_AUTH_URL|NEXT_PUBLIC_APP_URL)/), caller).toBeNull();
      expect(source.includes("http://localhost:3000"), caller).toBe(false);
    }
  });

  it("keeps booking, cancellation, request, and group links on the shared authority", () => {
    for (const caller of bookingAndGroupCallers) {
      const source = readFileSync(join(process.cwd(), caller), "utf8");
      expect(source.includes('from "@/lib/app-origins"'), caller).toBe(true);
      expect(source.includes("absolutePublicUrl("), caller).toBe(true);
      expect(source.match(/process\.env\.(?:BETTER_AUTH_URL|NEXT_PUBLIC_APP_URL)/), caller).toBeNull();
      expect(source.includes("http://localhost:3000"), caller).toBe(false);
    }
  });
});
