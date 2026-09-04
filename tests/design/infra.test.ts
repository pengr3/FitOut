// Self-test for the two shared design-gate primitives: the leak-pattern list and the globals.css
// token parser. Both are modules that OTHER gates trust; if either is wrong, every gate built on it
// reports a confident, wrong answer.
//
// The discipline here mirrors tests/use-server-exports.test.ts:337-369 — assert what a rule FLAGS
// *and* what it EXEMPTS. A pattern list proven only against true positives is indistinguishable
// from one that matches everything, and a pattern that silently matches nothing is a gate that is
// permanently green (T-10-06). Both directions are asserted, one fixture per assertion, so a
// failure names the exact shape that regressed.
//
// Fixtures are SYNTHETIC on purpose. The live `globals.css` has no `[data-theme]` blocks until plan
// 10-03, so asserting the parser against the real file here would either fail today or be rewritten
// tomorrow. The parser is proven against a CSS string that has the shape 10-03 will create.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than
// over-trusts it:
//   • This proves the PATTERNS are right. It does not prove the ESLint rule or the Vitest walker
//     applies them to the right files — that is plans 10-17 and 10-14, and each needs its own
//     positive control over a real tree.
//   • The leak patterns are line/literal-oriented. A design value split across a template
//     expression (`` `bg-${shade}-500` ``) is invisible to every pattern here, by construction.
//   • The token parser is proven against one synthetic stylesheet shape. It is not proven against
//     `@media`-nested or `@supports`-nested theme blocks, because the phase declares none.

import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import {
  DESIGN_LEAK_PATTERNS,
  LEAK_SCAN_GLOBS,
  LEAK_SCAN_PREFIXES,
  LEAK_DISABLE_RULE_ID,
  findDesignLeaks,
} from "../../config/design-leak-patterns.mjs";
import {
  THEME_NAMES,
  parseThemeTokens,
  parseGlobalTokens,
  GLOBALS_CSS_PATH,
} from "../../config/design-tokens-source.mjs";
import {
  compileGlobalsCss,
  customPropertyValue,
  declarationsFor,
} from "./helpers/compile-css";

// ---------------------------------------------------------------------------
// The leak-pattern list (DS-13 / D-15 / D-16 / D-17)
// ---------------------------------------------------------------------------

describe("config/design-leak-patterns.mjs — the shape of the list", () => {
  it("exports exactly the five declared pattern ids", () => {
    expect(DESIGN_LEAK_PATTERNS.map((p) => p.id).sort()).toEqual([
      "arbitrary-text-px",
      "color-function",
      "palette-class",
      "raw-hex",
      "white-black-class",
    ]);
  });

  it("declares every pattern WITHOUT the `g` flag, so `.test()` is stateless", () => {
    // A `g`-flagged shared RegExp alternates true/false across calls via `lastIndex`.
    for (const entry of DESIGN_LEAK_PATTERNS) {
      expect(entry.pattern.global, `${entry.id} must not be /g`).toBe(false);
    }
  });

  it("carries a non-empty recorded reason for every pattern", () => {
    for (const entry of DESIGN_LEAK_PATTERNS) {
      expect(entry.label.length, entry.id).toBeGreaterThan(0);
      expect(entry.why.length, entry.id).toBeGreaterThan(20);
    }
  });

  it("keeps src/components/** in scope — there is no vendored exemption (D-17)", () => {
    expect(LEAK_SCAN_GLOBS.some((g) => g.includes("src/components/"))).toBe(
      true,
    );
    expect(LEAK_SCAN_GLOBS.some((g) => g.includes("src/app/"))).toBe(true);
    // No glob may carve `ui/` back out.
    expect(LEAK_SCAN_GLOBS.some((g) => g.includes("!"))).toBe(false);
  });

  it("never scans its own directory (L15 — the list would flag itself)", () => {
    expect(LEAK_SCAN_PREFIXES.some((p) => p.startsWith("config/"))).toBe(false);
    expect(LEAK_SCAN_PREFIXES).toEqual(["src/app/", "src/components/"]);
  });

  it("names the shared rule id both consumers report under (D-16)", () => {
    expect(LEAK_DISABLE_RULE_ID).toBe("fitout/no-raw-design-value");
  });
});

describe("config/design-leak-patterns.mjs — true positives", () => {
  it("flags a hex constant (listing-map.tsx:22)", () => {
    expect(findDesignLeaks('const BRAND_CORAL = "#E8484E";')).toContain(
      "raw-hex",
    );
  });

  it("flags a hex in an SVG attribute (listing-map.tsx:34)", () => {
    expect(findDesignLeaks('fill="#fff"')).toContain("raw-hex");
  });

  it("flags a numbered palette class (D-15)", () => {
    expect(findDesignLeaks('className="bg-zinc-50"')).toContain("palette-class");
  });

  it("flags a black/white class with an opacity modifier (D-15)", () => {
    expect(findDesignLeaks('className="bg-black/50"')).toContain(
      "white-black-class",
    );
  });

  it("flags an arbitrary px type size (DS-13)", () => {
    expect(findDesignLeaks('className="text-[28px]"')).toContain(
      "arbitrary-text-px",
    );
  });

  it("flags a raw colour function", () => {
    expect(findDesignLeaks("background: oklch(0.5 0 0)")).toContain(
      "color-function",
    );
  });
});

describe("config/design-leak-patterns.mjs — the two verified false positives (L14)", () => {
  it("does NOT flag a GitHub issue reference in prose", () => {
    // The shape at src/lib/db/schema.ts:730. An unanchored hex pattern reports `#3388`.
    expect(findDesignLeaks("// see #3388 for details")).toEqual([]);
  });

  it("does NOT flag the color-mix hover idiom (button.tsx:16)", () => {
    // A bare `oklch` pattern (no `(`) matches `in_oklch,` here. The trailing `(` is what saves it.
    expect(
      findDesignLeaks(
        "hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
      ),
    ).toEqual([]);
  });
});

describe("config/design-leak-patterns.mjs — deliberate non-matches", () => {
  it("does NOT flag the tolerated vendored rem type sizes (UI-SPEC Q2: px-only)", () => {
    expect(findDesignLeaks('className="text-[0.8rem]"')).toEqual([]);
  });

  it("does NOT flag a semantic token class with an opacity modifier", () => {
    expect(findDesignLeaks('className="bg-brand/10"')).toEqual([]);
  });

  it("does NOT flag a semantic foreground token class", () => {
    expect(findDesignLeaks('className="text-muted-foreground"')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The globals.css token parser (D-05 / D-16)
// ---------------------------------------------------------------------------

// The shape plan 10-03 will create: court is BOTH the default (`:root`) and a named theme, grove is
// named only, a plain `:root` carries the global-only tokens, and `.dark` redeclares `--brand`.
const FIXTURE_CSS = `
@import "tailwindcss";

@theme inline {
  --color-brand: var(--brand);
}

:root,
[data-theme="court"] {
  /* FitOut Coral */
  --brand: oklch(0.58 0.208 25);
  --brand-foreground: oklch(0.985 0 0);
}

[data-theme="grove"] {
  --brand: oklch(0.5445 0.09 190);
  --brand-foreground: oklch(0.985 0 0);
}

:root {
  --z-dialog: 30;
}

.dark {
  --brand: oklch(0.9 0 0);
}

@layer base {
  body {
    --brand: oklch(0 0 0);
  }
}
`;

describe("config/design-tokens-source.mjs", () => {
  it("declares the two theme names and a hard-coded stylesheet path (T-10-08)", () => {
    expect(THEME_NAMES).toEqual(["court", "grove"]);
    expect(GLOBALS_CSS_PATH.replace(/\\/g, "/")).toMatch(/src\/app\/globals\.css$/);
  });

  it("returns exactly the two theme blocks", () => {
    const tokens = parseThemeTokens(FIXTURE_CSS);
    expect(Object.keys(tokens).sort()).toEqual(["court", "grove"]);
  });

  it("reads court from the `:root, [data-theme=court]` selector LIST", () => {
    expect(parseThemeTokens(FIXTURE_CSS).court).toEqual({
      "--brand": "oklch(0.58 0.208 25)",
      "--brand-foreground": "oklch(0.985 0 0)",
    });
  });

  it("reads grove from its own block", () => {
    expect(parseThemeTokens(FIXTURE_CSS).grove["--brand"]).toBe(
      "oklch(0.5445 0.09 190)",
    );
  });

  it("never leaks the `.dark` value into a theme block", () => {
    // `.dark` redeclares --brand; a parser that saw it would overwrite BOTH themes with oklch(0.9 0 0).
    const tokens = parseThemeTokens(FIXTURE_CSS);
    expect(tokens.court["--brand"]).not.toBe("oklch(0.9 0 0)");
    expect(tokens.grove["--brand"]).not.toBe("oklch(0.9 0 0)");
  });

  it("keeps the global-only tokens out of the theme blocks (D-05 / THEME-02)", () => {
    const tokens = parseThemeTokens(FIXTURE_CSS);
    expect(tokens.court["--z-dialog"]).toBeUndefined();
    expect(tokens.grove["--z-dialog"]).toBeUndefined();
    // …which is what makes THEME-02's key-set equality assertion possible at all.
    expect(Object.keys(tokens.court).sort()).toEqual(
      Object.keys(tokens.grove).sort(),
    );
  });

  it("returns ONLY the plain `:root` block from the global read", () => {
    expect(parseGlobalTokens(FIXTURE_CSS)).toEqual({ "--z-dialog": "30" });
  });

  it("returns an empty map for an absent theme rather than throwing", () => {
    // Documented contract: an empty map is never a pass — consumers must assert non-emptiness.
    expect(parseThemeTokens(":root { --brand: red; }").grove).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// The compile-CSS helper — see helpers/compile-css.ts for the THEME-04 spike verdict
// ---------------------------------------------------------------------------

describe("tests/design/helpers/compile-css.ts", () => {
  it("compiles the real globals.css through Tailwind, with no database", async () => {
    const css = await compileGlobalsCss();
    // A near-empty result is what an unresolved `@import "tailwindcss"` produces; both assertions
    // exist so a broken compile fails here rather than silently emptying every later gate.
    expect(css.length).toBeGreaterThan(10000);
    expect(css).toContain(".bg-background");
  }, 60_000);

  it("reads a declaration body and a custom property out of compiled CSS", async () => {
    const css = await compileGlobalsCss();
    expect(customPropertyValue(css, "--brand")).toMatch(/^oklch\(/);
    expect(customPropertyValue(css, "brand")).toMatch(/^oklch\(/);
    expect(customPropertyValue(css, "--not-a-real-token")).toBeNull();
    expect(declarationsFor(css, ".bg-background")).toContain("background-color");
    expect(declarationsFor(css, ".no-such-rule-anywhere")).toBeNull();
  }, 60_000);
});

// ---------------------------------------------------------------------------
// GATE-06 — the migrations v1.0 and v1.1 shipped are IMMUTABLE (plan 12-01; RE-SCOPED 2026-08-31)
// ---------------------------------------------------------------------------
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// RE-SCOPED BY RULING ON 2026-08-31, DURING PHASE 18 PLAN 18-02. IT WAS NOT BUMPED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
// The two look identical in a diff and only one of them is legitimate, so the distinction is
// written down rather than left to be inferred.
//
// THE OLD INVARIANT, quoted so the history stays legible and nobody re-litigates it — this was the
// `GATE_06_TELL` constant, shared by both assertions below:
//
//     "GATE-06: this is a v1.1 phase and v1.1 phases ship on the v1.0 schema. A migration appearing
//      in `drizzle/` means the work has grown a database change that no v1.1 plan budgeted for. That
//      is a SCOPE ALARM TO RAISE, never one to absorb: do not bump the pinned number to make this
//      green, and do not delete the migration to make it green either. Take it to the phase owner."
//
// IT WAS TAKEN TO THE PHASE OWNER. Plan 18-02 added `0026_host_verification_listing_review.sql` and
// `0027_cancelled_by_ops.sql`, hit this gate, STOPPED with nothing touched, and raised it. The ruling:
//
// THE INVARIANT IS FINISHED, NOT STALE AND NOT VIOLATED. "v1.1 ships zero schema migrations" was a
// milestone-scoped promise and it was KEPT — v1.1 closed 2026-08-31 with `drizzle/` still ending at
// `0025_audit_resolved_by.sql`, recorded as a kept promise at `.planning/PROJECT.md:107`. Phase 18 is
// **v1.2** (`.planning/ROADMAP.md:75-80`, added ahead of the milestone cycle by PM decision on
// 2026-09-01) and its LOCKED context mandates these migrations (D-220, D-221, D-240). The gate's own
// premise sentence — "this is a v1.1 phase" — simply stopped being true.
//
// WHAT SURVIVES INTO v1.2: the migrations that have ALREADY RUN against production data cannot be
// deleted or renamed. That never expires. WHAT DOES NOT: the freeze on new migrations. The equality
// pins (`LAST_MIGRATION`, `MIGRATION_COUNT`) are replaced by a monotonic FLOOR, because a gate that
// must be bumped once per migration stops being read and starts being bumped reflexively — which is
// how a real alarm dies. 18-09 already adds another migration in this same phase.
//
// THE BYTE-LEVEL half of this gate lives in `tests/design/money-path-invariants.test.ts`
// (`SHIPPED_MIGRATION_DIGEST`), which carries the full ruling and both red-watch records. This file
// keeps the presence half.
//
// WHY IT LIVES IN THE DESIGN GATE AND NOT IN THE DB SUITE, which is the first question a reader has.
// This assertion must run on a machine with no Docker and no Postgres, and it must run inside
// `next build` — `vitest.design.config.ts` is the only config in this repo that can promise that
// (it has no `globalSetup` and no `setupFiles`, by design). A migration tripwire that needs a
// database to tell you a migration appeared is a tripwire nobody runs. It also touches no database
// here: it reads a DIRECTORY LISTING, which is the same kind of tree scan the leak-pattern gates
// above perform.
//
// WHY IT IS AN ASSERTION AND NOT A SENTENCE IN A PLANNING DOCUMENT. Migrations are the one file
// class nobody diffs carefully, because they are append-only and always LOOK additive. A deleted or
// renamed historical migration reads as tidy-up in a diff and is a production/dev schema split in
// fact. The whole value of this file is that the boundary is checked on every run of the build
// rather than remembered at review time.
//
// WATCHED RED, TWICE, UNDER THE OLD SHAPE — a zero-byte `drizzle/0026_probe.sql` created, run,
// removed (18 August 2026). `npx vitest run --config vitest.design.config.ts tests/design/infra.test.ts`
// → 2 failed / 28 passed; both equality clauses fired while the guard-the-guard stayed green.
// ⚠ THAT RECORD IS NOW HISTORICAL: those two clauses were the "no new migration" freeze, and it is
// exactly what the 2026-08-31 ruling retired. It is kept because it documents that the DIRECTORY
// SCAN itself works — the mechanism the surviving clause still depends on.
//
// RE-WATCHED RED UNDER THE NEW SHAPE (2026-08-31, plan 18-02), because a gate that has never failed
// for the right reason under its current shape is not evidence:
//   mutation : `git mv drizzle/0014_phase7_ledger_kind.sql drizzle/0014_renamed.sql`
//   command  : npx vitest run --config vitest.design.config.ts \
//                tests/design/money-path-invariants.test.ts tests/design/infra.test.ts
//   observed : RED, 3 failed / 33 passed.
//                × still holds every migration v1.0 and v1.1 shipped
//                AssertionError: GATE-06: a migration that has ALREADY RUN against production data is
//                missing from `drizzle/`. … Do NOT 'fix' this by trimming SHIPPED_MIGRATIONS. …
//                (ADDING a new migration is fine and expected in v1.2 — this gate no longer freezes
//                the directory.)
//                1 shipped migration(s) are missing from drizzle/:
//                  0014_phase7_ledger_kind.sql
//                expected [ '0014_phase7_ledger_kind.sql' ] to deeply equal []
//   ⚠ AND THE CONTROL THAT MATTERS: the two NEW v1.2 migrations (0026, 0027) were on disk for that
//     run — they appear in the failure's own "Found:" list — and NOTHING reddened about them. A floor
//     that reddened on additions would be the old gate wearing a new name. Under the old shape those
//     same two files failed four assertions across these two files.
//   restored : `git mv` back; `git status --short drizzle/` empty; re-run GREEN 36/36.
//
// NOT COVERED — a real blind spot, unchanged by the re-scoping: this reads FILENAMES. A migration
// whose SQL is edited in place, or schema drift introduced through `drizzle-kit push` without a
// file, is invisible HERE. That half is covered by `SHIPPED_MIGRATION_DIGEST` in
// `tests/design/money-path-invariants.test.ts`, which hashes the bytes.

/** The migration directory, as one constant — the vacuity probe is a one-line edit here. */
const DRIZZLE_DIR = resolve(process.cwd(), "drizzle");

/**
 * THE SHIPPED SET — every migration that ran against production data under v1.0 and v1.1. CLOSED and
 * never growing: v1.1 closed 2026-08-31 at `0025_audit_resolved_by.sql`, and nothing already applied
 * can be added to history retroactively.
 *
 * Named exhaustively rather than derived as "everything <= 0025", because a derived bound treats a
 * DELETED file as merely out of range and stays green — and deletion is one of the two things this
 * gate now exists to catch.
 *
 * ⚠ KEPT IN SYNC BY HAND with `SHIPPED_MIGRATIONS` in `tests/design/money-path-invariants.test.ts`.
 * Two copies is deliberate and is the lesser evil: that file is the money-path gate and imports
 * nothing from here, and a shared helper would give one `readdirSync` mistake the power to blind both
 * gates at once. They are 26 frozen strings that will never change again.
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
 * The failure message.
 *
 * It says what to DO, because the correct response to this red is neither "trim the list" nor "delete
 * the constant". The pre-2026-08-31 version of this string forbade ADDING a migration; that clause is
 * retired (see the header). What it forbids now is losing one.
 */
const GATE_06_TELL =
  "GATE-06: a migration that has ALREADY RUN against production data is missing from `drizzle/`. " +
  "Drizzle's journal keys on these filenames, so renaming one desyncs every database that has " +
  "applied it, and deleting one means a fresh clone builds a DIFFERENT schema than production runs. " +
  "Do NOT 'fix' this by trimming SHIPPED_MIGRATIONS. Restore the file, or take it to the phase owner. " +
  "(ADDING a new migration is fine and expected in v1.2 — this gate no longer freezes the directory.)";

describe("GATE-06 — the migrations v1.0 and v1.1 shipped are immutable", () => {
  const entries = (() => {
    try {
      return readdirSync(DRIZZLE_DIR);
    } catch {
      // `[]` rather than a throw, for `skeleton-measurements.test.ts`'s reason: a broken scan must
      // surface as one named guard-the-guard failure, not as a stack trace that buries which gate
      // went quiet.
      return [] as string[];
    }
  })();
  const migrations = entries.filter((name) => name.endsWith(".sql")).sort();

  // GUARD THE GUARD, ASSERTED FIRST. Both real assertions below are claims about a LIST, and a
  // directory that could not be read yields an empty list — which would make "the last migration is
  // 0025" fail loudly (good) but a count check against 0 pass trivially if it were ever relaxed to a
  // floor. Assert the listing is non-empty before asserting anything about its contents.
  it("read a non-empty migration directory", () => {
    expect(
      entries.length,
      `${DRIZZLE_DIR} listed no entries at all. Every assertion below is about that listing; an ` +
        "empty one is a broken scan, not a clean tree.",
    ).toBeGreaterThan(0);
    expect(migrations.length, "no `*.sql` files in the migration directory").toBeGreaterThan(0);
  });

  it("still holds every migration v1.0 and v1.1 shipped", () => {
    const present = new Set(migrations);
    const missing = SHIPPED_MIGRATIONS.filter((name) => !present.has(name));

    expect(
      missing,
      `${GATE_06_TELL}\n\n${missing.length} shipped migration(s) are missing from drizzle/:\n  ` +
        `${missing.join("\n  ")}\n\nFound: ${migrations.join(", ")}`,
    ).toEqual([]);
  });

  it("never shrinks below the shipped count", () => {
    // A FLOOR, and the inversion of what this clause used to be. It was an EQUALITY — deliberately, so
    // that it would catch an ADDITION — and that is precisely the half the 2026-08-31 ruling retired,
    // because v1.2 phases ship migrations by design.
    //
    // The floor still earns its place beside the presence check above, because the two fail on
    // different inputs: presence catches a rename or deletion BY NAME, while this catches a directory
    // that shrank in some way the name list cannot see (a truncated checkout, a partial clone, a
    // `readdirSync` that returned a subset). Cheap, and it fails with a different sentence.
    expect(
      migrations.length,
      `drizzle/ holds ${migrations.length} .sql files, fewer than the ${SHIPPED_MIGRATIONS.length} ` +
        `that v1.0 and v1.1 shipped. History cannot shrink.\n\n${GATE_06_TELL}`,
    ).toBeGreaterThanOrEqual(SHIPPED_MIGRATIONS.length);
  });
});
