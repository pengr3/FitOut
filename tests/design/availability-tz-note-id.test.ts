// THE TIMEZONE-NOTE id IS DERIVED PER INSTANCE, IN BOTH BOOKING SURFACES — a static census (19.1-04).
//
// ── WHAT SHIPPED, AND HOW IT WAS MEASURED ────────────────────────────────────────────────────────
//
// `src/components/availability/availability-calendar.tsx` and
// `src/components/availability/date-pass-picker.tsx` each declared the SAME module-level literal for
// the id of their "Times shown in {City} time (GMT±N)" paragraph, and each bound their month grid to
// it with `aria-describedby`. `date-pass-picker.tsx` carried a comment asserting the collision was
// impossible: "Exactly one of the two surfaces renders per listing (a listing is exactly one mode),
// so the id can never appear twice in one document."
//
// That comment is FALSE, and it is false for a reason that does not need the second component at all.
// RESP-02 mounts a SECOND booking view inside a sheet on `/listings/[id]`
// (`e2e/helpers/booker-seed.ts:86-88`), so the SAME component is mounted twice while that sheet is
// open. Measured on this box at 375x812, recorded verbatim in
// `.planning/phases/19.1-…/evidence/triage-collision-in-place.txt` section 3:
//
//     PROBE BEFORE sheet open: #availability-tz-note=1 tz-note <p>=1
//     PROBE AFTER  sheet open: #availability-tz-note=2 tz-note <p>=2
//
//     strict mode violation: getByText(/Times shown in .*Makati.*\(GMT\+8\)/i) resolved to 2 elements:
//       1) <p aria-hidden="true" … id="availability-tz-note" …>…</p>
//       2) <p id="availability-tz-note" …>Times shown in Makati time (GMT+8)</p>
//
// Two elements, one id. That is an HTML-validity defect and an `aria-describedby` defect — the
// browser picks a target for the association and the person using a screen reader does not — and it
// is independent of any test. A module-level id literal is unsafe in ANY component that can be
// mounted more than once in a document, which on this route is every client component.
//
// ── WHY A STATIC CENSUS RATHER THAN A RENDER TEST ────────────────────────────────────────────────
//
// A render test proves two ids differ for the mounts it happens to make. This census proves the
// SHAPE that produced the duplicate cannot come back — a module-level string constant used directly
// as an `id` attribute value — in either file, for any id, whether or not anyone remembers to mount
// it twice. `tests/design/listing-reuse-predicate-census.test.ts` is the analog and the source of
// every idiom here: derive from source at runtime, guard against a vacuous scan, and prove the
// comment-stripping is load-bearing rather than decorative.
//
// ── WHY IT IS BUILD-BLOCKING AND DB-FREE ─────────────────────────────────────────────────────────
//
// `vitest.design.config.ts` collects `tests/design/**/*.test.ts`, declares no `globalSetup` and no
// `setupFiles`, and `package.json`'s `"build"` runs `test:design`. This file is collected
// automatically: no config edit was needed and none is permitted — adding either of those two keys
// is what would reintroduce the Docker dependency that config exists to exclude.
//
// ── THE FOUR WATCHED REDS ────────────────────────────────────────────────────────────────────────
//
// An absence assertion cannot notice its own subject is gone. Every property below was driven red
// before it was trusted; each mutation was applied alone, observed, and reverted.
//
//   (a) The whole file at HEAD, BEFORE the repair — 3 failed / 1 passed. The prohibition named both
//       components and their shared `TZ_NOTE_ID`; the literal census reported the id in CODE in both
//       files; the load-bearing case reported that stripping removed nothing (2 hits either way,
//       because at HEAD the literal lived in code and nowhere in prose).
//   (b) Restore `const TZ_NOTE_ID = "availability-tz-note";` at module scope in
//       `date-pass-picker.tsx` and point `id={…}` back at it → the prohibition and the literal
//       census both red, naming that one file.
//   (c) Delete the `aria-describedby` binding from `availability-calendar.tsx` → the non-vacuity
//       and per-file binding properties red: 1 bound site found where 2 are required, and that file
//       reporting 0. This is the property that stops the repair from trading a duplicate id for a
//       broken association.
//   (d) Feed the prohibition the UNSTRIPPED source → red, because the replacement comments in both
//       components deliberately QUOTE the id they no longer declare. That is the falsely-red
//       direction `tests/helpers/source-text.ts`'s header records, and it is the whole reason the
//       strip is here rather than a bare `not.toContain`.
//
// ⚠ THE CORRECT RESPONSE TO A RED HERE IS TO DERIVE THE id PER INSTANCE, NEVER TO RENAME THE
// LITERAL. Two different module-level literals in two files is the same defect with the collision
// postponed to the next component that mounts twice.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { stripComments } from "../helpers/source-text";

/** The two booking surfaces. They are each other's analog and must not diverge. */
const FILES = [
  "src/components/availability/availability-calendar.tsx",
  "src/components/availability/date-pass-picker.tsx",
] as const;

/** The id both files used to declare. Named here so the census can assert it is gone from CODE. */
const RETIRED_ID_LITERAL = "availability-tz-note";

/** Read a repo-relative file as text. */
function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

/**
 * The file's text, with comments removed by default.
 *
 * The `strip` parameter is not a convenience: the load-bearing case below calls this with `false` and
 * asserts the two answers DIFFER. A stripper that silently returned its input would make every
 * prohibition here pass over prose, and a stripper that returned the empty string would make every
 * prohibition pass over nothing.
 */
function codeOf(relativePath: string, strip = true): string {
  const source = readSource(relativePath);
  return strip ? stripComments(source) : source;
}

/** Every `id={EXPR}` expression in the given code, as the trimmed source text of `EXPR`. */
function idExpressions(code: string): string[] {
  return [...code.matchAll(/\bid=\{([^{}]+)\}/g)].map((m) => m[1].trim());
}

/** Every `aria-describedby={EXPR}` expression, as the trimmed source text of `EXPR`. */
function describedByExpressions(code: string): string[] {
  return [...code.matchAll(/\baria-describedby=\{([^{}]+)\}/g)].map((m) => m[1].trim());
}

/**
 * The describedby-BOUND id sites in one file: every `aria-describedby={E}` whose `E` is also used as
 * an `id={E}` in the same file. This is the accessibility association itself, counted — not the id
 * and not the reference, but the pair that has to survive the repair intact.
 */
function boundIdSites(relativePath: string, strip = true): string[] {
  const code = codeOf(relativePath, strip);
  const ids = new Set(idExpressions(code));
  return describedByExpressions(code).filter((expression) => ids.has(expression));
}

/**
 * Module-level string-literal constants in this file that are used DIRECTLY as the value of an `id`
 * attribute — the exact shape that produced the duplicate.
 *
 * The `^` anchor is what makes it "module-level": a constant declared inside a component body is
 * indented, and a per-instance derivation (`const x = \`${React.useId()}-tz-note\``) is not a string
 * literal in the first place. Both halves have to hold for a name to be reported, so a module
 * constant that is never used as an id (a label, a selector, a class) is correctly ignored.
 */
function moduleLevelIdLiterals(relativePath: string, strip = true): string[] {
  const code = codeOf(relativePath, strip);
  const declarations = [
    ...code.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=\s*(["'])(?:[^"'\\]|\\.)*\2\s*;?[ \t]*$/gm),
  ];
  return declarations
    .map((m) => m[1])
    .filter((name) => new RegExp(`\\bid=\\{\\s*${name}\\s*\\}`).test(code));
}

/** How many times the retired id literal appears in the given rendering of the file. */
function retiredLiteralHits(relativePath: string, strip = true): number {
  return codeOf(relativePath, strip).split(RETIRED_ID_LITERAL).length - 1;
}

describe("19.1-04 — the census can see what it is counting", () => {
  it("finds describedby-BOUND id sites in both files, and exactly one per file", () => {
    const perFile = FILES.map((file) => ({ file, sites: boundIdSites(file) }));
    const total = perFile.reduce((n, entry) => n + entry.sites.length, 0);

    // Anti-vacuity. Every prohibition below is an ABSENCE, and an absence is also what a broken walk
    // reports. This is the one property that separates "the tree is clean" from "the scan stopped
    // working", so it runs first and is a failure rather than a skip.
    expect(
      total,
      "The scan found ZERO describedby-bound id sites across " +
        `${FILES.join(" and ")}. That is not a clean tree — each of those files binds its timezone ` +
        "note to its month grid with `aria-describedby`, so a zero here means the walk or the " +
        "`id={…}` / `aria-describedby={…}` patterns stopped working and every prohibition in this " +
        "file is passing over nothing. Fix the scan rather than deleting the assertion.",
    ).toBeGreaterThan(0);

    // Pinned per file, because the total alone would stay green if one file lost its association and
    // the other grew a second one — which is precisely the drift these two twins are prone to.
    expect(
      perFile.map((entry) => `${entry.file} -> ${entry.sites.length}`),
      "Each booking surface binds EXACTLY ONE timezone note to its month grid, and that count is " +
        "unchanged from before the per-instance id repair. A file reporting 0 has had its " +
        "`aria-describedby` left pointing at an id that no longer exists — which is strictly worse " +
        "than the duplicate id this census replaced, because nothing on screen observes it. A file " +
        "reporting 2 has grown a second association nobody measured.",
    ).toEqual(FILES.map((file) => `${file} -> 1`));
  });
});

describe("19.1-04 — neither booking surface declares a module-level id literal", () => {
  it("no module-level string constant is used directly as an `id` attribute value", () => {
    const offenders = FILES.flatMap((file) =>
      moduleLevelIdLiterals(file).map((name) => `${file} -> ${name}`),
    );

    expect(
      offenders,
      "A module-level string constant is being used directly as a DOM `id` in " +
        `${FILES.join(" and ")}. For that to be safe, each of those components would have to be ` +
        "mounted at most ONCE per document — and it is not: RESP-02 mounts a second booking view " +
        "inside a sheet on `/listings/[id]` (`e2e/helpers/booker-seed.ts:86-88`), so the same " +
        "component is in the document twice while that sheet is open and the id is duplicated. " +
        "Measured, with the transcript, in `evidence/triage-collision-in-place.txt` section 3.\n" +
        "THE CORRECT RESPONSE IS TO DERIVE THE id PER INSTANCE — compose it from `React.useId()` " +
        "inside the component and point `aria-describedby` at the derived value in the same edit. " +
        "DO NOT rename the literal: two different module-level literals in two files is the same " +
        "defect with the collision postponed to the next component that mounts twice.",
    ).toEqual([]);
  });

  it("the retired id literal survives only in prose, never in code", () => {
    const inCode = FILES.map((file) => `${file} -> ${retiredLiteralHits(file)}`);

    expect(
      inCode,
      `The literal "${RETIRED_ID_LITERAL}" is still present in CODE. The id is derived per instance ` +
        "now, so any surviving occurrence outside a comment is either a second declaration or a " +
        "selector pinned to an id the components no longer emit. Both booking surfaces are allowed " +
        "to NAME it in prose — they do, to record what was repaired and why — which is exactly why " +
        "this property reads the comment-stripped text and not the raw file.",
    ).toEqual(FILES.map((file) => `${file} -> 0`));
  });

  it("comment-stripping is LOAD-BEARING here, not decorative — the raw read would be RED", () => {
    // Direction 1 of the both-directions rule (`tests/helpers/source-text.ts`'s header, and
    // `tests/design/listing-reuse-predicate-census.test.ts`'s precedent): the strip must actually
    // remove something, or the property above could be passing over a tree that never mentioned the
    // id at all — and the two outcomes are indistinguishable from its result.
    const stripped = FILES.reduce((n, file) => n + retiredLiteralHits(file, true), 0);
    const unstripped = FILES.reduce((n, file) => n + retiredLiteralHits(file, false), 0);

    expect(
      { stripped, unstripped },
      "Comment-stripping removed NOTHING, so the prohibition above is not being protected by it and " +
        "would read the same on the raw file. Both components deliberately QUOTE the id they no " +
        "longer declare, in the note explaining why it is derived per instance — so the unstripped " +
        "count MUST exceed the stripped one. If it does not, either `stripComments` has stopped " +
        "working (in which case every prohibition built on it is suspect) or those explanatory " +
        "notes have been deleted, and a comment removed is how this defect shipped the first time.",
    ).toMatchObject({ stripped: 0 });
    expect(unstripped).toBeGreaterThan(stripped);
  });
});
