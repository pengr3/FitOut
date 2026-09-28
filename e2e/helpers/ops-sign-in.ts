import type { APIRequestContext, APIResponse } from "@playwright/test";

const OPS_ORIGIN = `http://ops.localhost:${process.env.FITOUT_OPS_E2E_PORT ?? "3000"}`;
const OPS_HOST = new URL(OPS_ORIGIN).host;

/** Sign in through the real ops auth endpoint, respecting its shared per-IP test rate limit. */
export async function signInOps(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<APIResponse> {
  let response: APIResponse | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await request.post(`${OPS_ORIGIN}/api/auth/sign-in/email`, {
      headers: { host: OPS_HOST, origin: OPS_ORIGIN },
      data: { email, password },
      failOnStatusCode: false,
    });
    if (response.status() !== 429 || attempt === 2) return response;

    const retryAfterSeconds = Number(response.headers()["retry-after"]);
    const waitMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? Math.min(65_000, retryAfterSeconds * 1_000 + 1_000)
      : 61_000;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  return response!;
}
