// Two invariants this phase owes that NO existing gate makes, pinned as assertions rather than by memory.
//
// Both are things a plan could erode by accident while doing something reasonable, and both would look
// like an improvement at the moment they happened. That is why they are assertions and not comments:
//
//   1. GATE-06 / D-80 — the migrations v1.0 and v1.1 shipped are IMMUTABLE. See the re-scoping note
//      immediately below: this clause used to read "`drizzle/` still ends at `0025_audit_resolved_by.sql`",
//      and that invariant is finished rather than broken.
//   2. D-81 — `REFUNDABLE_RAILS` still excludes `qrph`. PayMongo's PUBLISHED DOCS say QR Ph is
//      refundable. This account's OBSERVED behaviour says it is not, twice, five weeks apart. A reader
//      who finds the docs row and "fixes" the array is doing the most natural thing in the world, and
//      it would silently convert the D-82 manual-return branch into a refund call that 4xxs, leaving a
//      booker's money in limbo with copy claiming it is on its way.
//
// This file lives under `tests/design/**` so it runs inside `npm run build` (D-16) with no database.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// GATE-06 WAS RE-SCOPED BY RULING ON 2026-08-31, DURING PHASE 18 PLAN 18-02. IT WAS NOT BUMPED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// That distinction is the entire point of this note, and the next person to read this file needs it,
// because the two look identical in a diff and only one of them is legitimate.
//
// THE OLD INVARIANT, quoted so the history stays legible and nobody re-litigates it:
//
//     "GATE-06: this is a v1.1 phase and v1.1 phases ship on the v1.0 schema. A migration appearing in
//      `drizzle/` means the work has grown a database change that no v1.1 plan budgeted for. That is a
//      SCOPE ALARM TO RAISE, never one to absorb: do not bump the pinned number to make this green, and
//      do not delete the migration to make it green either. Take it to the phase owner."
//
// IT WAS TAKEN TO THE PHASE OWNER, WHICH IS WHY THIS PARAGRAPH EXISTS. Plan 18-02 added
// `0026_host_verification_listing_review.sql` and `0027_cancelled_by_ops.sql`, hit this gate, and
// STOPPED — no constant touched, no migration deleted — and raised it. The ruling follows.
//
// THE INVARIANT IS FINISHED, NOT STALE AND NOT VIOLATED. "v1.1 ships zero schema migrations" was a
// milestone-scoped promise, and it was KEPT: v1.1 closed 2026-08-31 with `drizzle/` still ending at
// `0025_audit_resolved_by.sql`, which `.planning/PROJECT.md:107` records as a kept promise. Phase 18 is
// **v1.2** (`.planning/ROADMAP.md:75-80` — added ahead of the milestone cycle by PM decision on
// 2026-09-01), and its LOCKED context mandates exactly these migrations: D-220 (`host_verification`),
// D-221 (`listing.review_state` + `listing_review`), D-240 (the grandfather backfill). The gate's own
// premise sentence — "this is a v1.1 phase" — simply stopped being true.
//
// WHAT SURVIVES INTO v1.2, and it is the half a digest is actually good at: THE MIGRATIONS THAT HAVE
// ALREADY RUN AGAINST PRODUCTION DATA ARE IMMUTABLE. Nobody silently rewrites, reorders, renames or
// deletes `0000`…`0025`. That property never expires and never needs re-cutting.
//
// WHAT DOES NOT SURVIVE: the freeze on NEW migrations. A frozen digest over the WHOLE directory was
// considered and REJECTED in the ruling, for a reason worth recording — it taxes every future v1.2
// migration (18-09 already adds one), so it would need re-cutting mid-phase and again per migration
// thereafter. A gate that must be bumped on a schedule stops being read and starts being bumped
// reflexively, which is precisely how a real alarm dies. The equality pins are therefore replaced by a
// monotonic FLOOR: the 26 historical files must all still be present and unmodified; new files may
// appear beside them.
//
// A "budgeted migration" gate keyed on PLAN.md `files_modified` was also considered and REJECTED:
// `/gsd-new-milestone` DELETES prior phase directories, so `0000`…`0025` have no surviving plan naming
// them and would all redden. Making it work needs a pinned historical exemption list — which is the
// thing it was trying to avoid.
//
// ⚠ THE DIGEST CONSTANT BELOW WAS NOT REGENERATED. It is the same
// `652178aef62a621c10b1492d21d85261905b9bd032e4061e6e27c53891d1afbe` computed on 2026-08-29 and watched
// RED then — because at that moment `drizzle/` held exactly the 26 historical files, so narrowing the
// input set from "every .sql" to "the 26 shipped ones" leaves the hash input byte-identical. That is
// deliberately stronger evidence than pasting a fresh number: the independently-watched constant still
// verifies, and only its documented domain narrowed. If a future reader wants to check that claim, it is
// one `git log -S` away.

import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { REFUNDABLE_RAILS } from "@/lib/payments/refund-rail";

const DRIZZLE_DIR = resolve(process.cwd(), "drizzle");

/**
 * THE SHIPPED SET — every migration that ran against production data under v1.0 and v1.1, by name, in
 * apply order. This list is CLOSED and will never grow again: v1.1 closed 2026-08-31 at
 * `0025_audit_resolved_by.sql`, and nothing that has already run can be added to history after the fact.
 *
 * Named exhaustively rather than derived as "everything <= 0025" ON PURPOSE. A derived bound would treat
 * a DELETED historical file as simply out of range and stay green — deletion is one of the exact things
 * this gate exists to catch, and it is the one a lexical comparison is blindest to.
 */
const SHIPPED_MIGRATIONS = [
  "0000_sturdy_nighthawk.sql",
  "0001_enable_postgis.sql",
  "0002_listing_tables.sql",
  "0003_paymongo_event.sql",
  "0004_availability_tables.sql",
  "0005_booking_exclusion.sql",
  "0006_booking_hold.sql",
  "0007_booking_location_geog.sql",
  "0008_payout_ledger.sql",
  "0009_booking_status_default_pending.sql",
  "0010_booking_request_states.sql",
  "0011_booking_request_columns.sql",
  "0012_booking_exclusion_v2.sql",
  "0013_phase7_columns.sql",
  "0014_phase7_ledger_kind.sql",
  "0015_booking_payment_method.sql",
  "0016_booking_full_day.sql",
  "0017_group_bookings.sql",
  "0018_group_notification_types.sql",
  "0019_booking_checkout_session.sql",
  "0020_open_capacity_enum.sql",
  "0021_open_capacity_columns.sql",
  "0022_booking_exclusion_v3.sql",
  "0023_booking_checkout_lease.sql",
  "0024_audit_table.sql",
  "0025_audit_resolved_by.sql",
] as const;

/**
 * sha256 over THE SHIPPED SET ONLY — `name + NUL + LF-normalised bytes` per file, in `SHIPPED_MIGRATIONS`
 * order. Watched RED on 2026-08-29 (record below) and again on 2026-08-31 under this narrowed domain.
 *
 * ⚠ NOT REGENERATED WHEN THE DOMAIN NARROWED, and that is the evidence rather than a convenience: on
 * 2026-08-29 `drizzle/` held exactly these 26 files and nothing else, so restricting the input from "every
 * .sql in the directory" to "these 26" leaves the hash input byte-identical. The number is the same one
 * that was independently watched red under the old shape.
 *
 * Do not regenerate this by re-running and pasting. See `digestOfShippedMigrations()`.
 */
const SHIPPED_MIGRATION_DIGEST = "652178aef62a621c10b1492d21d85261905b9bd032e4061e6e27c53891d1afbe";

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
function digestOfShippedMigrations(): string {
  const h = createHash("sha256");
  // Iterates the PINNED list, not the directory listing — so a new v1.2 migration landing beside the
  // historical set cannot move this number, and a historical file going missing throws in
  // `committedBytes` (ENOENT) rather than quietly shortening the input.
  for (const name of SHIPPED_MIGRATIONS) {
    h.update(name).update("\0").update(committedBytes(resolve(DRIZZLE_DIR, name)));
  }
  return h.digest("hex");
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// 1. GATE-06 / D-80 — the migrations that already ran are IMMUTABLE (re-scoped 2026-08-31; see header)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════

describe("GATE-06 / D-80 — the shipped migrations are immutable", () => {
  // Guard-the-guard: a wrong path would make `migrations()` return [] and every assertion below would
  // pass vacuously against an empty list. The floor is well under the real count and well over any
  // plausible partial read.
  it("actually found the migration directory", () => {
    expect(
      migrations().length,
      `read ${DRIZZLE_DIR} and found no .sql files — the path is wrong, so the pin below proves nothing`,
    ).toBeGreaterThan(20);
  });

  it("still holds every migration v1.0 and v1.1 shipped", () => {
    const present = new Set(migrations());
    const missing = SHIPPED_MIGRATIONS.filter((name) => !present.has(name));

    // A FLOOR, NOT AN EQUALITY — that is the 2026-08-31 re-scoping in one line. History cannot be
    // deleted or renamed; new v1.2 migrations are allowed to appear beside it. The old shape asserted
    // `migrations().length === 26`, which reddened on every legitimate new migration and would have
    // needed bumping per plan.
    expect(
      missing,
      `${missing.length} migration(s) that have ALREADY RUN against production data are missing from\n` +
        `drizzle/:\n  ${missing.join("\n  ")}\n\n` +
        `A shipped migration cannot be deleted or renamed. Drizzle's journal keys on these filenames, so a\n` +
        `rename desyncs every database that has already applied them, and a deletion means a fresh clone\n` +
        `builds a DIFFERENT schema than production is running.\n\n` +
        `This is NOT the old "no new migrations" freeze — adding a file is fine. Only losing one is not.`,
    ).toEqual([]);

    expect(
      migrations().length,
      `drizzle/ holds ${migrations().length} .sql files, fewer than the ${SHIPPED_MIGRATIONS.length} that\n` +
        `v1.0 and v1.1 shipped. History cannot shrink.`,
    ).toBeGreaterThanOrEqual(SHIPPED_MIGRATIONS.length);
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────────
  // The assertion above pins PRESENCE. An edit to an already-shipped `.sql` — a widened column, a
  // changed default, a dropped index — changes no filename at all and sails past every line above it,
  // which is why the byte digest exists as a separate clause.
  //
  // RED-WATCH (2026-08-29, plan 17-02). The pin was watched fail before it was trusted. Recorded under
  // the gate's PRE-RE-SCOPING shape (equality pins, whole-directory digest) and kept verbatim, because
  // the digest constant and its input bytes are unchanged by the 2026-08-31 re-scoping — only the
  // sibling clauses around it changed. The "5 passed" count refers to the old file's case list:
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
  //
  // RE-WATCHED UNDER THE NARROWED DOMAIN (2026-08-31, plan 18-02), because a digest test that has never
  // gone red for the right reason under its CURRENT shape is not evidence — and this shape is new:
  //   mutation : drizzle/0014_phase7_ledger_kind.sql:26 — the Finding-2 backfill's `= 0` changed to
  //              `= 1`, i.e. ONE character inside a statement that has already run against production
  //   command  : npx vitest run --config vitest.design.config.ts \
  //                tests/design/money-path-invariants.test.ts tests/design/infra.test.ts
  //   observed : RED, 1 failed / 35 passed
  //                × pins the shipped migrations byte-for-byte, not just by their filenames
  //                Expected: "652178aef62a621c10b1492d21d85261905b9bd032e4061e6e27c53891d1afbe"
  //                Received: "b801a5fd4d5d11081c92b35d501bdb35818afb4dac7a3b0bfe186714f71548ca"
  //              ⚠ AND THE CONTROL THAT MATTERS, which is the whole property the re-scoping buys: the
  //              two NEW v1.2 migrations (0026, 0027) were present on disk for this run and did NOT
  //              move the number, and infra.test.ts stayed fully green about them. Under the OLD shape
  //              their mere existence reddened four assertions.
  //   restored : file restored from backup; `git diff --exit-code drizzle/…` clean; re-run GREEN 36/36.
  //
  // FLOOR RE-WATCHED SEPARATELY (2026-08-31), because presence and content are different claims:
  //   mutation : `git mv drizzle/0014_phase7_ledger_kind.sql drizzle/0014_renamed.sql`
  //   observed : RED, 3 failed / 33 passed — the presence clause in BOTH files, plus the digest:
  //                × still holds every migration v1.0 and v1.1 shipped   (this file AND infra.test.ts)
  //                  1 migration(s) that have ALREADY RUN against production data are missing from
  //                    0014_phase7_ledger_kind.sql
  //                  expected [ '0014_phase7_ledger_kind.sql' ] to deeply equal []
  //                × pins the shipped migrations byte-for-byte …
  //                  Error: ENOENT: no such file or directory, open '…\drizzle\0014_phase7_ledger_kind.sql'
  //              THE ENOENT IS WHY `digestOfShippedMigrations()` ITERATES THE PINNED LIST rather than
  //              the directory listing. A listing-driven digest would have cheerfully hashed 26 files —
  //              including `0014_renamed.sql` — and reported a bare hash mismatch, hiding WHICH file
  //              went missing. Failing loudly on the name is the better diagnostic.
  //   restored : `git mv` back; `git status --short drizzle/` empty; re-run GREEN 36/36.
  // ─────────────────────────────────────────────────────────────────────────────────────────────────
  it("pins the shipped migrations byte-for-byte, not just by their filenames", () => {
    expect(
      digestOfShippedMigrations(),
      `the BYTES of an ALREADY-SHIPPED migration changed while its filename did not.\n\n` +
        `These ${SHIPPED_MIGRATIONS.length} files have already run against production data. Editing one\n` +
        `does NOT change production — it changes what a fresh clone builds, so dev and prod silently\n` +
        `diverge and drizzle's journal (which keys on the filename) never notices. A widened column, a\n` +
        `changed default, a dropped index: none of them rename anything, so the presence assertion above\n` +
        `stays green while the schema moves underneath it. The digest is over name + NUL + bytes, so it\n` +
        `also catches a pure rename.\n\n` +
        `Do NOT "fix" this by updating the constant. The correct repair for a needed schema change is a\n` +
        `NEW migration — which this gate explicitly permits since the 2026-08-31 re-scoping (see the file\n` +
        `header). There is no legitimate reason to edit one of these ${SHIPPED_MIGRATIONS.length} files.\n\n` +
        `⚠ If you are reading this after a fresh clone and NOTHING was edited: the digest is taken over\n` +
        `LF-normalised bytes precisely so a CRLF checkout cannot produce this failure — see\n` +
        `\`committedBytes()\`. A red here is a content change, not a line-ending one.`,
    ).toBe(SHIPPED_MIGRATION_DIGEST);
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
