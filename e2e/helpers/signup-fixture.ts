import type { APIRequestContext, APIResponse } from "@playwright/test";

// All synthetic actors share the runner IP. Respect the real signup limiter:
// one retry only, only on429 with a valid cooldown of at most one minute.
export async function signUpFixture(request: APIRequestContext, data: {
  email: string; password: string; name: string; firstName: string; intent: "book" | "host";
}, onCooldown: (waitMs: number) => void): Promise<APIResponse> {
  const send = () => request.post("/api/auth/sign-up/email", { data, failOnStatusCode: false });
  const response = await send();
  if (response.status() !== 429) return response;
  // Better Auth 1.6 emits X-Retry-After; retain standard-header support too.
  const headers = response.headers();
  const seconds = Number(headers["retry-after"] ?? headers["x-retry-after"]);
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60) return response;
  const waitMs = Math.min(60_000, seconds * 1_000 + 1_000);
  onCooldown(waitMs);
  console.log(`[test-auth] signup429; respecting Retry-After for ${waitMs}ms before one retry.`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  return send();
}
