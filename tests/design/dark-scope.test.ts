// THEME-05 — the half-built dark mode is gone from app code, and the count that survives in the
// vendored primitives is a DELIBERATE, ASSERTED exemption rather than an oversight.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE METRIC. STATE IT ONCE, BECAUSE THIS PHASE HAS ALREADY USED THREE.
//
//   This file pins OCCURRENCES: every match of the dark-variant prefix in the raw text of every
//   `.ts`/`.tsx` file under `src/components/ui/`. It is the `grep -rho | wc -l` number.
//
//   The two OTHER numbers the same tree yields, recorded so nobody re-derives the confusion:
//     • LINES (`grep -rc` summed with awk, the form written into 10-06's and 10-07's acceptance
//       criteria) = 24. A line carrying three variants counts once.
//     • FILES (`grep -rl | wc -l`) = 14, asserted below as a positive control.
//   Deferred item D-2 records the moment those were being read as one number. They are not.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY THE PINNED NUMBER IS 54 AND NOT THE 56 THIS PLAN WAS WRITTEN AGAINST.
//
//   10-14's plan, and THEME-05's wording before it, both say 56. That was true at the time the
//   requirement was written and stopped being true in plan 10-07, which closed deferred item D-2 by
//   removing the `destructive` variant's alpha-diluted focus ring from `ui/button.tsx` and — via the
//   widening that item asked for — from `ui/badge.tsx` as well. Removing an override honestly means
//   removing its second-colour-scheme twin too, and there were exactly two of those. 56 - 2 = 54.
//
//   The drop was measured, not inferred: 10-12 and 10-13 each re-measured the tree and both recorded
//   54 in their SUMMARY verification tables, before and after their own edits. This plan measured it
//   a third time before touching anything.
//
//   DO NOT "RESTORE" THE NUMBER TO 56. 56 is the count of a tree that had two accessibility defects
//   in it. Moving this assertion back would be asserting that they are back.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY THE 54 SURVIVE AT ALL (D-129 as amended) — the reason the count is an ASSERTION and not a
// sentence in a document.
//
//   `src/components/ui/**` is 30 vendored shadcn primitives. Fourteen of them carry variants for a
//   second colour scheme that this app never activates: the theme provider sets `data-theme`, never
//   the class the variant keys off (THEME-01), and both shipped themes are light-background (D-03).
//   So the 54 are provably-inert dead code.
//
//   Stripping them would nonetheless be the WRONG trade. Every one of those 14 files would become a
//   permanent fork, and every future `npx shadcn add` would re-introduce the same utilities into a
//   tree whose gate now bans them — which converts a one-time cleanup into an unbounded maintenance
//   tax on a class of utility that renders nothing. So they stay, and the NUMBER is what records the
//   decision. A future `npx shadcn add` that moves this number is a decision to make consciously,
//   not a test to edit.
//
//   The two other halves of D-129 as amended stay too, and are asserted at the bottom of this file:
//   `globals.css` keeps the custom-variant declaration and keeps its dormant block (a cheap future
//   theme, D-03). This plan removes the variant from APP CODE. It does not remove the mechanism.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE IS ALLOWED TO NAME THE STRING IT BANS.
//
//   Two scanners with two different roots, and both are now safe (deferred item D-1, closed by
//   10-12). The walker below roots at `src/`, so `tests/` is invisible to it. And Tailwind's content
//   scan roots at `src/` as well since `@import "tailwindcss" source("../")`, so naming the prefix
//   here cannot emit a phantom utility into the shipped stylesheet the way planning prose used to.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// KNOWN BLIND SPOTS, listed so the next reader under-trusts this file rather than over-trusts it.
//
//   • A TEXT SCAN CANNOT TELL A VARIANT FROM AN OBJECT KEY. A TypeScript property literally named
//     `dark` — `theme: { dark: "…" }` — is the same five characters and is preceded by whitespace
//     exactly like a class-list entry is. There are zero in `src/` today and the STRICT-versus-LOOSE
//     control below is what keeps that true: the strict form requires a utility-shaped token after
//     the colon, so the day an object key appears the two counts diverge and this file goes red.
//   • The comment stripper is the SHARED one (`helpers/strip-comments.ts`), and since WR-02 it does
//     strip trailing comments as well as leading ones — the blind spot recorded here previously
//     ("a trailing comment on a line that also carries code is NOT stripped") is closed. It remains
//     a SCANNER, not a parser: an unbalanced quote character puts the rest of ITS OWN LINE into
//     string state, so a comment on that line survives. That direction over-counts, and the
//     raw-versus-stripped control below is what makes an over-count visible rather than silent.
//   • This file proves the variant is absent from app SOURCE. It does not prove the app renders
//     correctly in a second colour scheme, because there is no second colour scheme to render in.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";

import { stripComments } from "./helpers/strip-comments";

const SRC_DIR = resolve(process.cwd(), "src");
const GLOBALS_CSS = resolve(process.cwd(), "src/app/globals.css");

/**
 * THE PREFIX, built rather than written, for one reason only: so that this constant's own
 * declaration cannot be mistaken for a call site by any future scanner that walks `tests/` too.
 * Every match below is a match of this exact five-character string.
 */
const DARK_PREFIX = `${"dark"}:`;

/**
 * LOOSE — the historical metric. Every occurrence of the prefix in raw text, exactly what
 * `grep -rho "dark:" | wc -l` counts. This is the number 10-06, 10-07, 10-12 and 10-13 all quoted,
 * so it is the one that stays comparable across the phase.
 */
const LOOSE = new RegExp(DARK_PREFIX, "g");

/**
 * STRICT — the same thing, shaped like a real Tailwind variant.
 *
 * `(?<![\w-])` is 10-12's call-site lookbehind and it is here for 10-13's reason: a bare word
 * boundary is not enough, because `-` IS a word boundary and would let a compound like a
 * `group-`-prefixed form match as if it were a bare variant. The lookahead requires a
 * utility-shaped token after the colon, which is what separates a variant from an object property
 * whose name happens to be `dark`.
 *
 * This pattern is NOT the pinned metric. It is the control on the pinned metric: the two must agree.
 */
const STRICT = new RegExp(`(?<![\\w-])${DARK_PREFIX}(?=[a-z[(])`, "g");

/** The partition boundary. A forward-slash path prefix — see `label()` for why that is load bearing. */
const VENDORED_PREFIX = "src/components/ui/";

/** THEME-05's scope: the two trees the requirement speaks about. */
const SCOPED_TREES = ["src/app/", "src/components/"] as const;

/**
 * Collect every `.ts`/`.tsx` file under a directory, recursively.
 * This phase's reference walker — see `tests/design/status-vocab.test.ts:144`.
 */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * WINDOWS PATH NORMALISATION — copied verbatim from `tests/use-server-exports.test.ts:302`.
 *
 * T-10-27, and it is the single most load-bearing line in this file. EVERY scope decision here is a
 * forward-slash path-PREFIX comparison, and on this box `path.relative` emits backslashes. Without
 * this line `VENDORED_PREFIX` matches nothing, all 150 in-scope files land in the app partition, the
 * vendored count comes back 0 and the app count comes back 54 — so the pin fails loudly, which is
 * the good case. The BAD case is the mirror: a partition that silently classified everything as
 * vendored would report zero app violations and pass perfectly. The positive control below names one
 * file on each side precisely so neither collapse can go unnoticed.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

interface Partitioned {
  /** Normalised paths of the files in this partition. */
  files: string[];
  /** Files in this partition carrying at least one occurrence. */
  filesWithHits: string[];
  /** LOOSE occurrences — the pinned metric. */
  occurrences: number;
  /** STRICT occurrences — the control. */
  strictOccurrences: number;
  /** LOOSE occurrences after comment-only lines are removed — the second control. */
  strippedOccurrences: number;
  /** `path:line` for every occurrence, for the failure message. */
  sites: string[];
}

function emptyPartition(): Partitioned {
  return {
    files: [],
    filesWithHits: [],
    occurrences: 0,
    strictOccurrences: 0,
    strippedOccurrences: 0,
    sites: [],
  };
}

function count(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanSrc() {
  const vendored = emptyPartition();
  const app = emptyPartition();
  /** Everything under `src/` that is in NEITHER tree — `src/lib/`, `src/middleware.ts`, and so on. */
  const outside = emptyPartition();

  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    const inScope = SCOPED_TREES.some((tree) => name.startsWith(tree));
    const bucket = name.startsWith(VENDORED_PREFIX) ? vendored : inScope ? app : outside;

    const text = readFileSync(file, "utf8");
    bucket.files.push(name);

    const n = count(text, LOOSE);
    if (n === 0) continue;

    bucket.occurrences += n;
    bucket.strictOccurrences += count(text, STRICT);
    bucket.strippedOccurrences += count(stripComments(text), LOOSE);
    bucket.filesWithHits.push(name);
    text.split(/\r?\n/).forEach((line, i) => {
      const perLine = count(line, LOOSE);
      if (perLine > 0) bucket.sites.push(`${name}:${i + 1} (x${perLine})`);
    });
  }

  return { vendored, app, outside };
}

const { vendored, app, outside } = scanSrc();

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE POSITIVE CONTROL. Every assertion in this file is either a ZERO or a COUNT, and both shapes
// are satisfied perfectly by a scanner that visited nothing: zero violations in zero files, and a
// partition boundary that classified everything into one side is invisible to a total. This block is
// the whole reason the two blocks below mean anything.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("THEME-05 — the scan reaches both sides of the boundary it partitions on", () => {
  it("walks a real app-code partition rather than an empty one", () => {
    expect(app.files.length).toBeGreaterThan(100);
  });

  it("finds the 13 vendored primitives that actually carry the variant", () => {
    // 13 rather than 14 since CR-01: `toggle.tsx`'s ONLY dark-prefixed utility was the alpha ring
    // twin, so removing it took the file out of this bucket entirely.
    expect(vendored.filesWithHits.length).toBe(13);
  });

  it("puts a named file on EACH side, so neither collapse of the partition can pass quietly", () => {
    // A path comparison broken by backslashes puts every file on one side. Naming one file per side
    // is what turns that from a silently-passing test into a failing one.
    expect(vendored.files).toContain("src/components/ui/button.tsx");
    expect(app.files).toContain("src/components/booking/bookings-tabs.tsx");
    expect(app.files).not.toContain("src/components/ui/button.tsx");
    expect(vendored.files).not.toContain("src/components/booking/bookings-tabs.tsx");
  });

  it("partitions EXHAUSTIVELY — every occurrence under src/ lands in exactly one bucket", () => {
    // Reconciliation, not decoration: it proves no file fell through all three predicates and took
    // its occurrences with it. `src/lib/` is outside THEME-05's stated scope, so it is measured here
    // rather than asserted as a requirement — and it currently contributes nothing.
    const total = vendored.occurrences + app.occurrences + outside.occurrences;
    expect(total).toBe(count(
      collectSourceFiles(SRC_DIR).map((f) => readFileSync(f, "utf8")).join("\n"),
      LOOSE,
    ));
    expect(outside.occurrences, `unexpected sites: ${outside.sites.join(", ")}`).toBe(0);
  });

  it("counts the same thing two different ways — the control on the metric itself", () => {
    // LOOSE vs STRICT: the strict form demands a utility-shaped token after the colon, so an object
    // property named `dark` or a compound `group-`-prefixed variant makes these diverge. LOOSE vs
    // COMMENT-STRIPPED: this phase has now hit the grep-versus-comment collision thirteen times, and
    // a comment quoting the prefix is textually indistinguishable from a real call site.
    expect(vendored.strictOccurrences, "a counted site is not a variant").toBe(vendored.occurrences);
    expect(vendored.strippedOccurrences, "a counted site is a comment").toBe(vendored.occurrences);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THEME-05's APP-CODE HALF.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("THEME-05 — no app-code surface carries a second-colour-scheme variant", () => {
  it("has ZERO occurrences under src/app/ and src/components/ outside the vendored tree", () => {
    expect(
      app.occurrences,
      `THEME-05: ${app.occurrences} occurrence(s) in ${app.filesWithHits.length} file(s).\n` +
        `A variant here is dead weight — nothing in this app ever activates that scheme (the provider\n` +
        `sets data-theme, and both shipped themes are light-background, D-03) — but it still has to be\n` +
        `re-reasoned about on every edit. Delete it; do NOT comment it out.\n\n` +
        app.sites.map((s) => `  ${s}`).join("\n"),
    ).toBe(0);
    expect(app.filesWithHits).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE PINNED DEVIATION.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("THEME-05 / D-129 as amended — the vendored survivors are a recorded decision", () => {
  it(
    "pins the vendored total at 44 OCCURRENCES (the number, not a copy of it) — the record of a " +
      "deliberate exemption taken so the shadcn primitives are not permanently forked and every future " +
      "`npx shadcn add` does not re-violate the rule; a change to this number is a decision to make " +
      "consciously, NOT a test to edit. It was THEME-05's original 56, then 54 when plan 10-07 removed " +
      "two alpha-diluted focus rings and their twins (deferred item D-2), and is now 44 because CR-01 " +
      "removed the invalid-state alpha ring from ten primitives and each took its dark twin with it",
    () => {
      expect(vendored.occurrences).toBe(44);
    },
  );

  it("keeps the MECHANISM in globals.css — this plan strips app code, it does not delete a feature", () => {
    const css = readFileSync(GLOBALS_CSS, "utf8");
    // The custom-variant declaration. Without it the surviving vendored utilities would not merely be
    // inert, they would fail to compile at all — and a build error is not what "provably-inert dead
    // code" means.
    expect(css).toMatch(/@custom-variant\s+dark\s+\(&:is\(\.dark\s+\*\)\);/);
    // The dormant block stays as a cheap future theme (D-03). It is NOT one of the two contracted
    // themes and tests/design/theme-tokens.test.ts deliberately does not read it.
    expect(css).toMatch(/^\.dark \{/m);
  });
});
