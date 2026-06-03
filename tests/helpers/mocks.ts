// Shared test fixtures/mocks for the auth + profile suites (Plans 02/03/04 import these).
//
// - mockResend       : captures every "sent" email so reset/verify tests can read the link
//                      without real delivery. Use mockResend.lastLink() / .sent().
// - mockCloudinary    : upload_stream resolves a fake { secure_url, public_id } so avatar
//                      upload tests never hit Cloudinary.
// - mockGoogleProvider: a stub Google OAuth profile that arrives email-verified (D-08),
//                      for the "OAuth account is pre-verified" test in Plan 03.
// - resetMocks        : clears captured state between tests (called from tests/setup.ts).

import { vi } from "vitest";

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
  reset: () => {
    cloudinaryUploads.length = 0;
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
// Reset everything between tests.
// ---------------------------------------------------------------------------
export function resetMocks() {
  mockResend.reset();
  mockCloudinary.reset();
}
