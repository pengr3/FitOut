// Shared test fixtures/mocks for the auth + profile suites (Plans 02/03/04 import these).
//
// - mockResend       : captures every "sent" email so reset/verify tests can read the link
//                      without real delivery. Use mockResend.lastLink() / .sent().
// - mockCloudinary    : upload_stream resolves a fake { secure_url, public_id } so avatar
//                      upload tests never hit Cloudinary.
// - mockGoogleProvider: a stub Google OAuth profile that arrives email-verified (D-08),
//                      for the "OAuth account is pre-verified" test in Plan 03.
// - mockPayMongo      : stubs the Plan-06 PayMongo Linked-Account calls (createLinkedAccount /
//                      createOnboardingLink) and, critically, a signWebhook(rawBody, secret, ts)
//                      helper that produces a VALID `Paymongo-Signature` header (HMAC-SHA256 over
//                      `${ts}.${rawBody}`) so the webhook tests can sign a body and go green — plus
//                      badSignature() for the 400 path.
// - resetMocks        : clears captured state between tests (called from tests/setup.ts).

import { vi } from "vitest";
import { createHmac } from "node:crypto";

// ---------------------------------------------------------------------------
// Resend mock
// ---------------------------------------------------------------------------
type CapturedEmail = {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
};

const sentEmails: CapturedEmail[] = [];

/**
 * Extract the first http(s) URL from an email body (the reset / verification link).
 * Reset and verification emails embed the link in an <a href="..."> — pull it out so
 * integration tests can follow the flow programmatically.
 */
function extractLink(email: CapturedEmail | undefined): string | null {
  if (!email) return null;
  const body = `${email.html ?? ""} ${email.text ?? ""}`;
  const match = body.match(/https?:\/\/[^\s"'<>)]+/);
  return match ? match[0] : null;
}

export const mockResend = {
  /** Drop-in replacement for the `Resend` class from the `resend` package. */
  Resend: class {
    emails = {
      send: vi.fn(async (payload: CapturedEmail) => {
        sentEmails.push(payload);
        return { data: { id: `mock-email-${sentEmails.length}` }, error: null };
      }),
    };
  },
  /** All emails captured so far, in send order. */
  sent: () => [...sentEmails],
  /** The most recently sent email, or undefined. */
  last: () => sentEmails[sentEmails.length - 1],
  /** The link embedded in the most recently sent email, or null. */
  lastLink: () => extractLink(sentEmails[sentEmails.length - 1]),
  /** Clear captured emails. */
  reset: () => {
    sentEmails.length = 0;
  },
};

// ---------------------------------------------------------------------------
// Cloudinary mock
// ---------------------------------------------------------------------------
const cloudinaryUploads: Array<{ secure_url: string; public_id: string }> = [];
// public_ids passed to uploader.destroy — lets the Plan-04 photo tests assert orphan cleanup.
const cloudinaryDestroys: string[] = [];

export const mockCloudinary = {
  /** Returns a module-shaped object suitable for `vi.mock("cloudinary", ...)`. */
  module: () => {
    const v2 = {
      config: vi.fn(),
      uploader: {
        // Mirror the real upload_stream(options, callback) -> writable-stream shape.
        upload_stream: vi.fn(
          (
            options: { public_id?: string },
            callback: (
              err: unknown,
              res: { secure_url: string; public_id: string }
            ) => void
          ) => {
            const result = {
              secure_url: `https://res.cloudinary.com/mock/image/upload/${
                options?.public_id ?? "avatar"
              }.jpg`,
              public_id: options?.public_id ?? "fitout/avatars/mock",
            };
            return {
              end: (_buffer: Buffer) => {
                cloudinaryUploads.push(result);
                // Defer to mimic async stream completion.
                queueMicrotask(() => callback(null, result));
              },
            };
          }
        ),
        // Mirror uploader.destroy(publicId, opts) -> Promise<{ result }>. Plan-04 removePhoto calls
        // this for orphan cleanup; we capture the public_id so tests can assert it was destroyed.
        destroy: vi.fn(async (publicId: string) => {
          cloudinaryDestroys.push(publicId);
          return { result: "ok" };
        }),
      },
      utils: {
        api_sign_request: vi.fn(() => "mock-signature"),
      },
    };
    return { v2, default: v2 };
  },
  /** All uploads captured so far. */
  uploads: () => [...cloudinaryUploads],
  /** The most recent upload result, or undefined. */
  last: () => cloudinaryUploads[cloudinaryUploads.length - 1],
  /** All public_ids passed to uploader.destroy so far (orphan-cleanup assertions). */
  destroys: () => [...cloudinaryDestroys],
  reset: () => {
    cloudinaryUploads.length = 0;
    cloudinaryDestroys.length = 0;
  },
};

// ---------------------------------------------------------------------------
// Google OAuth provider stub (D-08: OAuth accounts arrive provider-verified)
// ---------------------------------------------------------------------------
export const mockGoogleProvider = {
  id: "google",
  /** A fake Google profile as Better Auth would receive it post-token-exchange. */
  profile: (overrides: Partial<GoogleProfile> = {}): GoogleProfile => ({
    sub: "google-test-sub-123",
    email: "oauth.user@example.com",
    email_verified: true, // D-08 — provider asserts verified email
    name: "OAuth User",
    given_name: "OAuth",
    family_name: "User",
    picture: "https://example.com/avatar.png",
    ...overrides,
  }),
};

export type GoogleProfile = {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
};

// ---------------------------------------------------------------------------
// PayMongo mock (Plan 06 — Linked Accounts onboarding + Paymongo-Signature webhook, D-20)
// ---------------------------------------------------------------------------
// There is no official PayMongo SDK; Plan 06 builds a thin fetch wrapper (src/lib/paymongo.ts). This
// mock stubs the two onboarding calls and, most importantly, reproduces PayMongo's webhook signature
// so the Plan-06 webhook suites can sign a body and exercise the verify + idempotency paths.
//
// Paymongo-Signature header format: `t=<timestamp>,te=<test-mode-sig>,li=<live-mode-sig>`, where each
// sig = HMAC-SHA256(secret, `${timestamp}.${rawBody}`) as hex. We fill te and li with the same
// computed sig so a test can verify in either mode.

/** Compute the raw hex HMAC PayMongo signs (`${timestamp}.${rawBody}`). */
function paymongoSig(rawBody: string, secret: string, timestamp: number | string): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

const ZERO_SIG = "0".repeat(64);

export const mockPayMongo = {
  /** Stub of "create a Linked Account" — returns a deterministic account id (Plan 06 reuses it). */
  createLinkedAccount: vi.fn(async (_email?: string) => ({ id: "acct_test_123" })),
  /** Stub of "mint a hosted onboarding link" — deterministic URL keyed to the account id. */
  createOnboardingLink: vi.fn(async (accountId: string = "acct_test_123") => ({
    url: `https://onboarding.paymongo.test/${accountId}`,
  })),
  /**
   * Phase-5 money-movement stubs (Plan 02) — deterministic returns mirroring the real
   * src/lib/paymongo.ts shapes so Wave-2 plans (03/04/05) can drive the charge / payout / refund /
   * wallet paths without a live PayMongo call. Return shapes match createCheckoutSession /
   * createRefund / createBatchTransfer / listWalletAccounts exactly.
   */
  createCheckoutSession: vi.fn(async (_input?: unknown) => ({
    id: "cs_test_123",
    checkoutUrl: "https://checkout.paymongo.test/cs_test_123",
  })),
  createRefund: vi.fn(async (_input?: unknown) => ({ id: "ref_test_123", status: "pending" })),
  createBatchTransfer: vi.fn(async (_input?: unknown) => ({
    batchId: "batch_tr_123",
    transferId: "tr_test_123",
    status: "pending",
  })),
  listWalletAccounts: vi.fn(async () => [
    { id: "wal_123", accountNumber: "9990001111", accountName: "Host Wallet", status: "activated" },
  ]),
  /**
   * Phase-5 payout-reconcile stub (Plan 05b) — polls a transfer's terminal status. Defaults to a
   * terminal `succeeded` (the Processing→Paid happy path); reconcile tests override per-case with
   * `mockPayMongo.getTransfer.mockResolvedValueOnce({ id, status: "failed" | "pending" | ... })`.
   */
  getTransfer: vi.fn(async (transferId: string) => ({ id: transferId, status: "succeeded" })),
  /**
   * Build a VALID `Paymongo-Signature` header for a raw body + webhook secret. Format:
   * `t=<ts>,te=<sig>,li=<sig>`. Signed payload is `${ts}.${rawBody}` (HMAC-SHA256, hex). Lets the
   * Plan-06 signature test sign a body and assert the handler accepts it (and dedupes by event id).
   */
  signWebhook: (
    rawBody: string,
    secret: string,
    timestamp: number = Math.floor(Date.now() / 1000),
  ): string => {
    const sig = paymongoSig(rawBody, secret, timestamp);
    return `t=${timestamp},te=${sig},li=${sig}`;
  },
  /** Sentinel INVALID signature header (all-zero hex) for the 400 reject path. */
  badSignature: (timestamp: number = Math.floor(Date.now() / 1000)): string =>
    `t=${timestamp},te=${ZERO_SIG},li=${ZERO_SIG}`,
  reset: () => {
    mockPayMongo.createLinkedAccount.mockClear();
    mockPayMongo.createOnboardingLink.mockClear();
    mockPayMongo.createCheckoutSession.mockClear();
    mockPayMongo.createRefund.mockClear();
    mockPayMongo.createBatchTransfer.mockClear();
    mockPayMongo.listWalletAccounts.mockClear();
    mockPayMongo.getTransfer.mockClear();
  },
};

// ---------------------------------------------------------------------------
// Reset everything between tests.
// ---------------------------------------------------------------------------
export function resetMocks() {
  mockResend.reset();
  mockCloudinary.reset();
  mockPayMongo.reset();
}
