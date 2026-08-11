// DS-02 — the type scale is a PER-THEME token contract, and it is one because it has to be.
//
// WHY THIS FILE EXISTS. The obvious way to build a two-theme type scale is to declare the four
// semantic roles per theme and stop. That produces two themes whose headings render IDENTICALLY,
// and it does so silently. The cause is a cascade detail, not a typo: a co-located utility beats a
// named step's fallback. `.text-heading` emits `font-weight: var(--tw-font-weight, <role weight>)`,
// and `font-semibold` — 98 occurrences in this repo — sets `--tw-font-weight`, so the role's weight
// is never reached on any heading that also carries the utility. The same holds for
// `tracking-tight` (34) and `leading-tight` (24). The fix is not to edit 156 call sites; it is to
// make `--font-weight-*`, `--tracking-*` and `--leading-*` per-theme tokens too. This file asserts
// that they are, because "grove's headings look the same as court's" is exactly the kind of defect
// a human reviewer signs off on.
//
// WHY IT READS BOTH THE SOURCE AND THE COMPILED OUTPUT. Which block DECLARES what is a structural
// property of the authored file, so the token assertions read the parser. But whether a named step
// resolves at the element — the property that makes a nested themed subtree re-skin its type — is
// only legible in what Tailwind EMITS, so the four-property assertion reads the compiler. jsdom can
// do neither: it does not substitute `var()` and it ignores `@layer` entirely (see the THEME-04
// SPIKE verdict in helpers/compile-css.ts).
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • This proves the two themes declare different NUMBERS. It says nothing about whether the
//     resulting type is legible, well-paired, or hierarchical — that is a human look at
//     `/dev/theme`, and Phase 11's screenshot gate.
//   • It cannot see a component that hardcodes `text-[28px]`; the leak gate owns that.
//   • It asserts the named steps COMPILE correctly, not that anything uses them. The call-site
//     migrations are later plans, which is precisely why the compile here is safelisted.

import { describe, it, expect } from "vitest";

import {
  readThemeTokens,
  compileGlobalsCssWith,
  declarationsFor,
  THEME_NAMES,
} from "./helpers/compile-css";

/** The four declared semantic roles. There is no fifth. */
const ROLES = ["display", "heading", "body", "label"] as const;

/** The four facets every role must declare. A role that only controls size is not a role. */
const FACETS = ["--fs-", "--lh-", "--fw-", "--ls-"] as const;

/**
 * Every token family that must travel per theme. The last four are the ones Pitfall 4 is about:
 * without them a co-located utility freezes the type at Tailwind's defaults in both themes.
 */
const TYPE_PREFIXES = [
  "--fs-",
  "--lh-",
  "--fw-",
  "--ls-",
  "--text-",
  "--font-weight-",
  "--tracking-",
  "--leading-",
] as const;

/** Tailwind's built-in ladder, re-declared per theme so 399 existing call sites re-skin for free. */
const BUILT_IN_LADDER = [
  "--text-xs",
  "--text-sm",
  "--text-base",
  "--text-lg",
  "--text-xl",
  "--text-2xl",
] as const;

const themes = readThemeTokens();

/** The type-related keys a theme declares, sorted. */
function typeKeysOf(theme: string): string[] {
  return Object.keys(themes[theme] ?? {})
    .filter((key) => TYPE_PREFIXES.some((prefix) => key.startsWith(prefix)))
    .sort();
}

/** A token's leading number — `1.75rem` → 1.75, `600` → 600, `-0.02em` → -0.02. */
function numberOf(theme: string, token: string): number {
  const raw = themes[theme]?.[token];
  expect(raw, `${theme} does not declare ${token}`).toBeDefined();
  const parsed = Number.parseFloat(String(raw));
  expect(
    Number.isFinite(parsed),
    `${theme}'s ${token} is not numeric: ${raw}`,
  ).toBe(true);
  return parsed;
}

describe("DS-02 — every type family travels per theme", () => {
  it("declares all four facets of all four roles in both themes", () => {
    for (const theme of THEME_NAMES) {
      for (const role of ROLES) {
        for (const facet of FACETS) {
          expect(
            themes[theme]?.[`${facet}${role}`],
            `${theme} is missing ${facet}${role}`,
          ).toBeDefined();
        }
      }
    }
  });

  it("declares the identical type key set in court and grove (THEME-02)", () => {
    const court = typeKeysOf("court");
    const grove = typeKeysOf("grove");
    // Reported both ways round so a failure names WHICH block is short, not just "not equal".
    expect(
      court.filter((key) => !grove.includes(key)),
      "declared in court but missing from grove",
    ).toEqual([]);
    expect(
      grove.filter((key) => !court.includes(key)),
      "declared in grove but missing from court",
    ).toEqual([]);
    expect(court).toEqual(grove);
  });

  it("re-declares Tailwind's whole built-in ladder in both themes", () => {
    for (const theme of THEME_NAMES) {
      for (const step of BUILT_IN_LADDER) {
        expect(
          themes[theme]?.[step],
          `${theme} is missing ${step}`,
        ).toBeDefined();
      }
    }
  });
});

describe("D-01 / D-02 — grove's type is genuinely bigger, heavier and looser", () => {
  it("moves UP from court's display size", () => {
    // D-02: grove moves up, never down. A value hardcoded near today's numbers cannot hide behind
    // a theme that shrank towards it.
    expect(numberOf("grove", "--fs-display")).toBeGreaterThan(
      numberOf("court", "--fs-display"),
    );
  });

  it("moves UP on every step of the built-in ladder too", () => {
    for (const step of BUILT_IN_LADDER) {
      expect(
        numberOf("grove", step),
        `grove's ${step} should be larger than court's`,
      ).toBeGreaterThan(numberOf("court", step));
    }
  });

  it("carries a heavier emphasis weight than court", () => {
    expect(themes.grove["--font-weight-semibold"]).toBe("700");
    expect(themes.court["--font-weight-semibold"]).toBe("600");
  });

  it("relaxes the tracking a co-located `tracking-tight` would otherwise freeze", () => {
    // Without this token being per-theme, all 34 `tracking-tight` sites render court's -0.02em in
    // grove as well — the Pitfall 4 shape, invisible in review.
    expect(numberOf("grove", "--tracking-tight")).toBeGreaterThan(
      numberOf("court", "--tracking-tight"),
    );
  });

  it("loosens the leading a co-located `leading-tight` would otherwise freeze", () => {
    expect(numberOf("grove", "--leading-tight")).toBeGreaterThan(
      numberOf("court", "--leading-tight"),
    );
  });
});

describe("two weights per theme — the medium step is aliased, deliberately", () => {
  it("collapses medium onto the emphasis weight in both themes", () => {
    // INTENTIONAL, not a bug: two weights is the contract, and the alias is what lets the 70
    // shipped `font-medium` call sites need zero edits. The 500-to-600 shift in court is an
    // accepted visible change. A future reader "fixing" this back to 500 reintroduces a third step.
    for (const theme of THEME_NAMES) {
      expect(
        themes[theme]["--font-weight-medium"],
        `${theme} should alias its medium step onto its emphasis weight`,
      ).toBe(themes[theme]["--font-weight-semibold"]);
    }
  });

  it("keeps the normal weight distinct from the emphasis weight", () => {
    for (const theme of THEME_NAMES) {
      expect(themes[theme]["--font-weight-normal"]).not.toBe(
        themes[theme]["--font-weight-semibold"],
      );
    }
  });
});

describe("the named steps compile to all four properties", () => {
  // Safelisted: nothing in `src/**` says `text-display` yet — the call-site migrations are later
  // plans — and Tailwind only emits a utility its content scan finds. See compileGlobalsCssWith.
  const FORCED = [
    "text-display",
    "text-heading",
    "text-body",
    "text-label",
    "text-figure",
  ];

  it.each(ROLES)("`.text-%s` sets size, leading, tracking AND weight", async (role) => {
    const css = await compileGlobalsCssWith(FORCED);
    const body = declarationsFor(css, `.text-${role}`);
    expect(body, `no .text-${role} rule was emitted at all`).not.toBeNull();
    // The slash-modifier form (`text-display/tight`) drops the last two silently. Asserting all
    // four here is what would catch a future step authored as a bare size.
    expect(body).toContain("font-size:");
    expect(body).toContain("line-height:");
    expect(body).toContain("letter-spacing:");
    expect(body).toContain("font-weight:");
  });

  it("keeps the var() indirection that makes a step re-skin at the element", async () => {
    const css = await compileGlobalsCssWith(FORCED);
    for (const role of ROLES) {
      const body = declarationsFor(css, `.text-${role}`) ?? "";
      // `var(--fs-display)`, never a flattened `1.75rem`. A literal here is the same failure class
      // as dropping the word `inline` from @theme: the root switcher survives, nesting dies.
      expect(body, `.text-${role} lost its var() indirection`).toContain(
        `var(--fs-${role})`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Guard the guard (T-10-06). Two empty maps are trivially equal, and a compile
// that emitted nothing would pass every `not.toBeNull()` above only by accident.
// ---------------------------------------------------------------------------
describe("guard-the-guard", () => {
  it("parsed at least 45 keys from each theme", () => {
    for (const theme of THEME_NAMES) {
      expect(
        Object.keys(themes[theme] ?? {}).length,
        `${theme} parsed too few keys to be the real block`,
      ).toBeGreaterThanOrEqual(45);
    }
  });

  it("safelisting cannot fabricate a step that was never declared", () => {
    // The positive control for the whole compiled-CSS section. `text-figure` is safelisted
    // alongside the four real roles and is declared nowhere, so if it were emitted anyway the
    // assertions above would be proving something about the safelist rather than about @theme.
    return expect(
      compileGlobalsCssWith([
        "text-display",
        "text-heading",
        "text-body",
        "text-label",
        "text-figure",
      ]).then((css) => declarationsFor(css, ".text-figure")),
    ).resolves.toBeNull();
  });
});
