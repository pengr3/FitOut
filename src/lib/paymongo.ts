// PayMongo REST client — a thin `fetch` wrapper (there is NO official PayMongo SDK; CLAUDE.md § D-20).
//
// This module is the ONLY place that talks to PayMongo over HTTP. It is deliberately tiny: HTTP Basic
// auth (the secret key as the username, per PayMongo), a JSON `fetch` helper that sends an
// `Idempotency-Key` on POSTs and throws on non-2xx, and the two Platforms / Linked-Accounts calls the
// payout-onboarding action needs (createLinkedAccount + createOnboardingLink). The webhook route does
// its own node-crypto signature verification and does NOT import this client.
//
// FAIL-CLOSED (copied from the src/lib/auth.ts WR-03 boot guard): in PRODUCTION we refuse to boot
// without PAYMONGO_SECRET_KEY rather than silently make unauthenticated calls. In dev/test/build the
// placeholder in .env is tolerated so local setup, the fully-mocked test suite, and `next build` all
// pass — only a real production boot is keyless-fatal.
//
// BETA NOTE: PayMongo Platforms / Linked Accounts is beta / sales-gated. The endpoint paths below wrap
// the documented contract; real hosted onboarding is exercised in MANUAL UAT once PayMongo enables the
// platform on the account. Every test mocks THIS module (tests/helpers/mocks.ts → mockPayMongo), so no
// test depends on a live PayMongo call.

import { randomUUID } from "node:crypto";

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

// Fail-closed at module load — production only (dev/test/build tolerate the .env placeholder).
if (!process.env.PAYMONGO_SECRET_KEY && process.env.NODE_ENV === "production") {
  throw new Error(
    "PAYMONGO_SECRET_KEY is not set. Refusing to boot in production without the PayMongo secret key. " +
      "Set it in the deploy environment (it is the HTTP-Basic username for every PayMongo API call).",
  );
}

/** HTTP Basic auth header — the secret key is the username, empty password (PayMongo convention). */
function authHeader(): string {
  const secret = process.env.PAYMONGO_SECRET_KEY ?? "";
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

type FetchInit = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Idempotency-Key for safe POST retries (PayMongo requirement). */
  idempotencyKey?: string;
};

/**
 * Call the PayMongo REST API with Basic auth + JSON. Sends an Idempotency-Key on POSTs and throws a
 * descriptive Error on any non-2xx (surfacing the first PayMongo error detail when present).
 */
async function paymongoFetch<T>(path: string, init: FetchInit = {}): Promise<T> {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: authHeader(),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (method === "POST") {
    // Every POST carries an Idempotency-Key so a retried create can't duplicate (PayMongo requirement).
    headers["Idempotency-Key"] = init.idempotencyKey ?? randomUUID();
  }

  const res = await fetch(`${PAYMONGO_BASE}${path}`, {
    method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const detail =
      (json as { errors?: Array<{ detail?: string }> })?.errors?.[0]?.detail ??
      res.statusText;
    throw new Error(`PayMongo ${method} ${path} failed (${res.status}): ${detail}`);
  }
  return json as T;
}

export type LinkedAccount = { id: string };
export type OnboardingLink = { url: string };

/**
 * Create a PayMongo Linked Account (Platforms / Linked Accounts — the hosted-KYC child/merchant). Call
 * this AT MOST ONCE per host; the caller (paymongo-connect.ts) guards create-once with a row lock and
 * persists the returned id. A stable Idempotency-Key keyed on the host email makes an accidental
 * double-POST a no-op on PayMongo's side as a second line of defense.
 */
export async function createLinkedAccount({
  email,
}: {
  email: string;
}): Promise<LinkedAccount> {
  const json = await paymongoFetch<{ data: { id: string } }>("/linked_accounts", {
    method: "POST",
    idempotencyKey: `linked-account:${email}`,
    body: { data: { attributes: { type: "linked_account", email } } },
  });
  return { id: json.data.id };
}

/**
 * Mint a hosted onboarding redirect link for a Linked Account (the Stripe-Account-Links equivalent).
 * Links are single-use / expiring — the caller re-mints one on EVERY click and on the refresh_url page;
 * never cache the URL. A fresh Idempotency-Key per call keeps each mint distinct.
 */
export async function createOnboardingLink({
  accountId,
  returnUrl,
  refreshUrl,
}: {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<OnboardingLink> {
  const json = await paymongoFetch<{ data: { attributes: { url: string } } }>(
    "/linked_accounts/onboarding_links",
    {
      method: "POST",
      idempotencyKey: `onboarding-link:${accountId}:${randomUUID()}`,
      body: {
        data: {
          attributes: {
            account_id: accountId,
            return_url: returnUrl,
            refresh_url: refreshUrl,
          },
        },
      },
    },
  );
  return { url: json.data.attributes.url };
}
