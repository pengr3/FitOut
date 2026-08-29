// Two invariants this phase owes that NO existing gate makes, pinned as assertions rather than by memory.
//
// Both are things a plan could erode by accident while doing something reasonable, and both would look
// like an improvement at the moment they happened. That is why they are assertions and not comments:
//
//   1. GATE-06 / D-80 — `drizzle/` still ends at `0025_audit_resolved_by.sql`. Phase 13 ships ZERO
//      schema migrations, and Phase 17 SC#4 makes that a milestone-closing proof. Today the check only
//      happens at the milestone's exit, which is the worst possible time to discover it failed. This
//      makes it mechanical from this phase forward.
//   2. D-81 — `REFUNDABLE_RAILS` still excludes `qrph`. PayMongo's PUBLISHED DOCS say QR Ph is
//      refundable. This account's OBSERVED behaviour says it is not, twice, five weeks apart. A reader
//      who finds the docs row and "fixes" the array is doing the most natural thing in the world, and
//      it would silently convert the D-82 manual-return branch into a refund call that 4xxs, leaving a
//      booker's money in limbo with copy claiming it is on its way.
//
// This file lives under `tests/design/**` so it runs inside `npm run build` (D-16) with no database.

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { REFUNDABLE_RAILS } from "@/lib/payments/refund-rail";

const DRIZZLE_DIR = resolve(process.cwd(), "drizzle");

/** The migration D-80 pins the directory at. */
const LAST_MIGRATION = "0025_audit_resolved_by.sql";

/** How many `.sql` files `drizzle/` ships. Measured 2026-08-29; `0000`…`0025` with no gaps. */
const MIGRATION_COUNT = 26;

/**
 * sha256 over the whole directory — `name + NUL + LF-normalised bytes` per file, in `migrations()`'
 * sorted order. Filled from a first run and then WATCHED RED (see the red-watch record below).
 *
 * Do not regenerate this by re-running and pasting. See `digestOfMigrations()`.
 */
const MIGRATION_DIGEST = "652178aef62a621c10b1492d21d85261905b9bd032e4061e6e27c53891d1afbe";

/** Every generated migration on disk, in the order drizzle applies them (its filenames sort correctly). */
function migrations(): string[] {
  return readdirSync(DRIZZLE_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

/**
 * A migration's bytes with CRLF collapsed to LF — i.e. the bytes git STORES, not the bytes this
 * particular checkout happens to render.
 *
 * ⚠ THIS NORMALISATION IS LOAD-BEARING AND IS NOT THE DIGEST "LEARNING TO FORGIVE".
 * `.gitattributes` opens with `* text=auto`, and `drizzle/*.sql` takes no `eol=lf` pin, so the
 * working-tree bytes of these files DIFFER BY PLATFORM. Measured 2026-08-29 on this Windows checkout
 * (`core.autocrlf=true`): `0025_audit_resolved_by.sql` is 2752 bytes with 33 CR and 33 LF. The same
 * file in `ci.yml`'s `gate-db-free` job — ubuntu-latest, in a container, which is where `npm run
 * build` and therefore this gate actually run — is 2719 bytes with 0 CR. A digest over raw
 * `readFileSync` bytes computed here is RED THERE on every run, for a reason that has nothing to do
 * with a schema change. That is the exact failure `.gitattributes`' own `eol=lf` paragraph describes
 * for `token-drift.test.ts`, arriving at a fourth artifact.
 *
 * The subject of GATE-06 is what the milestone SHIPPED — the committed blob — and git normalises CRLF
 * out of the blob under `text=auto` before it is ever written. So hashing the normalised form is
 * hashing the real subject, and nothing that could be a schema change survives it: an edit to any SQL
 * text changes the digest, and a rename changes it via the filename (below). The only thing forgiven
 * is a newline flavour that git will not let into a commit in the first place.
 *
 * The alternative — adding `drizzle/*.sql text eol=lf` to `.gitattributes` and renormalising 26 files
 * — was rejected as out of this plan's declared surface; if a later phase adds that pin, this function
 * becomes a no-op rather than wrong, and the digest constant does not move.
 */
function committedBytes(file: string): Buffer {
  const raw = readFileSync(file);
  const out = Buffer.alloc(raw.length);
  let n = 0;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === 0x0d && raw[i + 1] === 0x0a) continue; // the CR of a CRLF pair, and only that
    out[n] = raw[i];
    n += 1;
  }
  return out.subarray(0, n);
}

/**
 * THE FILENAME IS INSIDE THE DIGEST INPUT, and that is not decoration. A digest over bytes alone is
 * blind to `0025_a.sql` → `0025_b.sql`, which is a real change to `drizzle/` that drizzle's own
 * journal would notice. `name + NUL + bytes` also keeps the concatenation unambiguous: without the
 * separator, a rename that moved characters across the name/bytes boundary could hash identically.
 *
 * `node:crypto` rather than anything hand-rolled (ASVS V6).
 */
function digestOfMigrations(): string {
  const h = createHash("sha256");
  for (const name of migrations()) {
    h.update(name).update("\0").update(committedBytes(resolve(DRIZZLE_DIR, name)));
  }
  return h.digest("hex");
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// 1. GATE-06 / D-80 — ZERO schema migrations in this milestone
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("GATE-06 / D-80 — drizzle/ ships no new migration", () => {
  // Guard-the-guard: a wrong path would make `migrations()` return [] and every assertion below would
  // pass vacuously against an empty list. The floor is well under the real count (26) and well over any
  // plausible partial read.
  it("actually found the migration directory", () => {
    expect(
      migrations().length,
      `read ${DRIZZLE_DIR} and found no .sql files — the path is wrong, so the pin below proves nothing`,
    ).toBeGreaterThan(20);
  });

  it(`ends at ${LAST_MIGRATION}`, () => {
    const all = migrations();
    const last = all[all.length - 1];
    expect(
      last,
      `drizzle/ now ends at "${last}", not "${LAST_MIGRATION}".\n\n` +
        `D-80: the v1.1 milestone ships ZERO schema migrations, and Phase 17 SC#4 (GATE-06) makes that a\n` +
        `milestone-closing proof. Every Phase 13 decision is deliverable without a column — so a migration\n` +
        `proposed inside a v1.1 phase plan is a SCOPE ALARM to raise explicitly with the operator, never a\n` +
        `thing to absorb quietly because the feature seemed to need it. If a column genuinely is required,\n` +
        `that is a finding about the decision that asked for it, and it changes the milestone, not this line.\n\n` +
        `Do NOT "fix" this by updating LAST_MIGRATION.`,
    ).toBe(LAST_MIGRATION);
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────────
  // The assertion above pins the LAST FILENAME. SC#4's wording is strictly stronger: "`drizzle/` is
  // UNCHANGED from its v1.0 state". An edit to an already-shipped `.sql` — a widened column, a
  // changed default, a dropped index — changes no filename at all and sails past every line above it.
  //
  // RED-WATCH (2026-08-29, plan 17-02). The pin was watched fail before it was trusted:
  //   mutation : drizzle/0025_audit_resolved_by.sql:33, ONE character — `ADD COLUMN "resolved_by"
  //              text;` → `... texu;`
  //   command  : npx vitest run --config vitest.design.config.ts tests/design/money-path-invariants.test.ts
  //   observed : RED, 1 failed / 5 passed.
  //                Expected: "652178aef62a621c10b1492d21d85261905b9bd032e4061e6e27c53891d1afbe"
  //                Received: "5ba9c100412f33572fe80bf9490ca5eef1f586095e687b0bf2d29fdba55b21fb"
  //              ⚠ THE FIVE THAT PASSED ARE THE POINT. `actually found the migration directory`,
  //              `ends at 0025_audit_resolved_by.sql` and the count clause were ALL GREEN against a
  //              tree whose schema had just been altered — this describe, before this it(), reported
  //              "drizzle/ ships no new migration" about a changed schema. That is the hole.
  //   restored : `git checkout -- drizzle/0025_audit_resolved_by.sql`; re-run GREEN 6/6 and
  //              `git status --porcelain drizzle/` printed nothing.
  //
  // PLATFORM CROSS-CHECK (same session), because a constant pinned on one OS and enforced on another
  // is a gate that fails for the wrong reason: the digest over LF-normalised working-tree bytes was
  // computed alongside a digest over `git show :drizzle/<name>` — the INDEX BLOBS, which are what
  // ubuntu-latest checks out. Both produced
  // 652178aef62a621c10b1492d21d85261905b9bd032e4061e6e27c53891d1afbe, byte-identically, so this
  // constant is the same number in `gate-db-free` as it is here.
  // ─────────────────────────────────────────────────────────────────────────────────────────────────
  it("pins drizzle/ byte-for-byte, not just by its last filename", () => {
    expect(
      migrations().length,
      `drizzle/ holds ${migrations().length} .sql files, not ${MIGRATION_COUNT}:\n` +
        `${migrations().join("\n")}\n\n` +
        `A file was ADDED or REMOVED. Do NOT "fix" this by updating MIGRATION_COUNT — see the message\n` +
        `on the digest assertion below, which applies to this line word for word.`,
    ).toBe(MIGRATION_COUNT);

    expect(
      digestOfMigrations(),
      `the BYTES of drizzle/ changed while the filenames may not have.\n\n` +
        `GATE-06 / Phase 17 SC#4 is "\`drizzle/\` is UNCHANGED from its v1.0 state", which is a claim\n` +
        `about CONTENT, not about the last filename. An edit to an already-shipped .sql — a widened\n` +
        `column, a changed default, a dropped index — breaks it without renaming anything, so the\n` +
        `\`ends at ${LAST_MIGRATION}\` assertion above stays green while the schema moves. This digest\n` +
        `is over name + NUL + bytes for all ${MIGRATION_COUNT} files, so it also catches a pure rename.\n\n` +
        `Do NOT "fix" this by updating the constant. A migration — or an edit to a shipped one —\n` +
        `proposed inside a v1.1 phase is a SCOPE ALARM to raise explicitly with the operator (D-199\n` +
        `exception (a)), never a thing to absorb quietly because the feature seemed to need it. If the\n` +
        `schema genuinely must move, that is a finding about the decision that asked for it, and it\n` +
        `changes the milestone, not this line.\n\n` +
        `⚠ If you are reading this after a fresh clone and NOTHING was edited: the digest is taken over\n` +
        `LF-normalised bytes precisely so a CRLF checkout cannot produce this failure — see\n` +
        `\`committedBytes()\`. A red here is a content change, not a line-ending one.`,
    ).toBe(MIGRATION_DIGEST);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// 2. D-81 — qrph is NOT API-refundable, whatever the vendor's docs row says
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The failure message, built by a function so the SELF-TEST below can drive the same code path with a
 * synthetic set (the `leak.test.ts:208-212` rule). A message that has only ever been produced by a
 * passing assertion — i.e. never — is a message nobody has read.
 *
 * Returns `null` when the set is correct.
 */
function qrphViolation(rails: ReadonlySet<string>): string | null {
  if (!rails.has("qrph")) return null;
  return (
    `REFUNDABLE_RAILS now contains "qrph". It must not.\n\n` +
    `PROBED 2026-07-23 and RE-PROBED 2026-08-20 against PayMongo TEST mode, the second time with a\n` +
    `FRESH Idempotency-Key (qrph-refund-reprobe-260820) against the same captured payment so a cached\n` +
    `response could not be replayed. Both returned, verbatim:\n\n` +
    `    HTTP 400\n` +
    `    {"errors":[{"code":"parameter_invalid","detail":"Refunds are not allowed for payments with ` +
    `source type qrph.","source":{"pointer":"payment_id","attribute":"payment_id"}}]}\n\n` +
    `The rejection is RAIL-LEVEL — not "payment too old", not "already refunded" — so it is a clean\n` +
    `signal. PayMongo's published docs list QR Ph as refundable and CONTRADICT this; observed behaviour\n` +
    `is authoritative over the docs row (D-81), and the docs row is a UAT re-verification item.\n\n` +
    `⚠ If a fresh probe ever returns 2xx, that is a FINDING, not a fix. It makes refund-rail.ts and the\n` +
    `D-72 destination form stale and it changes D-82's policy split by cause — raise it, do not apply it\n` +
    `by widening this array. Widening it silently turns the manual-return branch into a refund call that\n` +
    `4xxs, while the copy tells the booker their money is on its way.`
  );
}

describe("D-81 — REFUNDABLE_RAILS excludes qrph", () => {
  // Both directions, on a synthetic set, through the SAME function the real assertion calls — so the
  // message above is demonstrably reachable and the assertion below is demonstrably able to fail.
  it("the check itself works in both directions", () => {
    expect(qrphViolation(new Set(["card", "gcash"]))).toBeNull();
    const message = qrphViolation(new Set(["card", "qrph"]));
    expect(message).not.toBeNull();
    expect(message).toContain("Refunds are not allowed for payments with source type qrph.");
    expect(message).toContain("2026-08-20");
    expect(message).toContain("is a FINDING, not a fix");
  });

  it("the SHIPPED set does not contain it", () => {
    expect(qrphViolation(REFUNDABLE_RAILS) ?? "").toBe("");
  });

  it("still contains the rails FitOut does refund, so the pin is not satisfied by an empty set", () => {
    // Anti-vacuity: emptying REFUNDABLE_RAILS would satisfy the assertion above and break every refund.
    for (const rail of ["card", "gcash", "paymaya"]) {
      expect(REFUNDABLE_RAILS.has(rail), `REFUNDABLE_RAILS lost "${rail}"`).toBe(true);
    }
  });
});
