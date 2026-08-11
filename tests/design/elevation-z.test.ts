// DS-03 — three named elevation steps that actually travel per theme, and the four-step z scale
// that deliberately does not.
//
// WHY THE NAMED STEPS ARE LOAD-BEARING RATHER THAN A NAMING PREFERENCE. Tailwind's default
// `shadow-sm` / `shadow-md` / `shadow-lg` compile to LITERAL values — `--tw-shadow: 0 4px 6px -1px
// var(--tw-shadow-color, rgb(0 0 0 / 0.1)), …` — not to a `var()` reference. So a theme block that
// redeclares `--shadow-md` changes nothing at all, and a surface left on `shadow-md` is frozen
// against every theme forever. D-02's "pronounced elevation" in grove is unreachable without
// `@theme inline` steps whose value is a var(). That is why this file asserts the COMPILED rule
// still contains `var(--elevation-` and not a flattened literal: flattening is the exact edit a
// future reader makes while "simplifying", and nothing else in the repo would notice.
//
// WHY THE Z SCALE IS ASSERTED TO BE ABSENT FROM THE THEMES. D-05 splits the contract: colour, type,
// radius and elevation travel; the spacing grid, the z-index scale and the motion tokens do not. A
// per-theme z-index is not a style choice, it is a way for one theme to reorder the app's layers —
// so "these four names are declared in the plain `:root` block and in NEITHER theme block" is the
// assertion, not merely "they exist somewhere".
//
// THE SECOND CLAUSE, ADDED BY PLAN 10-12. DS-03 ends "…and every shadow in the app maps to one of
// the three", and that half is not a token property — it is a property of the source tree. The token
// assertions above prove the named steps are theme-aware; they are completely blind to whether any
// surface USES them. A tree in which all 14 call sites still said `shadow-md` would pass every
// assertion above while D-01 was false on every elevated surface in the app. The source scan at the
// bottom of this file is that half.
//
// OBSERVED RED, NOT ASSUMED (T-10-45, recorded per the plan's acceptance criteria):
//   • `shadow-overlay` reverted to `shadow-md` at `src/components/ui/popover.tsx:33` → this file
//     exits NON-ZERO: **5 failed / 26 passed**, on exactly the five assertions that should care —
//     the default-ladder scan (diff naming the file and quoting the class), the allowed-vocabulary
//     assertion (`shadow-md` surfacing in the observed name set), the named-site COUNT (8 where 9
//     are contracted), the overlay inventory (whose diff showed `popover.tsx` missing from the four
//     files that must carry the step), and the COMPILED-OUTPUT assertion, which caught the same
//     regression in the emitted stylesheet rather than in the source. Every token assertion above
//     stayed GREEN — the correct blast radius, and the one-line argument for this whole section: a
//     token contract cannot tell you whether anything obeys it.
//   • The count assertion firing is the part worth noticing. It is what makes a DELETE fail as
//     loudly as a WRONG NAME, and a delete is the failure mode a zero-violations gate is blindest
//     to. The reinstated literal is simultaneously a banned name AND a missing named site.
//   • Reverted → exits 0 with **31 passed** (13 before this plan).
//
// AND A COMPILED-OUTPUT CLAIM, WHICH THIS PHASE COULD NOT SOUNDLY MAKE UNTIL NOW. Deferred item D-1
// held that "utility X is absent from the compiled stylesheet" was unsatisfiable in this repo:
// Tailwind's automatic source detection rooted at the REPOSITORY, so `.planning` markdown was
// content and a sentence of prose emitted a real rule. Plan 10-12 closed it by narrowing the
// detection root to `src/` (see the comment at the top of `globals.css`), which removed 119 dead
// selectors and 15,053 bytes — 11.2% of the shipped CSS — with zero real utilities lost. So the
// strongest DS-03 statement is now available and is asserted below: the SHIPPED stylesheet contains
// no default shadow rule at all, not merely no source reference to one.
//
// NOT COVERED — real blind spots:
//   • The scan proves the class NAMES are right. It cannot see `cn()`/tailwind-merge precedence at a
//     call site, nor an inline `style={{ boxShadow }}`, nor a shadow arriving from a CSS module.
//     Phase 11's GATE-01 screenshots see real pixels.
//   • `shadow-sticky` has ZERO call sites and is asserted to have zero. It is reserved for
//     bottom-anchored bars, no such surface exists in the shipped tree, and inventing one to give it
//     a home would be worse than leaving it declared-but-unused. `/dev/theme`'s elevation ladder
//     (plan 10-16) is what exercises it. Do not read the zero as an unused-token bug.
//   • The z scale is ADVISORY against a third-party widget with its own internal z-index (Leaflet's
//     control corners sit at 1000). Accepted for this phase and recorded as a Phase 18 rule: wrap
//     the vendor in a stacking context rather than inflating the scale. Nothing here can catch it.
//   • Whether the three steps read as a hierarchy is a human look at `/dev/theme`.
//
// THE Z-INDEX HALF (plan 10-13) NOW LIVES AT THE BOTTOM OF THIS FILE, and closes DS-03's second
// clause. The shadow sections above are unchanged and remain self-contained.
//
// OBSERVED RED FOR THE Z SECTION, TWICE, BECAUSE THE TWO FAILURE MODES HAVE DIFFERENT BLAST RADII:
//   • `z-(--z-dialog)` reverted to `z-50` at `src/components/ui/popover.tsx:33` → **6 failed / 47
//     passed**: the banned-value scan, the raw-z equality, the vocabulary check, the 20-site COUNT,
//     the per-file dialog inventory (whose diff named `popover.tsx` as the missing file), and the
//     compiled-output assertion, which caught `z-index: 50` in the emitted stylesheet rather than
//     in the source. Every shadow and every token assertion stayed GREEN — the correct radius.
//   • The z-index DELETED from that same line entirely → **2 failed / 51 passed**. Only the count
//     and the per-file inventory fire. Every zero-violations assertion in this section passes
//     PERFECTLY against a tree with no stacking at all, which is the whole argument for pinning
//     exact numbers on both sides (T-10-49) and the reason a delete is the failure a gate like this
//     is blindest to.
//   • Reverted → exits 0 with **53 passed** (31 before this plan).

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";

import {
  readThemeTokens,
  readGlobalTokens,
  compileGlobalsCss,
  compileGlobalsCssWith,
  declarationsFor,
  THEME_NAMES,
} from "./helpers/compile-css";

/** Exactly three steps. A fourth is a scale that has stopped being a scale. */
const ELEVATION_STEPS = ["raised", "overlay", "sticky"] as const;

/** The four z layers and their contracted values, in ascending order. */
const Z_SCALE = [
  ["--z-sticky", "10"],
  ["--z-sheet", "20"],
  ["--z-dialog", "30"],
  ["--z-toast", "40"],
] as const;

const themes = readThemeTokens();
const globals = readGlobalTokens();

/** Every `--elevation-*` key a theme declares, sorted. */
function elevationKeysOf(theme: string): string[] {
  return Object.keys(themes[theme] ?? {})
    .filter((key) => key.startsWith("--elevation-"))
    .sort();
}

describe("DS-03 — exactly three elevation steps, per theme", () => {
  it("declares the three steps and no fourth, in both themes", () => {
    const expected = ELEVATION_STEPS.map((step) => `--elevation-${step}`).sort();
    for (const theme of THEME_NAMES) {
      expect(
        elevationKeysOf(theme),
        `${theme}'s elevation scale is not exactly the three contracted steps`,
      ).toEqual(expected);
    }
  });

  it("gives grove its own depth rather than court's (D-02)", () => {
    // A copied value here is the Pitfall 7 shape: grove's "pronounced elevation" declared but
    // invisible. Every step must move, not just the one that is easiest to eyeball.
    for (const step of ELEVATION_STEPS) {
      expect(
        themes.grove[`--elevation-${step}`],
        `grove's ${step} step is identical to court's`,
      ).not.toBe(themes.court[`--elevation-${step}`]);
    }
  });
});

describe("the named steps compile to a theme-aware var(), not a literal", () => {
  // Safelisted rather than left to the content scan. Two of the three steps now have real call
  // sites (plan 10-12), so Tailwind would emit them anyway — but `shadow-sticky` deliberately has
  // NONE, and a compiled assertion that silently depended on a call site existing would go red the
  // day a surface was refactored rather than the day the contract broke. Forcing all three states
  // the same `if`: IF a component uses this step, it resolves through a per-theme var().
  const FORCED = [
    "shadow-raised",
    "shadow-overlay",
    "shadow-sticky",
    "shadow-floating",
  ];

  it.each(ELEVATION_STEPS)("`.shadow-%s` references var(--elevation-…)", async (step) => {
    const css = await compileGlobalsCssWith(FORCED);
    const body = declarationsFor(css, `.shadow-${step}`);
    expect(body, `no .shadow-${step} rule was emitted at all`).not.toBeNull();
    expect(body).toContain("var(--elevation-");
    expect(body).toContain(`var(--elevation-${step})`);
  });

  it("leaves Tailwind's default shadows literal, which is why the named steps exist", async () => {
    // The positive control for the whole premise: if `.shadow-md` ever became var-referencing this
    // file's reason for existing would have changed, and a reader should be told rather than
    // discovering it by rewriting the scale.
    const css = await compileGlobalsCssWith(["shadow-md"]);
    const body = declarationsFor(css, ".shadow-md") ?? "";
    expect(body, "expected the default shadow to still be emitted").not.toBe("");
    expect(body).not.toContain("var(--shadow-md)");
  });
});

describe("D-05 — the z scale is global, and is not a per-theme knob", () => {
  it("declares exactly 10 / 20 / 30 / 40 in the plain :root block", () => {
    for (const [token, value] of Z_SCALE) {
      expect(globals[token], `the global block is missing ${token}`).toBe(value);
    }
  });

  it("is strictly increasing", () => {
    const values = Z_SCALE.map(([token]) => Number.parseInt(globals[token], 10));
    for (let i = 1; i < values.length; i++) {
      expect(
        values[i],
        `${Z_SCALE[i][0]} must sit above ${Z_SCALE[i - 1][0]}`,
      ).toBeGreaterThan(values[i - 1]);
    }
  });

  it("appears in NEITHER theme block", () => {
    // A per-theme z-index is not a style choice — it lets one theme reorder the app's layers. This
    // is the assertion that keeps the D-05 split honest as later plans add tokens.
    for (const theme of THEME_NAMES) {
      for (const [token] of Z_SCALE) {
        expect(
          themes[theme]?.[token],
          `${token} must not be declared inside the ${theme} block`,
        ).toBeUndefined();
      }
    }
  });
});

describe("the zero-edit motion lever is wired", () => {
  it("makes every bare transition-* utility read the global motion tokens", async () => {
    // Setting the two `--default-transition-*` entries retunes the whole app with no component
    // edits. If this ever stops holding, motion silently reverts to Tailwind's 150ms default.
    const css = await compileGlobalsCssWith(["transition-colors"]);
    const body = declarationsFor(css, ".transition-colors") ?? "";
    expect(body).toContain("var(--motion-fast)");
    expect(body).toContain("var(--motion-ease-standard)");
  });
});

// ---------------------------------------------------------------------------
// Guard the guard (T-10-06). `readGlobalTokens()` throws on a missing block, but
// a block that parsed thin would still satisfy every `toBe` above by accident,
// and a safelist that fabricated rules would make the compiled section vacuous.
// ---------------------------------------------------------------------------
describe("guard-the-guard", () => {
  it("parsed at least 8 keys from the global block", () => {
    expect(
      Object.keys(globals).length,
      "the plain :root block parsed too thin to be the real one",
    ).toBeGreaterThanOrEqual(8);
  });

  it("never let a theme block leak into the global read", () => {
    // The global block and the court block are both `:root`-flavoured selectors. A parser that
    // matched the selector LIST rather than the exact selector would return court's colours here
    // and every assertion above would still pass.
    expect(globals["--brand"]).toBeUndefined();
    expect(globals["--radius"]).toBeUndefined();
  });

  it("safelisting cannot fabricate an elevation step that was never declared", () => {
    return expect(
      compileGlobalsCssWith([
        "shadow-raised",
        "shadow-overlay",
        "shadow-sticky",
        "shadow-floating",
      ]).then((css) => declarationsFor(css, ".shadow-floating")),
    ).resolves.toBeNull();
  });

  it("still refuses a safelist entry that could break out of `@source inline(\"…\")`", () => {
    // Plan 10-13 WIDENED that character check, because the only legal spelling of a named z layer
    // is `z-(--z-dialog)` and the original class rejected every parenthesis. A widened validator
    // with no test on it is how a validator keeps widening, so the property it exists for is
    // asserted here rather than left to the docstring: the value is interpolated into a CSS string
    // literal, so a quote, a backslash, a newline, a `;` or a brace must still be refused.
    for (const hostile of [
      'shadow-md"); @import url(http://x/a.css); @source inline("x',
      "shadow-md; content: bad",
      "shadow-md\\",
      "shadow-md\nshadow-lg",
      "shadow-md{}",
      "shadow-md ",
    ]) {
      expect(
        () => compileGlobalsCssWith([hostile]),
        `the safelist sanitiser accepted ${JSON.stringify(hostile)}`,
      ).toThrow(/refusing to safelist/);
    }
    // …while both real shapes the gate depends on are still accepted.
    expect(() => compileGlobalsCssWith(["shadow-raised"])).not.toThrow();
    expect(() => compileGlobalsCssWith(["z-(--z-dialog)", "-z-(--z-sticky)"])).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DS-03, SECOND CLAUSE — THE SOURCE SCAN (plan 10-12)
//
// WHY IT IS A SOURCE SCAN AND NOT A COMPILED-CSS ASSERTION. The obvious phrasing — "the compiled
// bundle contains no default `shadow-md` rule" — is UNSOUND in this repo, and measurably so.
// Tailwind's automatic content detection roots at the REPOSITORY, not at `src/`, so it also scans
// `.planning/**/*.md` and `tests/**`. Deferred item D-1 measured the consequence in bytes: after a
// clean `rm -rf .next` rebuild the shipped stylesheet carried 770 bytes / 0.58% of rules for
// `bg-brand/90`, a class in no component, emitted from the very PLAN DOCUMENT that ordered its
// deletion. The comment block at the top of `src/app/globals.css` names `shadow-sm`, `shadow-md`
// and `shadow-lg` three times between them, precisely because it explains why those are banned — so
// a compiled-output assertion here would be red against a perfectly clean tree. The authored source
// is the only sound place to assert this.
//
// WHICH IS ALSO WHY THIS SCAN STRIPS COMMENTS (the rule plan 10-11 established and measured). That
// same globals.css block is exactly the grep-versus-comment collision: a comment that names a banned
// string is textually indistinguishable from the string. Without the stripper this file would
// demand that the stylesheet stop explaining itself.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

const SRC_DIR = resolve(process.cwd(), "src");

/** The tree DS-03's second clause is written about. The walk is wider; the requirement is this. */
const GATE_TREE = ["src/app/", "src/components/"] as const;

/** The entire allowed shadow vocabulary. A fifth name is a scale that has stopped being a scale. */
const ALLOWED_SHADOWS = ["shadow-none", "shadow-raised", "shadow-overlay", "shadow-sticky"] as const;

/**
 * Every `shadow-raised` call site, per file.
 *
 * Pinned PER FILE rather than as a bare total (10-11's rule) so a failure names WHICH surface moved.
 * `tabs.tsx` carries a `shadow-raised` and a `shadow-none` on the SAME line — the one co-located
 * pair in the tree, and the reason both inventories below are counted independently.
 */
const RAISED_INVENTORY: Readonly<Record<string, number>> = {
  "src/app/(host)/host/bookings/page.tsx": 1,
  "src/components/booking/bookings-tabs.tsx": 1,
  "src/components/search/search-bar.tsx": 1,
  "src/components/ui/tabs.tsx": 1,
};

/** Every `shadow-overlay` call site, per file. `dropdown-menu` carries two (content + sub-content). */
const OVERLAY_INVENTORY: Readonly<Record<string, number>> = {
  "src/components/search/search-result-card.tsx": 1,
  "src/components/ui/dropdown-menu.tsx": 2,
  "src/components/ui/popover.tsx": 1,
  "src/components/ui/select.tsx": 1,
};

/**
 * The five surviving `shadow-none` sites — THE POSITIVE CONTROL for the whole section.
 *
 * A zero-violations assertion reads exactly the same whether the tree is clean or the walker visited
 * nothing, and — the sharper failure — a "migration" that simply DELETED every shadow would satisfy
 * it perfectly. So the scan must be shown finding shadows it is not allowed to report, and it must
 * be shown finding exactly nine it IS. `input-group.tsx` carries three of the five on its own, which
 * is what makes the number meaningful rather than incidental.
 */
const NONE_INVENTORY: Readonly<Record<string, number>> = {
  "src/components/ui/command.tsx": 1,
  "src/components/ui/input-group.tsx": 3,
  "src/components/ui/tabs.tsx": 1,
};

/**
 * Any shadow UTILITY, including arbitrary values and colour utilities.
 *
 * The `(?<![\w-])` lookbehind is load-bearing twice over. It excludes `--shadow-raised` — the three
 * `@theme inline` TOKEN DECLARATIONS in `globals.css`, which are the contract this scan polices, not
 * call sites of it; a raw count reads them as two extra surfaces and every inventory below is off by
 * one. And it excludes `inset-shadow-*` / `text-shadow-*`, neither of which appears anywhere in this
 * tree (verified) but both of which would otherwise be silently folded into the elevation vocabulary.
 * It also cannot match the bare `transition-shadow` on the search result card, which is a
 * transition-property utility and not an elevation at all.
 */
const SHADOW_UTILITY = /(?<![\w-])shadow-[A-Za-z0-9_\-[\]().%/]+/g;

/** Tailwind's default ladder — the frozen literals this clause exists to remove. */
const DEFAULT_SHADOW = /(?<![\w-])shadow-(?:xs|sm|md|lg|xl|2xl)(?![\w-])/g;

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
 * cosmetic. On this box `path.relative` emits backslash separators while every path in the three
 * inventory maps above is written forward-slash. Without this line those maps stop matching and the
 * file passes vacuously — the exact shape the guard-the-guard block exists to catch.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/**
 * Remove comments that OPEN their own line, and nothing else. Ported verbatim from
 * `type-scale.test.ts` (plan 10-11), whose docstring records the measurement behind each choice.
 *
 * WHY LINE-ORIENTED AND NOT A `/\*…*\/` REGEX. Because that regex is actively wrong in this tree:
 * `src/app/(app)/profile/profile-form.tsx` carries `accept="image/*"` inside a JSX string at line
 * 109, and the next block-comment terminator in that file is 86 lines later. A naive block strip
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

interface ShadowScan {
  /** Normalised forward-slash paths of every file the walker visited. */
  scanned: string[];
  /** The subset under `src/app/**` or `src/components/**` — DS-03's stated tree. */
  gateFiles: string[];
  /** `file: match` for every default Tailwind shadow found in non-comment source. */
  defaults: string[];
  /** Every distinct shadow utility NAME the scan saw, sorted. */
  vocabulary: string[];
  /** Per-file counts, keyed by utility name. */
  byName: Record<string, Record<string, number>>;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanSrc(): ShadowScan {
  const scan: ShadowScan = {
    scanned: [],
    gateFiles: [],
    defaults: [],
    vocabulary: [],
    byName: {},
  };
  const seen = new Set<string>();

  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    const code = stripLeadingComments(readFileSync(file, "utf8"));

    scan.scanned.push(name);
    if (GATE_TREE.some((prefix) => name.startsWith(prefix))) scan.gateFiles.push(name);

    for (const m of code.matchAll(DEFAULT_SHADOW)) scan.defaults.push(`${name}: ${m[0]}`);

    for (const m of code.matchAll(SHADOW_UTILITY)) {
      const utility = m[0];
      seen.add(utility);
      scan.byName[utility] ??= {};
      scan.byName[utility][name] = (scan.byName[utility][name] ?? 0) + 1;
    }
  }

  scan.vocabulary = [...seen].sort();
  return scan;
}

const scan = scanSrc();

const totalOf = (counts: Record<string, number> | undefined): number =>
  Object.values(counts ?? {}).reduce((sum, n) => sum + n, 0);

describe("DS-03 source scan — the scan itself reaches what it claims to police (T-10-45)", () => {
  it("visits the whole source tree, not a fraction of it", () => {
    expect(scan.scanned.length).toBeGreaterThan(200);
  });

  it("covers both halves of DS-03's stated tree", () => {
    expect(scan.gateFiles.some((f) => f.startsWith("src/app/"))).toBe(true);
    expect(scan.gateFiles.some((f) => f.startsWith("src/components/"))).toBe(true);
    expect(scan.gateFiles.length).toBeGreaterThan(100);
  });

  it("reaches `input-group.tsx`, the file whose 3 untouched sites make the 5 meaningful", () => {
    expect(scan.scanned, "the walker never reached the input-group primitive").toContain(
      "src/components/ui/input-group.tsx",
    );
    expect(scan.scanned).toContain("src/app/globals.css");
  });
});

describe("DS-03 source scan — the comment stripper removes prose without eating code", () => {
  it("drops a comment that opens its line, in all three syntaxes this tree uses", () => {
    // Asserted as a property (the banned text is gone, the code survives) rather than as exact
    // output: the JSX form leaves its closing brace behind, which is correct — the stripper keeps
    // everything after a block terminator, and a brace carries no class names.
    for (const prose of [
      "// shadow-md\nkeep",
      "  {/* shadow-md */}\nkeep",
      "/* a\n shadow-md\n */\nkeep",
    ]) {
      const stripped = stripLeadingComments(prose);
      expect(stripped, `left a banned literal behind in: ${prose}`).not.toContain("shadow-md");
      expect(stripped, `ate real code in: ${prose}`).toContain("keep");
    }
  });

  it("never treats an in-string `/*` as a comment opener (the profile-form hazard)", () => {
    // `accept="image/*"` is real, present markup. A block-comment regex swallows everything from
    // there to the next terminator — 86 lines in that file — and the scan then vouches for source
    // it never read. This assertion is what keeps the stripper line-oriented.
    const markup = '<input accept="image/*" />\n<div className="shadow-md" />\n/* later */';
    expect(stripLeadingComments(markup)).toContain("shadow-md");
  });
});

describe("DS-03 second clause — every shadow maps to one of exactly three named steps", () => {
  it("finds zero default Tailwind shadow utilities anywhere under src/", () => {
    // Wider than DS-03 asks (it names app and components); a frozen literal in `src/lib/**` would be
    // the same unreachable surface, so there is no reason to scope the scan more narrowly than the
    // walk. `globals.css` is INSIDE this scope and names all three defaults in its own comment —
    // which is why the stripper exists and why the control below proves it is not a no-op.
    expect(scan.defaults).toEqual([]);
  });

  it("uses no shadow utility outside the four-name vocabulary", () => {
    // Stronger than the absence check above: this catches an arbitrary value (`shadow-[0_1px_2px]`),
    // a colour utility (`shadow-brand`), and any invented fifth step — none of which the default
    // ladder regex would ever see.
    const outside = scan.vocabulary.filter(
      (name) => !(ALLOWED_SHADOWS as readonly string[]).includes(name),
    );
    expect(outside, "shadow utilities outside the declared three-step scale").toEqual([]);
  });
});

describe("DS-03 source scan — the counts, so a DELETE cannot pass as a RENAME (T-10-45)", () => {
  it("carries exactly 9 named-step call sites", () => {
    const named =
      totalOf(scan.byName["shadow-raised"]) +
      totalOf(scan.byName["shadow-overlay"]) +
      totalOf(scan.byName["shadow-sticky"]);
    expect(named, "the 9 named elevation sites are the whole point of the migration").toBe(9);
  });

  it("pins the 4 raised sites to the files that own them", () => {
    expect(scan.byName["shadow-raised"]).toEqual(RAISED_INVENTORY);
  });

  it("pins the 5 overlay sites to the files that own them", () => {
    expect(scan.byName["shadow-overlay"]).toEqual(OVERLAY_INVENTORY);
  });

  it("leaves `shadow-sticky` declared-but-unused, deliberately", () => {
    // NOT a bug and NOT an oversight. The step is reserved for bottom-anchored sticky bars; no such
    // surface exists in the shipped tree, and inventing one to give the token a home would be a
    // worse outcome than a zero. `/dev/theme`'s elevation ladder (plan 10-16) is what exercises it.
    // Asserted rather than left implicit so nobody later "fixes" it by sprinkling it somewhere.
    expect(totalOf(scan.byName["shadow-sticky"])).toBe(0);
    expect(themes.court["--elevation-sticky"], "…but the token must still be declared").toBeDefined();
    expect(themes.grove["--elevation-sticky"]).toBeDefined();
  });

  it("still finds the 5 untouched `shadow-none` sites, in the 3 files that carry them", () => {
    // THE POSITIVE CONTROL. Without it, every zero above is indistinguishable from a scanner that
    // visited nothing — and, worse, a migration that DELETED the shadows instead of renaming them
    // would pass the whole section. These five must be FOUND and NOT reported.
    expect(scan.byName["shadow-none"]).toEqual(NONE_INVENTORY);
    expect(totalOf(scan.byName["shadow-none"])).toBe(5);
  });

  it("counts the co-located pair on `tabs.tsx`'s single line as two separate sites", () => {
    // That one line carries `…:data-active:shadow-raised` and `…:data-active:shadow-none`. A scan
    // that matched once per line would report 8 named sites and 4 survivors and still look tidy.
    expect(scan.byName["shadow-raised"]["src/components/ui/tabs.tsx"]).toBe(1);
    expect(scan.byName["shadow-none"]["src/components/ui/tabs.tsx"]).toBe(1);
  });
});

describe("DS-03 in the SHIPPED stylesheet — the claim D-1 used to make unsound", () => {
  /** Every step of Tailwind's default ladder. None may survive into the emitted CSS. */
  const DEFAULT_LADDER = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

  it("emits no default shadow rule at all, from any source", async () => {
    // STRONGER THAN THE SOURCE SCAN, and only assertable since the content root was narrowed to
    // `src/`. Before that, this repo's own planning documents and this very file emitted `.shadow-md`
    // into the bundle, so the assertion was red against a perfectly clean tree — which is precisely
    // why plan 10-11's gate deliberately refused to make it. It now says what DS-03 actually means:
    // no user can receive a frozen shadow, not merely that no component references one.
    const css = await compileGlobalsCss();
    for (const step of DEFAULT_LADDER) {
      expect(
        declarationsFor(css, `.shadow-${step}`),
        `.shadow-${step} is still emitted into the shipped stylesheet`,
      ).toBeNull();
    }
  });

  it("still emits the two named steps that have real call sites", async () => {
    // THE CONTROL ON THE NARROWING, and the assertion that matters most in this block. A content
    // root mistyped to a directory that does not exist — or narrowed one level too far — makes the
    // absence assertion above pass PERFECTLY while the app ships with no utilities whatsoever. These
    // two rules are emitted only because the scan still reaches `src/`, unforced and unsafelisted.
    const css = await compileGlobalsCss();
    expect(
      declarationsFor(css, ".shadow-raised"),
      "the content scan no longer reaches src/ — the absence assertion above is now vacuous",
    ).not.toBeNull();
    expect(declarationsFor(css, ".shadow-overlay")).not.toBeNull();
  });

  it("leaves `shadow-sticky` out of the bundle precisely because nothing uses it", async () => {
    // The third step is declared in `@theme` and referenced by no component, so an honest content
    // scan must NOT emit it. Together with the two above, this is what proves the emitted set tracks
    // real usage rather than prose: three declared steps, two shipped, and the difference is exactly
    // the one with no call site. `compileGlobalsCssWith` forces it elsewhere in this file to prove
    // it would compile theme-aware IF adopted.
    const css = await compileGlobalsCss();
    expect(declarationsFor(css, ".shadow-sticky")).toBeNull();
  });
});

describe("DS-03 source scan — the control on the control", () => {
  it("counts call sites in code, not the stylesheet comment that documents them", () => {
    // `globals.css` names all three default shadows in the block comment explaining WHY they are
    // banned. Its raw text therefore trips a naive grep; its stripped code does not. If the stripper
    // ever degrades to a no-op this assertion fails immediately — and without it, the "zero
    // defaults" result above would be a statement about a scanner that had stopped scanning.
    const raw = readFileSync(join(SRC_DIR, "app/globals.css"), "utf8");
    expect(
      [...raw.matchAll(DEFAULT_SHADOW)].length,
      "the stylesheet's own warning should still name the banned defaults",
    ).toBeGreaterThan(0);
    expect(scan.defaults.filter((hit) => hit.startsWith("src/app/globals.css"))).toEqual([]);
  });

  it("counts call sites, not the three `@theme` token declarations they resolve through", () => {
    // `--shadow-raised: var(--elevation-raised)` is the CONTRACT, not a use of it. A raw
    // `grep -c shadow-raised` over `src/` returns 5, not 4, for exactly this reason, and every
    // inventory above would be off by one. This is what the regex's lookbehind buys.
    const raw = readFileSync(join(SRC_DIR, "app/globals.css"), "utf8");
    for (const step of ["raised", "overlay", "sticky"]) {
      expect(raw, `globals.css must still declare --shadow-${step}`).toContain(`--shadow-${step}:`);
    }
    for (const name of ALLOWED_SHADOWS) {
      expect(
        scan.byName[name]?.["src/app/globals.css"],
        `${name} was counted as a call site inside the token contract itself`,
      ).toBeUndefined();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// DS-03, THE Z-INDEX CLAUSE — THE SOURCE SCAN AND THE SHIPPED STYLESHEET (plan 10-13)
//
// The token assertions near the top of this file prove the four-step scale EXISTS and is global.
// They are completely blind to whether anything obeys it, and before this plan nothing did: TWO
// magic numbers — `z-10` and `z-50` — arbitrated every stacking decision in the app, including
// whether a dialog rendered above its own overlay. This section is the other half.
//
// THE CONSUMPTION FORM IS THE WHOLE HAZARD, AND IT FAILS SILENTLY. Tailwind v4 has NO z-index theme
// namespace. A bare `z-dialog` is not an error and is not a warning — it simply produces no rule at
// all, so the element keeps whatever stacking it inherits and the bug is invisible until something
// renders behind something else. The parenthesised CSS-variable form `z-(--z-dialog)` is therefore
// mandatory rather than stylistic, and this file asserts the failure directly: `z-dialog` emits
// NOTHING even when force-safelisted, while `z-(--z-dialog)` emits `z-index: var(--z-dialog)`.
//
// THE ONE MAPPING THAT IS NOT VALUE-PRESERVING, STATED SO IT IS NOT DISCOVERED AS A REGRESSION.
// `--z-sticky` is 10, so every former `z-10` renders identically. `--z-dialog` is 30, NOT 50, so all
// nine former `z-50` layers moved DOWN together. Their relative order is unchanged (they all moved,
// and the dialog overlay/content pair sits at equal z with DOM order deciding, exactly as before),
// but anything that hard-coded a value between 30 and 50 would now sit above them. Nothing in the
// shipped tree does — and the zero-raw-z assertion below is precisely what keeps that true.
//
// THE NEGATIVE SITES, which the plan's own inventory counted as plain `z-10`. The "or" dividers on
// login and signup are `-z-10`: a decorative rule that must sit BEHIND the label it crosses. They
// map to `-z-(--z-sticky)`, which compiles to `calc(var(--z-sticky) * -1)` — value-preserving, and
// still reading from the scale rather than from a bare 10. Mapping them to the positive step would
// have inverted two real surfaces while every count in this file still looked right.
//
// WHY `z-0` IS EXEMPT AND `-z-10` IS NOT. `z-0` is not a layer in a four-step scale; it is the
// stacking-context origin, used on `calendar.tsx`'s range endpoints alongside `isolate` to give the
// `::after` bleed something to sit against. `-z-10` contains the magic 10 that the scale exists to
// name. So the two `z-0` stay, are asserted to stay, and are the positive control for this section.
//
// NOT COVERED — real blind spots, so the next reader under-trusts this section:
//   • It proves the class NAMES and the emitted `z-index` values. It cannot see `cn()` /
//     tailwind-merge precedence, an inline `style={{ zIndex }}`, or a stacking context created by
//     `transform` / `filter` / `isolate` that makes a z-index irrelevant. Only a rendered dialog
//     shows that; `npm run test:e2e` exercises the real dialogs, menus and popovers.
//   • The scale is ADVISORY against a third-party widget with its own internal z-index. Leaflet's
//     control corners sit at 1000 and its panes at 400–700, which already out-ranked the old 50 as
//     well as the new 30 — lowering the portal layer changes nothing about that relationship. The
//     Phase 18 rule stands: wrap the vendor in a CSS stacking context, never inflate the app scale.
//   • `--z-sheet` and `--z-toast` have ZERO call sites and are asserted to have zero. `--z-sheet` is
//     reserved for a genuine mobile overlay/sheet, which the tree does not yet have; the Sonner
//     toaster sets its own z-index internally and is not edited here. Neither zero is a bug, and
//     neither may be "fixed" by sprinkling the token somewhere to give it a home.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** The whole allowed z vocabulary in source. A fifth name is a scale that has stopped being one. */
const ALLOWED_Z = [
  "z-0",
  "z-(--z-sticky)",
  "-z-(--z-sticky)",
  "z-(--z-dialog)",
] as const;

/**
 * Any z utility, including the negative form, arbitrary values and the non-compiling bare form.
 *
 * The `(?<![\w-])` lookbehind is 10-12's rule and is load-bearing three times here. It excludes the
 * four `--z-*` TOKEN DECLARATIONS in `globals.css` — the contract this scan polices, not call sites
 * of it — and every `var(--z-dialog)` reference to them. It excludes `tz-safe` / `tz-note`, which
 * appear on 11 real lines across the booking and availability components and which a bare `z-`
 * search folds straight into the z vocabulary. And by allowing an OPTIONAL leading `-` inside the
 * match it separates `-z-10` from `z-10`, a distinction the plan's own inventory did not draw: it
 * counted 12 `z-10`, of which two are negative dividers that must never become positive.
 *
 * It deliberately also matches a literal `z-index` in un-stripped CSS, which is why the control at
 * the bottom of this file can prove the comment stripper is not a no-op.
 */
const Z_UTILITY = /(?<![\w-])-?z-[A-Za-z0-9_[\]().%/-]+/g;

/** Any raw numeric or arbitrary z — the magic-number form the named scale replaces. */
const RAW_Z = /(?<![\w-])-?z-(?:\d+|auto|\[[^\]]*\])(?![\w-])/g;

/** The two numbers that used to arbitrate every stacking decision in this app. */
const BANNED_Z = /(?<![\w-])-?z-(?:10|50)(?![\w-])/g;

/** Every positive `z-(--z-sticky)` call site, per file. */
const STICKY_INVENTORY: Readonly<Record<string, number>> = {
  "src/components/booking/booking-row.tsx": 1,
  "src/components/host/host-booking-row.tsx": 1,
  "src/components/ui/avatar.tsx": 1,
  "src/components/ui/calendar.tsx": 2,
  "src/components/ui/select.tsx": 2,
  "src/components/ui/toggle-group.tsx": 2,
};

/** The two NEGATIVE sticky sites — the "or" dividers, which must stay behind their labels. */
const NEGATIVE_STICKY_INVENTORY: Readonly<Record<string, number>> = {
  "src/app/(auth)/login/page.tsx": 1,
  "src/app/(auth)/signup/page.tsx": 1,
};

/** Every `z-(--z-dialog)` call site, per file. All nine are Radix portal layers. */
const DIALOG_INVENTORY: Readonly<Record<string, number>> = {
  "src/components/ui/dialog.tsx": 2,
  "src/components/ui/dropdown-menu.tsx": 2,
  "src/components/ui/popover.tsx": 1,
  "src/components/ui/select.tsx": 1,
  "src/components/ui/tooltip.tsx": 3,
};

/** The two surviving `z-0` — the positive control, and the documented exemption. */
const Z0_INVENTORY: Readonly<Record<string, number>> = {
  "src/components/ui/calendar.tsx": 2,
};

interface ZScan {
  scanned: string[];
  gateFiles: string[];
  /** `file: match` for every `z-10` / `z-50` (either sign) in non-comment source. */
  banned: string[];
  /** `file: match` for every raw numeric/arbitrary z in non-comment source. */
  raw: string[];
  vocabulary: string[];
  byName: Record<string, Record<string, number>>;
}

/** Scanned ONCE at module level, reusing this file's walker, label() and comment stripper. */
function scanZ(): ZScan {
  const out: ZScan = { scanned: [], gateFiles: [], banned: [], raw: [], vocabulary: [], byName: {} };
  const seen = new Set<string>();

  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    const code = stripLeadingComments(readFileSync(file, "utf8"));

    out.scanned.push(name);
    if (GATE_TREE.some((prefix) => name.startsWith(prefix))) out.gateFiles.push(name);

    for (const m of code.matchAll(BANNED_Z)) out.banned.push(`${name}: ${m[0]}`);
    for (const m of code.matchAll(RAW_Z)) out.raw.push(`${name}: ${m[0]}`);

    for (const m of code.matchAll(Z_UTILITY)) {
      seen.add(m[0]);
      out.byName[m[0]] ??= {};
      out.byName[m[0]][name] = (out.byName[m[0]][name] ?? 0) + 1;
    }
  }

  out.vocabulary = [...seen].sort();
  return out;
}

const zScan = scanZ();

describe("DS-03 z scan — the scan itself reaches what it claims to police (T-10-49)", () => {
  it("visits the whole source tree, not a fraction of it", () => {
    // A zero-raw-z assertion passes just as happily against a scanner that visited nothing.
    expect(zScan.scanned.length).toBeGreaterThan(200);
    expect(zScan.gateFiles.length).toBeGreaterThan(100);
  });

  it("reaches `dialog.tsx`, the file that carries the overlay/content pair", () => {
    // Named explicitly because the dialog is the surface where a mis-mapped z is not cosmetic: an
    // overlay above its own content makes the booking flow unusable (T-10-48).
    expect(zScan.scanned, "the walker never reached the dialog primitive").toContain(
      "src/components/ui/dialog.tsx",
    );
    expect(zScan.scanned).toContain("src/components/ui/calendar.tsx");
  });
});

describe("DS-03 z clause — the two magic numbers are gone from the source", () => {
  it("finds zero `z-10` and zero `z-50`, of either sign, anywhere under src/", () => {
    // Wider than DS-03's stated tree (app + components) on purpose: a raw stacking value in
    // `src/lib/**` would be exactly as unreviewable, so there is no reason to scope the assertion
    // more narrowly than the walk already goes.
    expect(zScan.banned).toEqual([]);
  });

  it("leaves the two exempt `z-0` as the ONLY raw z values in the tree", () => {
    // Stated as an equality rather than "no z-10 or z-50" so an invented `z-[999]`, a `z-auto`, or
    // any other magic number is caught by the same assertion that catches a regression to 50.
    expect(zScan.raw.sort()).toEqual([
      "src/components/ui/calendar.tsx: z-0",
      "src/components/ui/calendar.tsx: z-0",
    ]);
  });

  it("uses no z utility outside the four-name vocabulary", () => {
    // This is where a bare `z-dialog` is caught. It compiles to NOTHING, so no compiled-output
    // assertion can ever see it and no rendering test would fail on a token the author believed
    // they had applied — the source is the only place that mistake is legible.
    const outside = zScan.vocabulary.filter(
      (name) => !(ALLOWED_Z as readonly string[]).includes(name),
    );
    expect(outside, "z utilities outside the four-step scale").toEqual([]);
  });
});

describe("DS-03 z scan — the counts, so a DELETE cannot pass as a MIGRATION (T-10-49)", () => {
  it("carries exactly 20 mapped call sites — 11 sticky and 9 dialog", () => {
    // The count is what makes a migration that DELETED the z-index instead of mapping it go red: a
    // tree with no z-index at all satisfies every zero-violations assertion above perfectly.
    const sticky =
      totalOf(zScan.byName["z-(--z-sticky)"]) + totalOf(zScan.byName["-z-(--z-sticky)"]);
    const dialog = totalOf(zScan.byName["z-(--z-dialog)"]);
    expect(sticky, "the sticky layer lost or gained a surface").toBe(11);
    expect(dialog, "the dialog layer lost or gained a surface").toBe(9);
    expect(sticky + dialog).toBe(20);
  });

  it("pins the 9 positive sticky sites to the files that own them", () => {
    expect(zScan.byName["z-(--z-sticky)"]).toEqual(STICKY_INVENTORY);
  });

  it("pins the 2 NEGATIVE sticky sites, which must never become positive", () => {
    // The "or" divider crosses BEHIND its own label. A positive step here is a visible bug on the
    // two highest-traffic unauthenticated pages in the app, and every other count in this file
    // would still read correctly.
    expect(zScan.byName["-z-(--z-sticky)"]).toEqual(NEGATIVE_STICKY_INVENTORY);
  });

  it("pins the 9 dialog sites to the five portal primitives that own them", () => {
    expect(zScan.byName["z-(--z-dialog)"]).toEqual(DIALOG_INVENTORY);
  });

  it("counts `tooltip.tsx`'s two-on-one-line as two separate sites", () => {
    // Line 45 carries the content layer AND `**:data-[slot=kbd]:z-(--z-dialog)`. A scan matching
    // once per line reports 8 dialog sites and still looks tidy. `calendar.tsx` and
    // `toggle-group.tsx` are the same shape on the sticky side.
    expect(zScan.byName["z-(--z-dialog)"]["src/components/ui/tooltip.tsx"]).toBe(3);
    expect(zScan.byName["z-(--z-sticky)"]["src/components/ui/calendar.tsx"]).toBe(2);
    expect(zScan.byName["z-(--z-sticky)"]["src/components/ui/toggle-group.tsx"]).toBe(2);
  });

  it("still finds the 2 untouched `z-0` sites — THE POSITIVE CONTROL", () => {
    // Without these, every zero above is indistinguishable from a scanner that read nothing, and a
    // "migration" that stripped the z-index off `calendar.tsx`'s range endpoints would pass.
    expect(zScan.byName["z-0"]).toEqual(Z0_INVENTORY);
  });

  it("leaves `--z-sheet` and `--z-toast` declared-but-unused, deliberately", () => {
    // NOT oversights. `--z-sheet` is reserved for a genuine mobile overlay/sheet, which the tree
    // does not have; the Sonner toaster sets its own z-index internally. Asserted so nobody gives
    // either token a home just to make a number look complete — and the tokens must still exist.
    expect(totalOf(zScan.byName["z-(--z-sheet)"])).toBe(0);
    expect(totalOf(zScan.byName["z-(--z-toast)"])).toBe(0);
    expect(globals["--z-sheet"], "…but the step must still be declared").toBe("20");
    expect(globals["--z-toast"]).toBe("40");
  });
});

describe("DS-03 z clause in the SHIPPED stylesheet", () => {
  it("emits no `z-10`, `-z-10` or `z-50` rule at all, from any source", async () => {
    // Only assertable since plan 10-12 narrowed the content root to `src/`; before that a sentence
    // of planning prose emitted a real rule and this would have been red against a clean tree.
    const css = await compileGlobalsCss();
    for (const selector of [".z-10", ".-z-10", ".z-50"]) {
      expect(
        declarationsFor(css, selector),
        `${selector} is still emitted into the shipped stylesheet`,
      ).toBeNull();
    }
  });

  it("emits the three named z rules UNFORCED, each resolving through its token", async () => {
    // THE CONTROL ON THE NARROWING. A content root narrowed one level too far makes the absence
    // assertion above pass perfectly while the app ships with no utilities whatsoever. These rules
    // exist only because the scan still reaches `src/` — nothing here is safelisted.
    const css = await compileGlobalsCss();
    expect(
      declarationsFor(css, ".z-\\(--z-sticky\\)"),
      "the content scan no longer reaches src/ — the absence assertion above is now vacuous",
    ).toBe("z-index: var(--z-sticky);");
    expect(declarationsFor(css, ".z-\\(--z-dialog\\)")).toBe("z-index: var(--z-dialog);");
    // Value-preserving negation, asserted as the emitted expression rather than assumed: the two
    // dividers still compute to -10 exactly as `-z-10` did.
    expect(declarationsFor(css, ".-z-\\(--z-sticky\\)")).toBe(
      "z-index: calc(var(--z-sticky) * -1);",
    );
  });

  it("still emits `.z-0`, so the exemption is a real surviving surface", async () => {
    const css = await compileGlobalsCss();
    expect(declarationsFor(css, ".z-0")).toBe("z-index: 0;");
  });

  it("omits the two unused steps precisely because nothing references them", async () => {
    // Four declared steps, two shipped, and the difference is exactly the two with no call site —
    // which is what proves the emitted set tracks real usage rather than prose.
    const css = await compileGlobalsCss();
    expect(declarationsFor(css, ".z-\\(--z-sheet\\)")).toBeNull();
    expect(declarationsFor(css, ".z-\\(--z-toast\\)")).toBeNull();
  });

  it("would compile both unused steps theme-consistently IF a surface adopted one", async () => {
    // States the `if` explicitly rather than leaving the two zeros above looking like dead tokens.
    const css = await compileGlobalsCssWith(["z-(--z-sheet)", "z-(--z-toast)"]);
    expect(declarationsFor(css, ".z-\\(--z-sheet\\)")).toBe("z-index: var(--z-sheet);");
    expect(declarationsFor(css, ".z-\\(--z-toast\\)")).toBe("z-index: var(--z-toast);");
  });
});

describe("DS-03 z clause — the bare form does not compile, which is why the parens are mandatory", () => {
  it("emits NOTHING for `z-dialog`, `z-sticky`, `z-sheet` or `z-toast`, even force-safelisted", async () => {
    // THE ASSERTION THIS WHOLE SECTION EXISTS TO CARRY. Tailwind v4 has no z-index theme namespace,
    // so the readable-looking `z-dialog` is not an error, not a warning, and not a rule — it is
    // silence. Forcing the safelist removes the only innocent explanation ("nothing uses it yet"):
    // Tailwind is asked directly for the class and still produces no declaration. A reader who
    // "tidies" `z-(--z-dialog)` into `z-dialog` fails here instead of shipping an invisible bug.
    const css = await compileGlobalsCssWith([
      "z-dialog",
      "z-sticky",
      "z-sheet",
      "z-toast",
      "z-(--z-dialog)",
    ]);
    for (const bare of [".z-dialog", ".z-sticky", ".z-sheet", ".z-toast"]) {
      expect(
        declarationsFor(css, bare),
        `${bare} compiled — Tailwind grew a z-index namespace and this file's premise changed`,
      ).toBeNull();
    }
    // The positive control on the same compile: the parenthesised form in the SAME safelist does
    // emit, so the four nulls above are a fact about the bare syntax and not about the safelist.
    expect(declarationsFor(css, ".z-\\(--z-dialog\\)")).toBe("z-index: var(--z-dialog);");
  });
});

describe("DS-03 z scan — the control on the control", () => {
  it("counts call sites in code, not the stylesheet comment that documents the form", () => {
    // `globals.css`'s CONSUMPTION FORM comment names both `z-dialog` (the form that compiles to
    // nothing) and `z-(--z-dialog)` (the one that works), and its z-scale block says `z-index` four
    // times. Its raw text therefore carries 6 hits that its stripped code does not. If the stripper
    // ever degrades to a no-op, the vocabulary assertion above goes red on `z-dialog` immediately —
    // and without this control, that same "zero violations" result would be a statement about a
    // scanner that had stopped scanning.
    const raw = readFileSync(join(SRC_DIR, "app/globals.css"), "utf8");
    const rawHits = [...raw.matchAll(Z_UTILITY)].map((m) => m[0]);
    expect(
      rawHits,
      "the stylesheet's own warning should still name the non-compiling bare form",
    ).toContain("z-dialog");
    expect(rawHits).toContain("z-index");
    expect(
      zScan.vocabulary.filter((name) => name === "z-dialog" || name === "z-index"),
      "the comment stripper is a no-op — every count in this section is unreliable",
    ).toEqual([]);
  });

  it("counts call sites, not the four `:root` token declarations they resolve through", () => {
    // `--z-dialog: 30` is the CONTRACT, not a use of it, and `var(--z-dialog)` inside a component
    // would be a reference rather than a utility. This is what the lookbehind buys — without it
    // every inventory above is off by the size of the token block.
    const raw = readFileSync(join(SRC_DIR, "app/globals.css"), "utf8");
    for (const [token] of Z_SCALE) {
      expect(raw, `globals.css must still declare ${token}`).toContain(`${token}:`);
    }
    for (const name of ALLOWED_Z) {
      expect(
        zScan.byName[name]?.["src/app/globals.css"],
        `${name} was counted as a call site inside the token contract itself`,
      ).toBeUndefined();
    }
  });

  it("never folds `tz-safe` and friends into the z vocabulary", () => {
    // 11 real lines across the booking, host and availability components carry `tz-safe` / `tz-note`
    // / `tz-independent`. A `z-` search without the lookbehind reports them as stacking utilities,
    // and the vocabulary assertion above would fail against a perfectly clean tree.
    const decoys = '<p className="tz-safe" /> // tz-note tz-independent';
    expect([...decoys.matchAll(Z_UTILITY)].map((m) => m[0])).toEqual([]);
    // …while the four real forms, including the negative one and a variant prefix, are all found.
    const real = 'className="relative z-(--z-sticky) focus:z-(--z-dialog) -z-(--z-sticky) z-0"';
    expect([...real.matchAll(Z_UTILITY)].map((m) => m[0])).toEqual([
      "z-(--z-sticky)",
      "z-(--z-dialog)",
      "-z-(--z-sticky)",
      "z-0",
    ]);
  });
});
