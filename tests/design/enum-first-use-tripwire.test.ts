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
