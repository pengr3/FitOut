// `[17-D28]` — THE E2E SUITE MUST SEND ZERO REAL EMAIL. This file pins the chain that makes that true,
// in BOTH of its positions, so that neither half can rot silently. (Quick task `260831-9qx`.)
//
// ── THE CHAIN, STATED ONCE, IN ONE PLACE ──────────────────────────────────────────────────────────
//
//   1. `playwright.config.ts`'s `webServer.env` sets `RESEND_API_KEY: ""` for the server Playwright
//      boots, and `reuseExistingServer: false` means Playwright ALWAYS boots that server — so the
//      value is a property of every run rather than of the runs where nothing else held :3000.
//   2. `src/lib/email.ts:34-35` binds `resend = key ? new Resend(key) : null` AT MODULE LOAD, and
//      `send()` returns on the `!resend` branch BEFORE ANY TRANSPORT OBJECT EXISTS.
//   3. Therefore zero requests to `api.resend.com` leave the machine during an e2e run.
//
// Link 3 — the `[email:dev]` console fallback that the empty key routes into, and its WR-02 production
// guard — is already pinned by `tests/auth/email-dev-fallback.test.ts`. This file does not restate it;
// it asserts the two links that had no instrument at all.
//
// ⚠ THE KEY IS THE SWITCH HERE, WHICH IS WHY AN ENV FIX IS THE RIGHT ANSWER AND AN INTERCEPTION IS
// NOT. `instrumentation.ts:20-22` records the opposite mechanism for PayMongo: `authHeader()` falls
// back to `""` and still sends `Basic <base64 of ":">`, so clearing that credential removes the
// credential, not the network. Resend is the exact inverse. Same-looking finding, opposite mechanism,
// different correct answer — and this file is where that asymmetry is checkable rather than asserted.
//
// ── WHY THIS FILE IS IN `tests/design/` AND NOT `tests/security/` ─────────────────────────────────
//
// `vitest.design.config.ts` is the suite `npm run build` runs (`"build": "npm run lint && npm run
// test:design && next build"`). `tests/security/` is NOT — `instrumentation.ts:104-106` complains
// about exactly that gap in as many words: *"a green build does not cover this file."* A guard against
// a config line being deleted is worth only as much as the number of gates that run it, so it goes in
// the one that blocks a build. The design config carries the `@` and `server-only` aliases and has no
// `setupFiles`/`globalSetup`, so nothing here needs Docker — hence the LOCAL `vi.mock("resend")`
// below rather than a reach into `tests/setup.ts`, which this config does not load.
//
// ── THE FOUR WATCHED REDS (recorded in `260831-9qx-EVIDENCE.md`) ──────────────────────────────────
//
// An absence assertion cannot notice its own subject is gone — quick `260831-99f` met exactly that,
// where a guard PASSED over a tree whose subject had been deleted. So every assertion below was driven
// red before it was trusted. Each mutation was applied alone, observed, and reverted; the file was
// green again after each:
//
//   (a) delete `env: REAL_EMAIL ? …` from `playwright.config.ts` → 1 failed / 4 passed —
//       *"webServer must declare an env block at all: expected undefined to be truthy"*.
//   (b) restore `reuseExistingServer: !process.env.CI` → 1 failed / 4 passed —
//       *"expected true to be false // Object.is equality"*.
//   (c) invert LINK 2's control expectation (1 → 0) → 1 failed / 4 passed —
//       *"expected [ { to: 'nobody@example.com', …(1) } ] to have a length of +0 but got 1"*.
//   (d) give LINK 2's OFF position a truthy key → 1 failed / 4 passed, the SAME sentence as (c) but
//       fired from the OFF test — the capture really is what is doing the measuring in both.
//
// The whole file was also red BEFORE the fix existed (2 failed / 3 passed): both LINK 1 rows, with
// LINK 2 already green, which is the honest split — the mechanism was always correct, the config was
// what had no instrument. (c) and (d) are the pair that matters most: the OFF position alone would
// stay green on a tree where emails still fly, because `0` is also what a broken capture reports.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PlaywrightTestConfig } from "@playwright/test";

/**
 * A LOCAL capture, declared with `vi.hoisted` so the array exists before the hoisted `vi.mock` factory
 * runs. This is what makes "zero sends" a MEASUREMENT rather than the absence of an observer: the same
 * array reports `1` in the control position immediately below.
 */
const { captured } = vi.hoisted(() => ({ captured: [] as { to: string; subject: string }[] }));

vi.mock("resend", () => ({
  Resend: class {
    // `src/lib/email.ts:35` constructs this ONLY when the key is truthy, and `:54` is the sole call
    // site. No constructor is declared: the implicit one accepts the key this mock has no use for,
    // and declaring `constructor(_key: string) {}` only to ignore it adds an unused-argument lint
    // warning for nothing.
    emails = {
      send: async (payload: { to: string; subject: string }) => {
        captured.push({ to: payload.to, subject: payload.subject });
        return { data: { id: "captured-by-the-design-gate" }, error: null };
      },
    };
  },
}));

const REAL_EMAIL_FLAG = "FITOUT_E2E_REAL_EMAIL";

/** The shape `webServer` narrows to. Playwright's type admits an array; this config declares one. */
type WebServer = Exclude<PlaywrightTestConfig["webServer"], undefined | readonly unknown[]>;

/**
 * Load `playwright.config.ts` fresh under a stubbed environment. The config reads
 * `process.env.FITOUT_E2E_REAL_EMAIL` at MODULE SCOPE, so `vi.resetModules()` before each import is
 * what makes the two positions two different readings instead of one cached one.
 */
async function loadWebServer(flag: string): Promise<WebServer> {
  vi.resetModules();
  vi.stubEnv(REAL_EMAIL_FLAG, flag);
  const mod = await import("../../playwright.config");
  const webServer = (mod.default as PlaywrightTestConfig).webServer;
  expect(webServer, "playwright.config.ts declares a webServer").toBeTruthy();
  expect(Array.isArray(webServer), "one webServer, not an array — this test reads a single object")
    .toBe(false);
  return webServer as WebServer;
}

beforeEach(() => {
  captured.length = 0;
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("LINK 1 — playwright.config.ts silences Resend for every server it boots", () => {
  it("by DEFAULT the booted server gets RESEND_API_KEY=\"\"", async () => {
    const webServer = await loadWebServer("");

    // `""`, not "absent". Two measured mechanics make this the only spelling that works:
    //   • `webServer.env` MERGES over `process.env` (Playwright 1.60.0, webServerPlugin.js), so a key
    //     omitted here inherits the operator's live one.
    //   • `@next/env` re-applies a `.env.local` value only when `typeof initialEnv[key] ===
    //     "undefined"`, so a DELETED var would be re-supplied at boot while `""` — a defined string —
    //     is not.
    expect(webServer.env, "webServer must declare an env block at all").toBeTruthy();
    expect(Object.keys(webServer.env ?? {})).toContain("RESEND_API_KEY");
    expect(webServer.env?.RESEND_API_KEY).toBe("");
  });

  it(`with ${REAL_EMAIL_FLAG}=1 the config emits NO RESEND_API_KEY key at all`, async () => {
    const webServer = await loadWebServer("1");

    // The opt-in branch must be an OMISSION, never a read. The config never touches the secret's
    // value in either branch — the merge inherits it — which is how T-9QX-01 is satisfied
    // structurally instead of by remembering.
    expect(Object.keys(webServer.env ?? {})).not.toContain("RESEND_API_KEY");
  });

  it("reuseExistingServer is false in BOTH positions, so the env can never be bypassed", async () => {
    // `[17-D24]`: `reuseExistingServer: !process.env.CI` silently adopts whatever server already
    // holds :3000, along with whatever environment that server was booted with. An `env` guarantee
    // under an adopted server is not a guarantee. Deleting the adoption case is what lets this be a
    // static property of the config rather than a runtime probe that must itself be trusted.
    expect((await loadWebServer("")).reuseExistingServer).toBe(false);
    expect((await loadWebServer("1")).reuseExistingServer).toBe(false);
  });
});

describe("LINK 2 — an empty RESEND_API_KEY means send() returns before any transport exists", () => {
  it("OFF: with RESEND_API_KEY=\"\", one verification email produces ZERO captured sends", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("NODE_ENV", "test"); // not production — the WR-02 branch is not this file's subject.
    vi.spyOn(console, "log").mockImplementation(() => {});

    const { sendVerificationEmail } = await import("@/lib/email");
    await sendVerificationEmail("nobody@example.com", "https://fitout.app/verify?token=irrelevant");

    expect(captured).toHaveLength(0);
  });

  it("ON (THE CONTROL): with a key set, the SAME call produces exactly ONE captured send", async () => {
    // Without this half the test above stays green on a tree where emails still fly — `0` is equally
    // what a capture that never installed reports. A fake, obviously-not-real key: the real one is
    // never read by anything in this repo's test tree.
    vi.stubEnv("RESEND_API_KEY", "re_this_key_is_fake_and_goes_nowhere");
    vi.stubEnv("NODE_ENV", "test");

    const { sendVerificationEmail } = await import("@/lib/email");
    await sendVerificationEmail("nobody@example.com", "https://fitout.app/verify?token=irrelevant");

    expect(captured).toHaveLength(1);
    expect(captured[0].subject).toBe("Verify your FitOut email");
  });
});
