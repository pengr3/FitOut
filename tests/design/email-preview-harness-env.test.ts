// The email-preview harness's environment allow-list, pinned.
//
// ── WHAT THIS PROTECTS, AND WHY A DEAD LINK IS WORSE THAN A BROKEN ONE ──────────────────────────
// `scripts/send-email-previews.ts` renders one of each of the 23 transactional sends so a human can
// open them in a real client and grade them (EMAIL-03's walk, `15-UAT-EMAIL.md`). It imports
// `@/lib/email`, and that module reads `BETTER_AUTH_URL` ONCE, at evaluation time:
//
//     src/lib/email.ts:120   const APP_URL = process.env.BETTER_AUTH_URL ?? "";
//
// Exactly one CTA in the whole email layer has no caller-supplied href and composes its own from
// that constant — `Find another space`, at `src/lib/email.ts:246`, `href: \`${APP_URL}/\``. So if the
// harness does not hydrate `BETTER_AUTH_URL` before importing the email module, `APP_URL` is `""`,
// that CTA ships `href="/"`, and the preview carries a link that goes nowhere.
//
// THE FAILURE IS SILENT AND IT CORRUPTS THE WALK, WHICH IS THE POINT. Nothing throws. The preview
// renders, the send delivers, the message looks right. The operator working through
// `15-UAT-EMAIL.md` reaches the "is the CTA tappable?" cell for those sends and grades a defect that
// exists ONLY in the harness — so a real product bug and a harness artefact become indistinguishable
// at exactly the moment the walk is supposed to tell them apart. A preview that composes a DIFFERENT
// link than a real send would carry defeats the entire purpose of previewing.
//
// ── WHY THIS FILE EXISTS AT ALL: WR-05 WAS FIXED, AND NOTHING KEPT IT FIXED ─────────────────────
// Review finding WR-05 (`15-REVIEW.md`) was that the loader ran only under `--send`, and its
// allow-list omitted `BETTER_AUTH_URL`. It was closed on 2026-08-25 by commit `3494fba`, which both
// hydrated on BOTH paths and added the third key. But no test pinned the result, so the fix was one
// careless edit from silently reverting — and `15-VERIFICATION.md`, written later the same day, went
// on recording WR-05 as "still open and unfixed in the tree", a claim the tree had already
// contradicted. Both halves of that are what this file answers: the allow-list is now load-bearing
// rather than incidental, and the record is corrected alongside it.
//
// ── WHY A SOURCE SCAN AND NOT AN IMPORT ─────────────────────────────────────────────────────────
// `scripts/send-email-previews.ts` calls `main()` unconditionally at module scope — it has NO
// entry-point guard (contrast `scripts/cloudinary-preset.ts`, which does, and which
// `cloudinary-preset-script.test.ts` may therefore import safely). Importing this script from a test
// would parse the vitest runner's `process.argv`, find no `--send`, and run the whole harness
// against the real Resend transport. So the contract is asserted structurally, over the file's
// source, which is the only safe reading of a module that runs on import.
//
// ── WHY `tests/design/` ─────────────────────────────────────────────────────────────────────────
// Pure: no network, no credential, no clock, no database. Same placement argument as
// `cloudinary-preset-script.test.ts` — it runs inside `npm run build`
// (`lint && test:design && next build`), so this property is BUILD-BLOCKING, and it pays no Postgres
// preflight. The cost, restated so nobody rediscovers it: `npx vitest run` does NOT collect this
// file. `npm run test:design` does.
//
// ── OBSERVED RED ────────────────────────────────────────────────────────────────────────────────
// Taken 2026-08-31, each mutation applied to `scripts/send-email-previews.ts`, run, transcribed,
// then reverted with `git checkout --` and the diff verified empty.
//
// MUTATION 1 — `BETTER_AUTH_URL` deleted from the allow-list array (the exact WR-05 regression):
//   → FAIL  "the harness must hydrate BETTER_AUTH_URL before importing @/lib/email"
//           expected [ 'RESEND_API_KEY', 'EMAIL_FROM' ] to include 'BETTER_AUTH_URL'
//
// MUTATION 2 — the `loadFromEnvLocal([...])` call moved back inside `if (live) {`:
//   → FAIL  "the loader must run on BOTH paths, not only under --send"
//
// MUTATION 3 — `src/lib/email.ts:120` changed to read a different env var:
//   → FAIL  "email.ts must still read BETTER_AUTH_URL, or this whole guard is aimed at nothing"
//   This is the coupling check. Without it the test would keep passing while guarding a key the
//   email module no longer consumes — green, and meaningless.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const HARNESS = resolve(process.cwd(), "scripts/send-email-previews.ts");
const EMAIL_MODULE = resolve(process.cwd(), "src/lib/email.ts");

const harnessSource = readFileSync(HARNESS, "utf8");
const emailSource = readFileSync(EMAIL_MODULE, "utf8");

/** The single `loadFromEnvLocal([...])` call site, parsed to the keys it actually allow-lists. */
function allowListedKeys(): string[] {
  const call = harnessSource.match(/loadFromEnvLocal\(\s*\[([^\]]*)\]\s*\)/);
  if (!call) throw new Error("no loadFromEnvLocal([...]) call found in scripts/send-email-previews.ts");
  return [...call[1].matchAll(/["']([A-Z0-9_]+)["']/g)].map((m) => m[1]);
}

describe("the email-preview harness hydrates the environment @/lib/email reads", () => {
  it("allow-lists BETTER_AUTH_URL, so the APP_URL-composed CTA is not a dead link (WR-05)", () => {
    expect(allowListedKeys()).toContain("BETTER_AUTH_URL");
  });

  it("still allow-lists the transport keys the harness needs to deliver", () => {
    const keys = allowListedKeys();
    expect(keys).toContain("RESEND_API_KEY");
    expect(keys).toContain("EMAIL_FROM");
  });

  it("runs the loader on BOTH paths, not only under --send", () => {
    // The call must sit at module scope, ahead of the `if (live)` block that validates the transport
    // keys — preview mode imports the same email module and needs the same environment.
    const loadAt = harnessSource.indexOf("loadFromEnvLocal([");
    const liveBlockAt = harnessSource.indexOf("if (live) {");
    expect(loadAt).toBeGreaterThan(-1);
    expect(liveBlockAt).toBeGreaterThan(-1);
    expect(
      loadAt,
      "loadFromEnvLocal must be called before the `if (live)` block, at module scope — a loader that " +
        "runs only on the live path leaves preview output composing a different link than a real send",
    ).toBeLessThan(liveBlockAt);
  });
});

describe("the coupling this guard depends on", () => {
  it("email.ts still reads BETTER_AUTH_URL at module scope", () => {
    // If this ever stops being true, the allow-list assertion above is guarding a key nothing
    // consumes, and would stay green while protecting nothing.
    expect(
      /process\.env\.BETTER_AUTH_URL/.test(emailSource),
      "src/lib/email.ts no longer reads BETTER_AUTH_URL — re-aim this guard at whatever replaced it",
    ).toBe(true);
  });

  it("still has exactly one CTA composing its href from APP_URL", () => {
    // The blast radius of an unhydrated BETTER_AUTH_URL. If a second such CTA appears, the harness
    // gap gets wider and this comment's "exactly one" claim needs revisiting rather than silently
    // becoming wrong.
    const appUrlHrefs = [...emailSource.matchAll(/href:\s*`\$\{APP_URL\}/g)];
    expect(appUrlHrefs).toHaveLength(1);
  });
});
