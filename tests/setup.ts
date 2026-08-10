// Global Vitest setup — runs before every test file (see vitest.config.ts setupFiles).
//
// 1. Loads .env.local so the app's env (credentials, host, feature config) is available to
//    integration tests. Next.js loads .env.local automatically at runtime, but Vitest does not, so
//    we load it here explicitly.
// 2. FORCES DATABASE_URL onto the suite's OWN database (see the block below) — the suite supplies
//    its own database rather than borrowing dev's.
// 3. Registers the shared Resend/Cloudinary mocks (tests/helpers/mocks.ts) so the
//    Plan 02/03/04 auth + profile tests never hit real email / image services.

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { afterEach, vi } from "vitest";
import { mockResend, mockCloudinary, resetMocks } from "./helpers/mocks";
import { testDatabaseUrl } from "./helpers/test-db-url";

// Load .env.local first, then .env as a fallback (does not override already-set vars).
loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

// THE SUITE SUPPLIES ITS OWN DATABASE, AND THIS ASSIGNMENT DELIBERATELY OVERRIDES ANY INHERITED
// `DATABASE_URL` — including the one `.env.local` just supplied two lines above. That is the point,
// and it is a REVERSAL of the previous `if (!process.env.DATABASE_URL)` fallback, which was
// unreachable in practice (dotenv had always already set the variable) and therefore aimed the whole
// suite at DEV.
//
// WHY. `src/lib/db/index.ts` is a MODULE-LEVEL singleton — `drizzle(postgres(DATABASE_URL))`,
// evaluated at import time on the connection's default `search_path` (= `public`). It bypasses
// `tests/helpers/db.ts`'s per-file schema isolation completely, so any test touching a code path
// that calls `recordAudit` without `vi.doMock("@/lib/db", …)` wrote a real row into the DEV
// database's `public.audit` — silently, because that insert's failure is swallowed by design
// (src/lib/audit.ts:111, load-bearing for the PayMongo 200-ACK path). The leaking set is the gap
// between the files that doMock and the files that do not, and it is not enumerable. Containment
// therefore has to be at the DATABASE layer, which is what this line buys.
//
// This runs in setupFiles, i.e. BEFORE the test file's module graph is imported, so both the app
// singleton and `tests/helpers/db.ts` (which reads the variable at call time inside setupTestDb)
// see the test database. `TEST_DATABASE_URL` is the deliberate way to point it elsewhere, and the
// target must be provisioned once with `npm run db:test:setup`.
//
// Non-vitest processes are untouched: `drizzle-kit` (db:migrate/generate/studio), `tsx scripts/*`
// (db:seed), `next dev` and every Playwright e2e spec still read DATABASE_URL and still hit DEV.
process.env.DATABASE_URL = testDatabaseUrl();

// Force a (fake) RESEND_API_KEY in tests so src/lib/email.ts instantiates the Resend client
// — which is mocked below to CAPTURE the sent email. Without a key, email.ts takes its
// dev console-log fallback and the mock never sees the link, so reset/verification tests
// could not read the emailed link. The key value is irrelevant (the Resend class is mocked).
if (!process.env.RESEND_API_KEY) {
  process.env.RESEND_API_KEY = "re_test_mock_key";
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
