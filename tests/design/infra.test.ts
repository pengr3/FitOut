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
// GATE-06 — a v1.1 phase adds NO schema migration (plan 12-01)
// ---------------------------------------------------------------------------
//
// WHY IT LIVES IN THE DESIGN GATE AND NOT IN THE DB SUITE, which is the first question a reader has.
// This assertion must run on a machine with no Docker and no Postgres, and it must run inside
// `next build` — `vitest.design.config.ts` is the only config in this repo that can promise that
// (it has no `globalSetup` and no `setupFiles`, by design). A migration tripwire that needs a
// database to tell you a migration appeared is a tripwire nobody runs. It also touches no database
// here: it reads a DIRECTORY LISTING, which is the same kind of tree scan the leak-pattern gates
// above perform.
//
// WHY IT IS AN ASSERTION AND NOT A SENTENCE IN A PLANNING DOCUMENT. GATE-06 is a scope boundary:
// v1.1 phases ship on the v1.0 schema. A phase that quietly adds `0026_*.sql` has changed what
// "v1.1" means, and it does so in the one file class nobody diffs carefully because migrations are
// append-only and always look additive. The whole value of this file is that the boundary is checked
// on every run of the build rather than remembered at review time.
//
// WATCHED RED — a zero-byte `drizzle/0026_probe.sql` created, run, removed (18 August 2026).
// `npx vitest run --config vitest.design.config.ts tests/design/infra.test.ts` → 2 failed / 28
// passed. BOTH real assertions fired — the lexically-last check and the count — while the
// guard-the-guard stayed green, which is the correct shape: the guard says the listing was read, the
// two clauses say what was in it. The count's failure, VERBATIM (truncated at the file list):
//
//   AssertionError: GATE-06: this is a v1.1 phase and v1.1 phases ship on the v1.0 schema. … That is
//   a SCOPE ALARM TO RAISE, never one to absorb: do not bump the pinned number to make this green,
//   and do not delete the migration to make it green either. Take it to the phase owner. Found:
//   0000_sturdy_nighthawk.sql, … 0025_audit_resolved_by.sql, 0026_probe.sql: expected 27 to be 26
//
//     - Expected
//     + Received
//
//     - 26
//     + 27
//
// Probe removed (`git status drizzle/` clean) → 30 passed.
//
// NOT COVERED — a real blind spot: this reads FILENAMES. A migration whose SQL is edited in place,
// or schema drift introduced through `drizzle-kit push` without a file, is invisible here. It
// catches the common shape (a new numbered file), not every shape.

/** The migration directory, as one constant — the vacuity probe is a one-line edit here. */
const DRIZZLE_DIR = resolve(process.cwd(), "drizzle");

/** The last migration v1.0 shipped. GATE-06 says v1.1 does not add another. */
const LAST_MIGRATION = "0025_audit_resolved_by.sql";

/** How many `*.sql` files that directory holds today. MEASURED (18 August 2026), not guessed. */
const MIGRATION_COUNT = 26;

/**
 * The failure message both assertions share.
 *
 * It says what to DO, because the correct response to this red is neither "bump the number" nor
 * "delete the file" — it is to stop and raise the scope question with a human.
 */
const GATE_06_TELL =
  "GATE-06: this is a v1.1 phase and v1.1 phases ship on the v1.0 schema. A migration appearing in " +
  "`drizzle/` means the work has grown a database change that no v1.1 plan budgeted for. That is a " +
  "SCOPE ALARM TO RAISE, never one to absorb: do not bump the pinned number to make this green, and " +
  "do not delete the migration to make it green either. Take it to the phase owner.";

describe("GATE-06 — drizzle/ is frozen at the v1.0 schema", () => {
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

  it("still ends at the v1.0 migration", () => {
    expect(migrations[migrations.length - 1], GATE_06_TELL).toBe(LAST_MIGRATION);
  });

  it("holds exactly the migration count v1.0 shipped", () => {
    // An EQUALITY and not a floor, unlike most counts in this suite. A floor would notice a deletion
    // and wave through an addition, and addition is the direction GATE-06 is about. It also catches
    // the case the assertion above cannot: a migration numbered BELOW 0025 (a rebase artefact, a
    // renumbered branch) leaves the lexically-last file unchanged.
    expect(
      migrations.length,
      `${GATE_06_TELL} Found: ${migrations.join(", ")}`,
    ).toBe(MIGRATION_COUNT);
  });
});
