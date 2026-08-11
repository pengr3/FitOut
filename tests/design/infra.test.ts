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
