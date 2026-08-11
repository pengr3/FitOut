// DS-06 / D-13's companion — the thing that stops the declared pair inventory going stale.
//
// `contrast.test.ts` proves every pairing `src/lib/design/contrast-pairs.ts` DECLARES clears its
// WCAG bar in both themes. That is only half a guarantee: it says nothing about whether the app
// actually renders those pairings, and nothing at all about a component that invents a new one. An
// inventory nobody checks against the code is a document, and this phase has already paid for the
// difference twice — `listing-map.tsx:22`'s coral had not matched `--brand` since 10-03 re-derived
// it, and nothing in the repository could tell.
//
// So this file walks the same tree the leak gate polices, reads the foreground/background pairings
// components ACTUALLY write, and fails on any that the inventory does not declare. The two halves
// meet in the middle: contrast.test.ts asks "is every declared pairing readable?", this asks "is
// every rendered pairing declared?".
//
// HOW A PAIRING IS RECOVERED FROM SOURCE.
//
//   1. Parse each module with the TypeScript compiler API and take STRING LITERALS AND TEMPLATE
//      CHUNKS ONLY — never raw text. Phase 10 has twelve recorded cases of a grep landing on a
//      comment that NAMES a class rather than a call site that USES one, and this file's own header
//      would be one of them.
//   2. Split each class token on `:` at bracket depth zero, which separates the variant chain
//      (`hover`, `focus-visible`, `data-[state=on]`, `group-hover`, `aria-invalid`, `sm`, `lg`, …)
//      from the utility. Depth-zero is required: `data-[state=on]:bg-brand` contains a `:`-free
//      bracket group but `supports-[display:grid]:…` does not.
//   3. Classify the utility as a foreground (`text-<token>`), a background (`bg-<token>`) or an
//      edge (`border-<token>` / `ring-<token>`), where `<token>` must be a declared COLOUR token.
//      That last condition is what keeps `text-sm`, `text-center`, `text-balance` and the four
//      named type roles out of the foreground set — a `text-*` utility is only a colour when the
//      thing after the dash is one.
//   4. Cross-multiply the foregrounds and backgrounds found in ONE string, normalise both sides
//      through the alias map, and look the result up in the inventory.
//
// THE ALIAS MAP IS DERIVED FROM THE STYLESHEET, NOT TYPED HERE. Two tokens that hold the same value
// in BOTH themes are the same colour, so a pairing written with one is the same measurement as the
// same pairing written with the other. `--secondary`, `--muted` and `--accent` are one such group;
// `--card` and `--popover` another; `--foreground`, `--card-foreground` and `--popover-foreground`
// a third. Deriving the groups means a future theme that pulls `--accent` away from `--muted`
// splits them automatically instead of leaving a hand-written list quietly wrong.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// TWO NARROWINGS OF THE NAIVE CROSS PRODUCT, both forced by what the tree actually contains.
//
//   A. VARIANT CHAINS MUST BE COMPATIBLE. A foreground and a background are only paired when their
//      chains are IDENTICAL, or when at least one of them is unconditional. Without this,
//      `ui/calendar.tsx:221` synthesises `text-foreground` (under `data-[range-middle=true]`)
//      against `bg-primary` (under `data-[range-end=true]`) — two mutually exclusive day states
//      that can never paint together. That phantom measures ~1.1:1, and it is resolvable by NEITHER
//      of the two honest routes: adding the row would declare a 1.1:1 pairing legal, and "fixing
//      the component" would mean breaking a calendar that is not broken. `ui/dropdown-menu.tsx:76`
//      produces the same shape across `not-data-[variant=destructive]:` and
//      `data-[variant=destructive]:`.
//
//   B. `dark:`-SCOPED UTILITIES ARE SKIPPED, because they cannot paint. `globals.css:32` defines the
//      variant as `&:is(.dark *)`, and NOTHING ACTIVATES `.dark`: the provider writes
//      `attribute="data-theme"` specifically to avoid that collision, `enableSystem` is false, and
//      the theme list is overridden to court/grove (D-03/D-06 — both themes are light-background and
//      the `.dark` block is dormant by decision, not by accident). The assertion below pins all
//      three, so this narrowing cannot quietly outlive its justification. The 54 surviving `dark:`
//      occurrences are vendored, pinned debt (THEME-05 / `dark-scope.test.ts`); they are also
//      unmeasurable here even in principle, since `config/design-tokens-source.mjs` never reads the
//      `.dark` block — by design, as it redeclares ~30 names and would corrupt every per-theme
//      value. IF `.dark` IS EVER ACTIVATED, this narrowing must be replaced by a third theme in the
//      inventory rather than left in place.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than over-trusts it:
//   • A CROSS-ELEMENT pairing is invisible to same-string analysis. A `text-brand` child rendered
//     inside a `bg-muted` parent is a real rendered pairing whose two class names never appear on
//     the same element, so nothing here can see it. That residue is covered by Phase 17's two-theme
//     axe pass, on the rendered DOM — not by this file, and saying so is the point of saying it.
//   • Narrowing A costs real coverage in one direction: a foreground and a background under two
//     DIFFERENT non-empty chains that CAN co-apply (`hover:bg-muted` with `focus:text-brand`) are
//     not paired here. Chains are also compared as ordered strings, so `focus:hover:` and
//     `hover:focus:` would read as different.
//   • Narrowing B's dormancy pin covers the app-wide mechanisms, not a hand-written `dark` class on
//     one subtree. Nothing in `src/` writes one today — the only two bare `dark` string literals are
//     `ui/sonner.tsx:29`'s value for Sonner's own `theme` prop, which is not a CSS class — but that
//     is a measurement, not an assertion, and a future one would silently make skipped utilities live.
//   • The lookup is ALPHA-BLIND: it asks whether the (fg, bg) pair is declared somewhere in the
//     inventory, not whether the specific opacity a call site uses is the declared one. A component
//     writing `bg-destructive text-destructive` solid passes on the strength of the `/10` rows.
//     Measuring the alpha is `contrast.test.ts`'s job and it does it per row.
//   • Only classes written as literal text are seen. A pairing assembled at runtime — a token name
//     interpolated into a template, a class picked out of a `Record` by a variable — is invisible.
//   • This proves a pairing is DECLARED, never that it is USED WELL. Contrast is a floor, not
//     typography.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import { LEAK_SCAN_PREFIXES } from "../../config/design-leak-patterns.mjs";
import { readThemeTokens, THEME_NAMES } from "./helpers/compile-css";
import { CONTRAST_PAIRS } from "../../src/lib/design/contrast-pairs";

/**
 * Read as TEXT rather than imported: the provider is a `"use client"` module that pulls React and
 * next-themes, and this file runs in the node environment. `theme-nesting.test.ts` reads its
 * sources the same way for the same reason.
 */
const THEME_PROVIDER_SOURCE = readFileSync(
  resolve(process.cwd(), "src/components/theme/theme-provider.tsx"),
  "utf8",
);

const SRC_DIR = resolve(process.cwd(), "src");

// ---------------------------------------------------------------------------------------------
// The colour vocabulary, read from the stylesheet
// ---------------------------------------------------------------------------------------------

const themes = readThemeTokens();

/**
 * A token is a COLOUR token when its declared value is a single `oklch()` call and nothing else —
 * the same rule `scripts/generate-design-tokens.mjs` applies. It is what keeps `--radius`, the 16
 * type values and the three elevation shorthands (a shadow that CONTAINS a colour is not one) out
 * of a set whose members are about to be treated as paint.
 */
const SINGLE_OKLCH = /^oklch\([^()]*\)$/;

const COLOUR_TOKENS: string[] = Object.keys(themes[THEME_NAMES[0]])
  .filter((name) =>
    THEME_NAMES.every((theme) => SINGLE_OKLCH.test(themes[theme][name] ?? "")),
  )
  .map((name) => name.replace(/^--/, ""));

/**
 * Tokens holding an identical value in EVERY theme collapse to one representative, so an alias is
 * not reported as a new pairing. Derived, never typed — see the header.
 */
const ALIAS_OF = new Map<string, string>();
{
  const byValue = new Map<string, string[]>();
  for (const token of COLOUR_TOKENS) {
    const key = THEME_NAMES.map((theme) => themes[theme][`--${token}`]).join("||");
    const bucket = byValue.get(key);
    if (bucket === undefined) byValue.set(key, [token]);
    else bucket.push(token);
  }
  for (const members of byValue.values()) {
    const representative = [...members].sort()[0];
    for (const member of members) ALIAS_OF.set(member, representative);
  }
}

const canonical = (token: string): string => ALIAS_OF.get(token) ?? token;
const pairKey = (fg: string, bg: string): string =>
  `${canonical(fg)} on ${canonical(bg)}`;

/** Every pairing the design system declares legal, canonicalised. */
const DECLARED = new Set(CONTRAST_PAIRS.map((pair) => pairKey(pair.fg, pair.bg)));

// ---------------------------------------------------------------------------------------------
// Class-string analysis
// ---------------------------------------------------------------------------------------------

type Role = "fg" | "bg" | "edge";
type ClassUse = {
  readonly role: Role;
  readonly token: string;
  readonly chain: string;
  readonly raw: string;
};

/** Split one class token into its variant chain and its utility, at bracket depth zero. */
function splitVariants(token: string): { chain: string[]; utility: string } {
  const text = token.replace(/^!+/, "");
  const chain: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "[" || ch === "(") depth++;
    else if (ch === "]" || ch === ")") depth--;
    else if (ch === ":" && depth === 0) {
      chain.push(text.slice(start, i));
      start = i + 1;
    }
  }
  return { chain, utility: text.slice(start) };
}

const ROLE_PREFIXES: readonly (readonly [Role, string])[] = [
  ["fg", "text-"],
  ["bg", "bg-"],
  ["edge", "border-"],
  ["edge", "ring-"],
];

/** A utility is a colour use only when the name after its prefix is a declared colour token. */
function classifyUtility(utility: string): { role: Role; token: string } | null {
  let text = utility.replace(/^-/, "");
  const slash = text.indexOf("/");
  if (slash !== -1) text = text.slice(0, slash); // an opacity modifier, not part of the name
  for (const [role, prefix] of ROLE_PREFIXES) {
    if (!text.startsWith(prefix)) continue;
    const token = text.slice(prefix.length);
    if (COLOUR_TOKENS.includes(token)) return { role, token };
  }
  return null;
}

/** Every colour use in one class string, with its variant chain. `dark:` is skipped — narrowing B. */
function colourUsesIn(text: string): ClassUse[] {
  const uses: ClassUse[] = [];
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const { chain, utility } = splitVariants(raw);
    if (chain.includes("dark")) continue;
    const classified = classifyUtility(utility);
    if (classified === null) continue;
    uses.push({ ...classified, chain: chain.join(":"), raw });
  }
  return uses;
}

/** Narrowing A: identical chains, or at least one unconditional. */
function chainsCanCoApply(a: string, b: string): boolean {
  return a === b || a === "" || b === "";
}

type Pairing = { readonly key: string; readonly detail: string };

/** The fg/bg pairings a single class string produces. */
function pairingsIn(text: string): Pairing[] {
  const uses = colourUsesIn(text);
  const out: Pairing[] = [];
  for (const fg of uses.filter((use) => use.role === "fg")) {
    for (const bg of uses.filter((use) => use.role === "bg")) {
      if (!chainsCanCoApply(fg.chain, bg.chain)) continue;
      out.push({
        key: pairKey(fg.token, bg.token),
        detail: `${fg.raw} × ${bg.raw}`,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------------------------

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** Repo-relative, forward-slashed — every prefix comparison below depends on it (T-10-27). */
function pathLabel(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

function scanText(path: string, text: string): { key: string; where: string }[] {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: { key: string; where: string }[] = [];
  const visit = (node: ts.Node): void => {
    let chunk: string | null = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      chunk = node.text;
    } else if (
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      chunk = node.text;
    }
    if (chunk !== null) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      for (const pairing of pairingsIn(chunk)) {
        found.push({ key: pairing.key, where: `${path}:${line} (${pairing.detail})` });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function scanGateTree(): {
  scanned: string[];
  observed: Map<string, string[]>;
} {
  const scanned: string[] = [];
  const observed = new Map<string, string[]>();
  for (const file of collectSourceFiles(SRC_DIR)) {
    const path = pathLabel(file);
    if (!LEAK_SCAN_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;
    scanned.push(path);
    for (const hit of scanText(path, readFileSync(file, "utf8"))) {
      const sites = observed.get(hit.key);
      if (sites === undefined) observed.set(hit.key, [hit.where]);
      else sites.push(hit.where);
    }
  }
  return { scanned, observed };
}

const { scanned, observed } = scanGateTree();

/** One readable line per undeclared pairing, naming the first three sites that produce it. */
const drift: string[] = [...observed.entries()]
  .filter(([key]) => !DECLARED.has(key))
  .sort(([a], [b]) => (a < b ? -1 : 1))
  .map(
    ([key, sites]) =>
      `${key} — not in CONTRAST_PAIRS; ${sites.length} site(s), e.g. ${sites.slice(0, 3).join(", ")}`,
  );

describe("the declared pair inventory matches what components render", () => {
  // ---------------------------------------------------------------------------------------------
  // Guard-the-guard. The real assertion is `toEqual([])`, which a scanner that classified nothing
  // satisfies perfectly — and "classified nothing" is the likely failure mode here, because every
  // step of the analysis is a filter.
  // ---------------------------------------------------------------------------------------------

  it("reads a real colour vocabulary out of the stylesheet", () => {
    expect(COLOUR_TOKENS.length).toBeGreaterThanOrEqual(20);
    expect(COLOUR_TOKENS).toContain("brand");
    expect(COLOUR_TOKENS).toContain("muted-foreground");
    // The filter is doing work: type, radius and elevation values are NOT colours.
    expect(COLOUR_TOKENS).not.toContain("radius");
    expect(COLOUR_TOKENS).not.toContain("elevation-raised");
  });

  it("derives the alias groups the plan names, from values rather than by hand", () => {
    expect(canonical("muted")).toBe(canonical("accent"));
    expect(canonical("muted")).toBe(canonical("secondary"));
    expect(canonical("card")).toBe(canonical("popover"));
    expect(canonical("foreground")).toBe(canonical("card-foreground"));
    // A control on the collapse: tokens with genuinely different values stay apart, otherwise the
    // map would be a way of making every pairing look declared.
    expect(canonical("brand")).not.toBe(canonical("muted"));
    expect(canonical("foreground")).not.toBe(canonical("muted-foreground"));
  });

  it("scans the same tree the leak gate polices, and finds real pairings there", () => {
    expect(scanned.length).toBeGreaterThan(100);
    expect(scanned).toContain("src/components/ui/button.tsx");
    expect(observed.size).toBeGreaterThanOrEqual(10);
    // If this ever drops to zero the `toEqual([])` below becomes a permanent, silent pass.
    expect([...observed.values()].reduce((n, s) => n + s.length, 0)).toBeGreaterThan(30);
  });

  it("recovers the pairings the app is built on", () => {
    expect([...observed.keys()]).toContain(pairKey("brand-foreground", "brand"));
    expect([...observed.keys()]).toContain(pairKey("foreground", "muted"));
    expect([...observed.keys()]).toContain(pairKey("primary-foreground", "primary"));
  });

  // ---------------------------------------------------------------------------------------------
  // Synthetic fixtures for the class analysis itself.
  // ---------------------------------------------------------------------------------------------

  it("classifies only colour utilities as colours", () => {
    // A type role, a size, an alignment and a wrap mode are all `text-*` and none is a colour.
    expect(colourUsesIn("text-display text-sm text-center text-balance")).toEqual([]);
    expect(colourUsesIn("text-muted-foreground").map((u) => u.role)).toEqual(["fg"]);
    expect(colourUsesIn("bg-card").map((u) => u.role)).toEqual(["bg"]);
    expect(colourUsesIn("border-border ring-ring").map((u) => u.role)).toEqual([
      "edge",
      "edge",
    ]);
  });

  it("strips variant prefixes at bracket depth zero", () => {
    expect(splitVariants("hover:bg-brand").utility).toBe("bg-brand");
    expect(splitVariants("data-[state=on]:bg-brand").utility).toBe("bg-brand");
    expect(splitVariants("group-hover/card:focus-visible:text-brand").utility).toBe(
      "text-brand",
    );
    expect(splitVariants("aria-invalid:ring-destructive").utility).toBe(
      "ring-destructive",
    );
    expect(splitVariants("sm:lg:bg-muted").chain).toEqual(["sm", "lg"]);
    // The opacity modifier is not part of the token name.
    expect(classifyUtility("bg-brand/10")).toEqual({ role: "bg", token: "brand" });
  });

  it("pairs a foreground with a background inside one string", () => {
    expect(pairingsIn("rounded-md bg-muted text-foreground px-2").map((p) => p.key)).toEqual([
      pairKey("foreground", "muted"),
    ]);
    // An unconditional foreground still pairs with a conditional background, because on hover both
    // are live.
    expect(pairingsIn("text-foreground hover:bg-muted").map((p) => p.key)).toEqual([
      pairKey("foreground", "muted"),
    ]);
  });

  it("does not pair across mutually exclusive variant chains (narrowing A)", () => {
    // `ui/calendar.tsx:221`, reduced. Two day states that never paint together.
    const keys = pairingsIn(
      "data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground",
    ).map((p) => p.key);
    expect(keys).toContain(pairKey("foreground", "muted"));
    expect(keys).toContain(pairKey("primary-foreground", "primary"));
    expect(keys).not.toContain(pairKey("foreground", "primary"));
    expect(keys).toHaveLength(2);
  });

  it("skips dark:-scoped utilities, which cannot paint (narrowing B)", () => {
    expect(pairingsIn("text-foreground dark:bg-input/30")).toEqual([]);
    expect(colourUsesIn("dark:bg-input/30")).toEqual([]);
  });

  it("pins the dormancy that makes narrowing B legitimate", () => {
    // Skipping a live utility would be a hole in the gate. These three props are the mechanism by
    // which the variant's selector could start matching, and all three are asserted so the
    // narrowing cannot outlive its justification. If any of them ever changes, this goes red and
    // the drift check must grow a third theme rather than keep skipping.
    expect(THEME_PROVIDER_SOURCE).toContain('attribute="data-theme"');
    expect(THEME_PROVIDER_SOURCE).toContain("enableSystem={false}");
    expect(THEME_PROVIDER_SOURCE).toContain('export const THEMES = ["court", "grove"] as const;');
    // The variant's own selector, from the stylesheet: it matches a descendant of `.dark`, and
    // nothing in the app is `.dark`.
    expect(
      readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8"),
    ).toContain("@custom-variant dark (&:is(.dark *));");
  });

  it("goes red on an undeclared pairing", () => {
    // Positive control on the whole pipeline: a component that hand-rolls brand ink on the
    // destructive surface is a pairing nobody declared, and it must be reported.
    const keys = pairingsIn("bg-destructive text-brand").map((p) => p.key);
    expect(keys).toHaveLength(1);
    expect(DECLARED.has(keys[0])).toBe(false);
  });

  it("keeps the inventory and the drift check reading the same names", () => {
    for (const pair of CONTRAST_PAIRS) {
      const known =
        COLOUR_TOKENS.includes(pair.fg) || pair.fg.endsWith("-hover");
      expect(known, `unknown fg token in the inventory: ${pair.fg}`).toBe(true);
    }
    expect(DECLARED.size).toBeGreaterThanOrEqual(20);
  });

  // ---------------------------------------------------------------------------------------------
  // The authoritative assertion.
  // ---------------------------------------------------------------------------------------------

  it("renders no foreground/background pairing the inventory does not declare", () => {
    expect(drift).toEqual([]);
  });
});
