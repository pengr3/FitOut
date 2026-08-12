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
// THE SECOND CLAUSE, ADDED BY PLAN 10-11. DS-02 ends "…and no surface uses an arbitrary pixel font
// size", and that half is not a token property at all — it is a property of the source tree. A
// surface that measures its own font size in pixels is FROZEN: the theme switcher will resize every
// step around it and never reach it, so a swap that looks complete in `globals.css` silently leaves
// page titles and money figures at the old size. The scan at the bottom of this file is the half of
// DS-02 the token assertions above cannot see.
//
// OBSERVED RED, NOT ASSUMED (T-10-42, recorded per the plan's acceptance criteria):
//   • An arbitrary pixel display size reinstated on the `<h1>` in `src/app/page.tsx` → this file
//     exits NON-ZERO: **2 failed / 27 passed**, on exactly the two assertions that should care —
//     "finds zero arbitrary pixel font sizes anywhere under src/", whose diff named the file and
//     quoted the offending class, and the Display inventory, whose diff showed `src/app/page.tsx`
//     missing from the eight files that must carry the step. Every token assertion above stayed
//     green, which is both the correct blast radius and the whole argument for the scan: a theme
//     contract cannot tell you whether anything obeys it.
//   • Reverted → exits 0 with **29 passed**.
//   • [10-16] The four role names removed from the `extendTailwindMerge` registration in
//     `src/lib/utils.ts` → **5 failed / 30 passed**: the four per-role merge assertions and the
//     size-conflict assertion. The colour control stayed GREEN, which is the correct blast radius —
//     the fix is a font-size registration, not a blanket `text-*` exemption. Restored → 35 passed.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • This proves the two themes declare different NUMBERS. It says nothing about whether the
//     resulting type is legible, well-paired, or hierarchical — that is a human look at
//     `/dev/theme`, and Phase 11's screenshot gate.
//   • The scan proves the class NAMES are right. It cannot see general `cn()`/tailwind-merge
//     precedence at a call site, nor an inline `style={{ fontSize }}`, nor a font size arriving from
//     a CSS module. Phase 11's GATE-01 screenshots see real pixels. ONE specific case of that blind
//     spot is now closed rather than merely listed — see the merge block added by plan 10-16 below,
//     which found the four named roles being silently DELETED by the repo's own `cn()`.
//   • It asserts the named steps COMPILE correctly, and separately that 12 call sites USE the
//     Display step — not that any of the other three roles has an adopter yet.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";

import { cn, TYPE_ROLES } from "@/lib/utils";

import {
  readThemeTokens,
  compileGlobalsCssWith,
  declarationsFor,
  GLOBALS_CSS_PATH,
  THEME_NAMES,
} from "./helpers/compile-css";

/**
 * The declared semantic roles, READ OUT OF THE STYLESHEET rather than typed here (WR-10).
 *
 * `globals.css`'s `@theme inline` block is the only place a role becomes real — registering
 * `--text-<role>` there is what makes `text-<role>` a Tailwind utility at all. Everything else is a
 * copy, and there were three of them: this constant, the `extendTailwindMerge` call in
 * `src/lib/utils.ts`, and the stylesheet itself, with nothing deriving from anything.
 *
 * That is the defect, and it is worse than ordinary duplication because the failure is SILENT and
 * points the wrong way. Add `--text-caption` to the stylesheet and write
 * `cn("text-caption", "text-muted-foreground")`: tailwind-merge, never told `caption` is a font-size
 * role, treats it as a text COLOUR, and deletes it. The call site looks migrated, `tsc` is happy,
 * the leak gate is happy, and the heading silently renders at the inherited size — precisely the
 * defect plan 10-16 fixed for the original four. Every test stayed green because every test's idea
 * of "the roles" was a copy that had never heard of the fifth.
 *
 * Deriving from the source of truth makes the next role's arrival LOUD instead: it appears here
 * automatically, and the assertion below immediately reports that `utils.ts` has not learned it.
 *
 * WHAT COUNTS AS A ROLE, precisely: a `--text-<name>` whose value is `var(--fs-<name>)`. That is
 * not a heuristic, it is the definition — a semantic role is a text step wired to the per-theme
 * font-size family, which is exactly what makes it travel between court and grove. The same
 * `@theme inline` block also re-declares Tailwind's DEFAULT t-shirt steps (`--text-sm`,
 * `--text-base`, `--text-lg`, …), which point at fixed values, are not per-theme, and are not
 * roles; requiring the `--fs-` wiring separates the two without naming either.
 *
 * The facet declarations (`--text-display--line-height` and friends) fall out for free: their
 * values are `var(--lh-…)`, not `var(--fs-…)`.
 */
const ROLES: readonly string[] = (() => {
  const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
  const start = css.indexOf("@theme inline");
  if (start < 0) throw new Error("type-scale: no `@theme inline` block in globals.css");
  const themeInline = css.slice(start);
  const names = new Set<string>();
  for (const m of themeInline.matchAll(
    /^\s*--text-([a-z][a-z0-9-]*)\s*:\s*var\(\s*--fs-([a-z][a-z0-9-]*)\s*\)/gm,
  )) {
    if (m[1] === m[2]) names.add(m[1]);
  }
  return [...names].sort();
})();

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
// DS-02, the class-composition half (plan 10-16). A role that survives the
// compiler and dies in `cn()` is still a role nobody renders.
// ---------------------------------------------------------------------------
describe("the named steps survive the repo's own class merge", () => {
  // MEASURED WHILE BUILDING `/dev/theme`, which is the first surface to use the three non-Display
  // roles at all. tailwind-merge tries the font-size group first (t-shirt sizes, arbitrary lengths)
  // and falls through to the text-COLOUR group, whose matcher accepts ANY value. `display`,
  // `heading`, `body` and `label` match none of the size shapes, so out of the box every one of them
  // was classified as a colour and lost to any colour utility merged after it:
  //
  //     twMerge("text-label", "text-muted-foreground")  →  "text-muted-foreground"
  //
  // Same defect class as the slash-modifier trap `globals.css` warns about, with a sharper edge: the
  // call site looks migrated, `tsc` passes, the source scan above passes (the class NAME is right),
  // and the element renders at the inherited size. `src/lib/utils.ts` now registers the four names
  // under Tailwind's `--text-*` theme namespace; these assertions are what stop that being undone.
  it.each(ROLES)("keeps `text-%s` when a colour utility is merged after it", (role) => {
    const merged = cn(`text-${role}`, "text-muted-foreground");
    expect(merged, `cn() deleted text-${role}`).toContain(`text-${role}`);
    expect(merged, "cn() deleted the colour instead").toContain("text-muted-foreground");
  });

  it("still resolves a role against a SIZE as a genuine conflict", () => {
    // The other half of the fix, and the reason it is a font-size registration rather than an
    // exemption: two sizes on one element must still collapse to the last one, or the merge has
    // stopped merging. `sm:text-display` beside `text-2xl` is the shipped shape this protects.
    expect(cn("text-sm", "text-display")).toBe("text-display");
    expect(cn("text-display", "text-sm")).toBe("text-sm");
  });

  it("leaves real colour conflicts resolving as colours", () => {
    // THE CONTROL ON THE FIX. A registration that swallowed the whole `text-*` space would make this
    // return both classes, and every colour merge in the app would silently stop working.
    expect(cn("text-foreground", "text-muted-foreground")).toBe("text-muted-foreground");
  });

  it("registers EVERY role the stylesheet declares, so a fifth cannot be forgotten (WR-10)", () => {
    // THE INVARIANT, and the one assertion above that is not about behaviour. Everything else in
    // this block tests the four roles that exist; none of it would notice a fifth. `ROLES` is now
    // read out of `@theme inline`, so this compares the SOURCE OF TRUTH against the list `cn()`
    // actually runs on — and a role added to the stylesheet without touching `utils.ts` fails here,
    // naming the constant to edit, instead of silently reintroducing the deletion bug.
    expect([...TYPE_ROLES].sort()).toEqual([...ROLES]);
  });

  it("read the roles out of the stylesheet rather than defaulting to a hard-coded four", () => {
    // GUARD-THE-GUARD on the derivation itself. If the `@theme inline` slice or the regex ever
    // stopped matching, `ROLES` would silently become `[]` — and an empty list makes the
    // `it.each(ROLES)` cases above vanish and the equality assertion pass only if `TYPE_ROLES` were
    // also empty. Anchoring on the four known-present names is what stops the derivation failing
    // open. It is a floor, not a pin: a fifth role must NOT require editing this line.
    expect(ROLES.length).toBeGreaterThanOrEqual(4);
    for (const known of ["body", "display", "heading", "label"]) {
      expect(ROLES, `the stylesheet no longer declares --text-${known}`).toContain(known);
    }
    // The facet declarations must not be counted as roles of their own.
    expect(ROLES).not.toContain("display--line-height");
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

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DS-02, SECOND CLAUSE — THE SOURCE SCAN (plan 10-11)
//
// WHY IT IS A SOURCE SCAN AND NOT A COMPILED-CSS ASSERTION. The obvious phrasing — "the compiled
// bundle contains no arbitrary pixel font-size utility" — is UNSOUND in this repo, and provably so:
// Tailwind's automatic content detection roots at the repository, so it also scans
// `.planning/**/*.md`. A sentence of planning PROSE therefore emits a utility (deferred item D-1,
// logged by plan 10-04, which measured `.bg-zinc-50` in the bundle from a fixture example in a
// research doc). Any claim of the form "utility X is/ is not in the output" can be satisfied — or
// broken — by a markdown file. The authored source is the only sound place to assert this.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const SRC_DIR = resolve(process.cwd(), "src");

/** The tree DS-02's second clause is written about. The walk is wider; the requirement is this. */
const GATE_TREE = ["src/app/", "src/components/"] as const;

/**
 * Every `sm:`-prefixed Display call site this phase created, and how many each file carries.
 *
 * Pinned per file rather than as a bare total so a failure says WHICH surface moved. A future plan
 * that legitimately adds a Display site updates this map — deliberately, in the same commit.
 */
const DISPLAY_INVENTORY: Readonly<Record<string, number>> = {
  "src/app/(app)/bookings/[id]/cancel/page.tsx": 1,
  "src/app/(app)/bookings/[id]/page.tsx": 4,
  "src/app/listings/[id]/book/page.tsx": 1,
  "src/app/listings/[id]/page.tsx": 1,
  "src/app/page.tsx": 1,
  "src/components/booking/refund-breakdown.tsx": 1,
  "src/components/group/headcount-meter.tsx": 1,
  "src/components/host/payout-summary.tsx": 2,
};

/**
 * The four vendored `text-[0.8rem]` sites — recorded, tolerated debt (UI-SPEC Resolved Q2).
 *
 * These are THE POSITIVE CONTROL for the whole section, and they are the reason the leak pattern is
 * deliberately px-only rather than "any arbitrary font size". A zero-violations assertion reads
 * exactly the same whether the tree is clean or the walker visited nothing, so the scan must be
 * shown finding something it is NOT allowed to report — in the vendored directory specifically,
 * because that is the subtree an "it's upstream's code" exemption would have quietly excused.
 */
const VENDORED_EXEMPTION: Readonly<Record<string, number>> = {
  "src/components/ui/button.tsx": 1,
  "src/components/ui/calendar.tsx": 2,
  "src/components/ui/toggle.tsx": 1,
};

/**
 * An arbitrary PIXEL font size — the frozen form this clause bans.
 *
 * Note that this regex's own source text cannot match itself (the escapes and the character class
 * are not the string it matches), so widening the walk to `tests/` later cannot make this file
 * report itself. That is not a given: it is the failure this phase has hit nine times, where a
 * comment naming a banned string is textually indistinguishable from the string.
 */
const ARBITRARY_PX = /text-\[-?[0-9.]+px\]/g;

/** The Display step at its one adopted breakpoint. */
const NAMED_DISPLAY = /sm:text-display/g;

/**
 * The forbidden slash-modifier form on any of the four roles (T-10-43).
 *
 * `text-display/tight` compiles to font-size and line-height ONLY. The per-theme letter-spacing and
 * weight vanish silently — which is to say the migration would look done and D-01 would still be
 * false on every migrated surface. All four roles are covered, not just the one in use today.
 */
const SLASH_MODIFIER = /text-(?:display|heading|body|label)\//g;

/** The vendored rem sites. Written literally because the control's whole job is to find them. */
const VENDORED_REM = /text-\[0\.8rem\]/g;

/** Collect every `.ts`/`.tsx`/`.css` file under a directory — the walker from focus-recipe.test.ts. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * WINDOWS PATH NORMALISATION — the idiom from `focus-recipe.test.ts:89`, load-bearing rather than
 * cosmetic. On this box `path.relative` emits backslash separators, while every path in the two
 * inventory maps above is written forward-slash. Without this line those maps stop matching and the
 * file passes vacuously — the exact shape the guard-the-guard block exists to catch.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/**
 * Remove comments that OPEN their own line, and nothing else.
 *
 * WHY THIS IS NEEDED. Two comments in this tree name banned strings on purpose, and both are good
 * comments: `button.tsx` records why its vendored rem site is exempt, and `globals.css` warns the
 * next author never to use the slash-modifier form. A raw text scan reads both as violations and
 * would push authors to stop writing the very warnings that prevent the defect.
 *
 * WHY IT IS LINE-ORIENTED AND NOT A `/\*…*\/` REGEX. Because that regex is actively wrong here, and
 * measurably so: `src/app/(app)/profile/profile-form.tsx` carries `accept="image/*"` inside a JSX
 * string at line 109, and the next block-comment terminator in that file is 86 lines later, at line
 * 195 (this docstring cannot quote that terminator without ending itself, which is its own small
 * illustration of the problem). A naive block strip therefore
 * deletes 86 lines of real markup — and a violation scan whose stripper eats a third of a file
 * reports a clean tree it never read. So a comment must OPEN its line (optionally wrapped in JSX
 * braces) to be recognised, and a trailing `//` never truncates a line of code.
 */
function stripLeadingComments(text: string): string {
  const out: string[] = [];
  let inBlock = false;

  for (const raw of text.split("\n")) {
    let line = raw;

    if (inBlock) {
      const close = line.indexOf("*/");
      if (close === -1) {
        out.push("");
        continue;
      }
      line = line.slice(close + 2);
      inBlock = false;
    }

    const opener = /^\s*\{?\s*\/\*/.exec(line);
    if (opener) {
      const close = line.indexOf("*/", opener[0].length);
      if (close === -1) {
        inBlock = true;
        out.push("");
        continue;
      }
      line = line.slice(close + 2);
    }

    if (/^\s*\/\//.test(line)) {
      out.push("");
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

interface TypeScan {
  /** Normalised forward-slash paths of every file the walker visited. */
  scanned: string[];
  /** The subset under `src/app/**` or `src/components/**` — DS-02's stated tree. */
  gateFiles: string[];
  /** `file: match` for every arbitrary pixel font size found in non-comment source. */
  arbitraryPx: string[];
  /** `file: match` for every slash-modifier use of a named role. */
  slashModifier: string[];
  /** Per-file count of `sm:text-display`. */
  display: Record<string, number>;
  /** Per-file count of the vendored rem exemption. */
  vendoredRem: Record<string, number>;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanSrc(): TypeScan {
  const scan: TypeScan = {
    scanned: [],
    gateFiles: [],
    arbitraryPx: [],
    slashModifier: [],
    display: {},
    vendoredRem: {},
  };

  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    const code = stripLeadingComments(readFileSync(file, "utf8"));

    scan.scanned.push(name);
    if (GATE_TREE.some((prefix) => name.startsWith(prefix))) scan.gateFiles.push(name);

    for (const m of code.matchAll(ARBITRARY_PX)) scan.arbitraryPx.push(`${name}: ${m[0]}`);
    for (const m of code.matchAll(SLASH_MODIFIER)) scan.slashModifier.push(`${name}: ${m[0]}`);

    const display = [...code.matchAll(NAMED_DISPLAY)].length;
    if (display > 0) scan.display[name] = display;

    const rem = [...code.matchAll(VENDORED_REM)].length;
    if (rem > 0) scan.vendoredRem[name] = rem;
  }

  return scan;
}

const scan = scanSrc();

const totalOf = (counts: Record<string, number>): number =>
  Object.values(counts).reduce((sum, n) => sum + n, 0);

describe("DS-02 source scan — the scan itself reaches what it claims to police (T-10-42)", () => {
  it("visits the whole source tree, not a fraction of it", () => {
    expect(scan.scanned.length).toBeGreaterThan(200);
  });

  it("covers both halves of DS-02's stated tree", () => {
    expect(scan.gateFiles.some((f) => f.startsWith("src/app/"))).toBe(true);
    expect(scan.gateFiles.some((f) => f.startsWith("src/components/"))).toBe(true);
    expect(scan.gateFiles.length).toBeGreaterThan(100);
  });

  it("reaches the vendored tree, where an `it's upstream's code` exemption would have hidden", () => {
    for (const file of Object.keys(VENDORED_EXEMPTION)) {
      expect(scan.scanned, `the walker never reached ${file}`).toContain(file);
    }
  });
});

describe("DS-02 source scan — the comment stripper removes prose without eating code", () => {
  it("drops a comment that opens its line, in all three syntaxes this tree uses", () => {
    // Asserted as a property (the banned text is gone, the code survives) rather than as exact
    // output: the JSX form leaves its closing brace behind, which is correct — the stripper keeps
    // everything after a block terminator, and a brace carries no class names.
    for (const prose of [
      "// text-[9px]\nkeep",
      "  {/* text-[9px] */}\nkeep",
      "/* a\n text-[9px]\n */\nkeep",
    ]) {
      const stripped = stripLeadingComments(prose);
      expect(stripped, `left a banned literal behind in: ${prose}`).not.toContain("text-[9px]");
      expect(stripped, `ate real code in: ${prose}`).toContain("keep");
    }
  });

  it("keeps whatever follows a block comment that closes mid-line", () => {
    expect(stripLeadingComments('/* note */ <p className="text-[9px]" />')).toContain(
      "text-[9px]",
    );
  });

  it("never treats an in-string `/*` as a comment opener (the profile-form hazard)", () => {
    // `accept="image/*"` is real, present markup. A block-comment regex swallows everything from
    // there to the next `*/` — 86 lines in that file — and the scan then vouches for source it
    // never read. This assertion is what keeps the stripper line-oriented.
    const markup = '<input accept="image/*" />\n<p className="text-[9px]" />\n/* later */';
    expect(stripLeadingComments(markup)).toContain("text-[9px]");
  });
});

describe("DS-02 second clause — no surface pins a font size to a pixel literal", () => {
  it("finds zero arbitrary pixel font sizes anywhere under src/", () => {
    // Wider than DS-02 asks (it names app and components); a leak in `src/lib/**` would be the same
    // frozen surface, so there is no reason to scope the scan more narrowly than the walk.
    expect(scan.arbitraryPx).toEqual([]);
  });

  it("finds zero uses of the slash-modifier form on any named role (T-10-43)", () => {
    expect(scan.slashModifier).toEqual([]);
  });

  it("carries exactly 12 Display call sites, in the 8 files that own them", () => {
    expect(scan.display).toEqual(DISPLAY_INVENTORY);
    expect(totalOf(scan.display)).toBe(12);
  });

  it("routes the two sub-label numerals onto the built-in `text-xs` step", () => {
    // The anchor for the other half of the migration: these two were the only non-Display literals,
    // and `text-xs` is a utility step for numerals and counters — NOT a fifth semantic role.
    const rows = readFileSync(join(SRC_DIR, "components/booking/booking-row.tsx"), "utf8");
    const bell = readFileSync(join(SRC_DIR, "components/notifications/notification-bell.tsx"), "utf8");
    expect(rows).toContain("text-xs");
    expect(bell).toContain("text-xs");
  });
});

describe("DS-02 source scan — the positive control (T-10-42)", () => {
  it("still finds the 4 vendored rem sites, in the 3 files that carry them", () => {
    // THE CONTROL. Without this, all four zero-violation assertions above are indistinguishable
    // from a scanner that visited nothing. The leak pattern is px-only by decision, so these four
    // must be FOUND and NOT reported — which is a much stronger statement than "nothing found".
    expect(scan.vendoredRem).toEqual(VENDORED_EXEMPTION);
    expect(totalOf(scan.vendoredRem)).toBe(4);
  });

  it("counts the vendored sites in code, not the comment that documents them", () => {
    // `button.tsx` explains in a line comment WHY its rem site is exempt, so the file's raw text
    // says `text-[0.8rem]` twice and its code says it once. A raw-text control would have expected
    // 5 and reported a violation that does not exist; worse, deleting the real site and leaving the
    // comment would still satisfy it. This is the grep-versus-comment collision, on a control.
    const raw = readFileSync(join(SRC_DIR, "components/ui/button.tsx"), "utf8");
    expect([...raw.matchAll(VENDORED_REM)].length).toBeGreaterThan(
      scan.vendoredRem["src/components/ui/button.tsx"],
    );
    expect(scan.vendoredRem["src/components/ui/button.tsx"]).toBe(1);
  });
});
