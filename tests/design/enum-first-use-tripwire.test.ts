// D-244 / PG 55P04 — the enum-first-use tripwire, mechanised.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE DEFECT THIS EXISTS FOR IS ONE THAT PASSES EVERY TEST AND FAILS ONLY IN PRODUCTION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// `ALTER TYPE ... ADD VALUE` on an ALREADY-COMMITTED enum type adds a label that CANNOT BE USED until
// the transaction commits (Postgres 55P04, "unsafe use of new value"). Both migrators — `drizzle-kit
// migrate` and drizzle-orm's programmatic one — wrap ALL pending migrations in ONE transaction. So a
// migration that adds a label and any LATER migration in the same pending batch that USES it is a defect
// that ships.
//
// And here is why a green suite cannot rule it out, which is the whole reason this file is a mechanism
// rather than a paragraph:
//
//   • `tests/helpers/db.ts` replays each statement in its OWN `bootstrap.unsafe(...)` call — separate
//     implicit transactions — so the isolated-schema harness that backs all ~194 integration files
//     CANNOT reproduce it.
//   • A FRESH database CREATEs the enum type in the same transaction, and a type created in-transaction
//     may be used in-transaction. So `npm run db:migrate` against a clean DB cannot reproduce it either.
//
// The failure surfaces only where the type is already committed — which is every long-lived database,
// i.e. PRODUCTION. The control is therefore the DISCIPLINE, and the discipline was, until this file,
// prose: drizzle/0020's header states it, drizzle/0021's header describes the grep that enforces it and
// even keeps the literal out of its own comments so that the grep stays usable. This file is that grep.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY IT LIVES IN tests/design/, AND THE COST OF THAT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Every assertion here is pure: it reads `drizzle/*.sql` off disk. No database, no clock, no network.
// `vitest.design.config.ts` has no `globalSetup`, so this pays no Postgres preflight and runs inside
// `npm run build` (`lint && test:design && next build`) — which makes the tripwire BUILD-BLOCKING, the
// right weight for a rule whose violation cannot be caught anywhere else.
//
// ⚠ THE COST, stated so nobody rediscovers it: `npx vitest run tests/design/…` does NOT collect this
// file. It prints "No test files found" and EXITS 1 — indistinguishable from a real gate failure. The
// `--config vitest.design.config.ts` flag is mandatory, and `npm run test:design` is the shipped form.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// COMMENT LINES ARE STRIPPED BEFORE COUNTING, AND THAT IS LOAD-BEARING IN BOTH DIRECTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// A prohibition asserted over a DOCUMENTED file is falsely RED, because the paragraph that forbids a
// token necessarily names it — the failure `scripts/verify-workflows.mjs:24-32` measured and
// `tests/helpers/source-text.ts` was built to answer for TypeScript. SQL needs its own one-liner (`--`
// rather than `//`), so the strip is local here. drizzle/0020, drizzle/0021 and drizzle/0026 all discuss
// this hazard in prose and all three would otherwise trip their own gate.
//
// The mirror direction is guarded too: the file asserts the token IS present, in code, in exactly one
// migration. A stripper that returned "" — or a `MIGRATIONS_DIR` typo returning no files — would make
// the prohibition pass vacuously against a tree that had never had the ALTER TYPE at all.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MIGRATIONS_DIR = resolve(process.cwd(), "drizzle");

/**
 * The migration that OWNS the value, and the only file permitted to name it.
 *
 * The literal is assembled rather than written out, for the same reason drizzle/0021's header keeps it
 * out of its prose: this file is itself source text, and a future gate that greps the tree for the token
 * must not trip on the gate that enforces the rule.
 */
const OWNING_MIGRATION = "0027_cancelled_by_ops.sql";
const VALUE = "ops";
const QUOTED = `'${VALUE}'`;

/**
 * The SECOND owning migration, added by 18-09 (OPS-05 / D-245): six values on `notification_type`, the
 * other already-committed enum this phase widens. Same rule, same file, one owner per value.
 *
 * Every literal is assembled from its parts for the reason stated above — this file is source text, and
 * a gate that greps the tree for a token must not trip on the gate enforcing the rule about it.
 *
 * ⚠ `booking_cancelled_by_ops` ENDS IN THE 0027 TOKEN AND IS DELIBERATELY NOT A COLLISION. The 0027
 * assertions match `'ops'` WITH ITS QUOTES, and `'booking_cancelled_by_ops'` opens with a different
 * quote position — so 0028 does not "name" 0027's literal and the two owners stay independent. Verified
 * by the guard-the-guard case below, so a future rename that broke the property fails loudly instead of
 * silently making the 0027 prohibition trip on this file.
 */
const OWNING_MIGRATION_NOTIFY = "0028_ops_notification_types.sql";
const NOTIFY_VALUES = [
  "listing_review_approved",
  "listing_review_rejected",
  "host_verification_approved",
  "host_verification_rejected",
  "host_suspended",
  "booking_cancelled_by_ops",
] as const;
const NOTIFY_QUOTED = NOTIFY_VALUES.map((v) => `'${v}'`);

/** Strip SQL line comments (`-- …`). SQL has no block-comment form in any file in this directory. */
function stripSqlComments(source: string): string {
  return source
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

describe("55P04 tripwire — the new cancelled_by value is added once and used nowhere (D-244)", () => {
  it("the migration directory really was read (the mirror guard)", () => {
    // Without this, every prohibition below passes vacuously against an empty read.
    const files = migrationFiles();
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain(OWNING_MIGRATION);
  });

  it("exactly ONE migration names the literal, and it is the ALTER TYPE file", () => {
    const naming = migrationFiles().filter((f) =>
      stripSqlComments(readFileSync(resolve(MIGRATIONS_DIR, f), "utf8")).includes(QUOTED),
    );

    // Set equality, not membership: a second file naming it is the defect, whichever file that is.
    expect(naming).toEqual([OWNING_MIGRATION]);
  });

  it("the owning migration ADDS the value and does nothing else", () => {
    const code = stripSqlComments(
      readFileSync(resolve(MIGRATIONS_DIR, OWNING_MIGRATION), "utf8"),
    ).trim();

    // The positive half: it really is an ALTER TYPE ... ADD VALUE on cancelled_by.
    expect(code).toContain("ALTER TYPE");
    expect(code).toContain("cancelled_by");
    expect(code).toContain("ADD VALUE");

    // EXACTLY ONE STATEMENT. This is the drizzle/0020 rule made mechanical: a file that adds an enum
    // value may contain nothing else, because anything else in it shares the transaction with the ADD.
    const statements = code.split(";").filter((s) => s.trim().length > 0);
    expect(statements).toHaveLength(1);

    // IF NOT EXISTS keeps the isolated-schema replay (tests/helpers/db.ts) idempotent.
    expect(code).toContain("IF NOT EXISTS");
  });

  it("no migration AT OR AFTER the owning one names the literal", () => {
    // The 55P04 hazard is directional: a file BEFORE the ADD could not use the value at all (it does not
    // exist yet), and a file AFTER it shares the migrator's single transaction with the ADD. This is the
    // assertion drizzle/0021's header describes in prose, applied to the Phase-18 value.
    const after = migrationFiles().filter((f) => f >= OWNING_MIGRATION && f !== OWNING_MIGRATION);

    for (const f of after) {
      const code = stripSqlComments(readFileSync(resolve(MIGRATIONS_DIR, f), "utf8"));
      expect(code, `${f} names the new cancelled_by value — see D-244 / PG 55P04`).not.toContain(QUOTED);
    }
  });

  it("the Phase-18 schema migration does not name it either, in code OR in prose", () => {
    // drizzle/0026 is where `drizzle-kit generate` originally EMITTED the ALTER TYPE, alongside the new
    // tables. It was moved out by hand. This case is what stops it drifting back — and it deliberately
    // reads the RAW file, comments included, because 0026's header discusses the 55P04 split at length
    // and a header that spelled the token would invalidate the gate above (drizzle/0021's own rule).
    const raw = readFileSync(
      resolve(MIGRATIONS_DIR, "0026_host_verification_listing_review.sql"),
      "utf8",
    );
    expect(raw).not.toContain(QUOTED);
  });
});

describe("55P04 tripwire — the six OPS-05 notification kinds are added once and used nowhere (D-245)", () => {
  it("the owning migration exists and the value list is non-empty (the mirror guard)", () => {
    // Without this, every prohibition below passes vacuously — against an empty list, or against a
    // directory read that returned nothing.
    expect(migrationFiles()).toContain(OWNING_MIGRATION_NOTIFY);
    expect(NOTIFY_QUOTED).toHaveLength(6);
    for (const q of NOTIFY_QUOTED) expect(q.length).toBeGreaterThan(2);
  });

  it("does NOT collide with the 0027 literal, which is why the two owners can coexist", () => {
    // The one property that lets `'booking_cancelled_by_ops'` live in 0028 while `'ops'` is owned by
    // 0027: quoting. If a rename ever made one a substring of the other, the 0027 prohibition above
    // would start tripping on 0028 and report it as a 55P04 violation that is not one.
    expect(`'booking_cancelled_by_ops'`).not.toContain(QUOTED);
    const owning = readFileSync(resolve(MIGRATIONS_DIR, OWNING_MIGRATION_NOTIFY), "utf8");
    expect(owning).not.toContain(QUOTED);
  });

  it("exactly ONE migration names each literal, and it is the ALTER TYPE file", () => {
    const files = migrationFiles();
    for (const quoted of NOTIFY_QUOTED) {
      const naming = files.filter((f) =>
        stripSqlComments(readFileSync(resolve(MIGRATIONS_DIR, f), "utf8")).includes(quoted),
      );
      // Set equality, not membership: a second file naming it is the defect, whichever file that is.
      expect(naming, `${quoted} is named by ${naming.join(", ") || "no migration"}`).toEqual([
        OWNING_MIGRATION_NOTIFY,
      ]);
    }
  });

  it("the owning migration ADDS the six values and does nothing else", () => {
    const code = stripSqlComments(
      readFileSync(resolve(MIGRATIONS_DIR, OWNING_MIGRATION_NOTIFY), "utf8"),
    ).trim();

    expect(code).toContain("ALTER TYPE");
    expect(code).toContain("notification_type");
    expect(code).toContain("ADD VALUE");
    expect(code).toContain("IF NOT EXISTS"); // keeps the isolated-schema replay idempotent

    // EXACTLY SIX STATEMENTS, ALL OF THEM ADD VALUE. drizzle/0020's rule made mechanical: a file that
    // adds enum values may contain nothing else, because anything else shares the migrator's single
    // transaction with the ADD — which is the 55P04 defect itself.
    const statements = code.split(";").filter((s) => s.trim().length > 0);
    expect(statements).toHaveLength(6);
    for (const s of statements) {
      expect(s).toContain("ALTER TYPE");
      expect(s).toContain("ADD VALUE");
    }
  });

  it("no migration AT OR AFTER the owning one names any of the six", () => {
    const after = migrationFiles().filter(
      (f) => f >= OWNING_MIGRATION_NOTIFY && f !== OWNING_MIGRATION_NOTIFY,
    );

    for (const f of after) {
      const code = stripSqlComments(readFileSync(resolve(MIGRATIONS_DIR, f), "utf8"));
      for (const quoted of NOTIFY_QUOTED) {
        expect(code, `${f} names ${quoted} — see D-245 / PG 55P04`).not.toContain(quoted);
      }
    }
  });

  it("the Phase-18 schema migration does not name any of them either, in code OR in prose", () => {
    // Same guard as 0026 above, one migration later: 0026 created the review tables and 0027 widened
    // `cancelled_by`. Neither may name a notification kind — including in a header paragraph, which is
    // why this reads the RAW file.
    for (const tag of ["0026_host_verification_listing_review.sql", OWNING_MIGRATION]) {
      const raw = readFileSync(resolve(MIGRATIONS_DIR, tag), "utf8");
      for (const quoted of NOTIFY_QUOTED) {
        expect(raw, `${tag} names ${quoted}`).not.toContain(quoted);
      }
    }
  });
});
