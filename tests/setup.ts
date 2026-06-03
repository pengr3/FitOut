// Global Vitest setup — runs before every test file (see vitest.config.ts setupFiles).
//
// 1. Loads .env.local so DATABASE_URL and friends are available to integration tests.
//    Next.js loads .env.local automatically at runtime, but Vitest does not, so we
//    load it here explicitly.
// 2. Registers the shared Resend/Cloudinary mocks (tests/helpers/mocks.ts) so the
//    Plan 02/03/04 auth + profile tests never hit real email / image services.

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { afterEach, vi } from "vitest";
import { mockResend, mockCloudinary, resetMocks } from "./helpers/mocks";

// Load .env.local first, then .env as a fallback (does not override already-set vars).
loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

// Provide a deterministic test DATABASE_URL fallback if none is set, so integration
// helpers can still build a connection string against the local Docker Postgres.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://fitout:fitout@localhost:5432/fitout";
}

// --- Module mocks shared across the suite ---------------------------------
// Resend: capture sent emails instead of delivering them. Tests read the last
// reset/verification link via mockResend.lastLink().
vi.mock("resend", () => ({ Resend: mockResend.Resend }));

// Cloudinary: resolve a fake { secure_url, public_id } from upload_stream.
vi.mock("cloudinary", () => mockCloudinary.module());

// Reset captured state between tests so assertions don't leak across files.
afterEach(() => {
  resetMocks();
});
