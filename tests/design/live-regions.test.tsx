// @vitest-environment jsdom

// GATE-03 — THE BOOKER PATH'S LIVE REGIONS, AUDITED OVER A SET THAT SAYS WHAT IT IS.
//
// Three source scans plus one render fixture. `src/lib/design/live-regions.ts` is the declaration; this
// file is what makes it binding, and the render half is what makes SCAN 3 an argument rather than a
// preference.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE SCANS AND THE RENDER LIVE IN ONE FILE (a planner call, recorded so it is not re-litigated)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A `.ts` source scan CANNOT compute an accessible name — there is no document, no ARIA implementation
// and nothing to hand `dom-accessibility-api`. A render test CANNOT read the tree it is auditing, because
// the nine components reach server modules, product data and a booking context, while
// `vitest.design.config.ts` is DB-free by construction. The two jobs are genuinely incompatible in one
// mechanism, and splitting them across two files would put the SCAN's premise in one place and its
// JUSTIFICATION in another, where the next person to relax the scan will not find it.
//
// So: one `.tsx` file with `// @vitest-environment jsdom` on line 1 — `skeleton-a11y.test.tsx` is the
// precedent that a `tests/design/**` file may do this and still run under the DB-free config. The scan
// half reads source with `node:fs` and asserts STRUCTURE. The render half renders two three-line
// fixtures, imports no domain component, and asserts the MECHANISM the structure stands in for.
//
// `dom-accessibility-api` IS NOT IMPORTED, HERE OR ANYWHERE IN THIS REPOSITORY. It is reached through
// `@testing-library`'s `{ name }` option, which is the engine behind every `getByRole(…, { name })` in
// the tree. Adding the direct import would be a new dependency edge for a capability already present
// (T-12-06-SC).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FIVE PROBES, ALL RUN, ALL REVERTED (18 August 2026). GREEN IS 20 PASSED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Command for all five:
// `npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.tsx`
//
//   (0) THE UNPLANNED ONE, AND IT FIRED ON THE FIRST RUN AGAINST A TREE NOBODY HAD MUTATED. The
//       exclusion-reason floor went red on a row whose `why` read `"Phase 13's RSVP form (BFLOW-08)."`
//       — 33 characters, a TAG rather than a reason. 1 failed / 19 passed:
//
//         AssertionError: an excluded file's `why` does not name the phase that owns it. "Phase 13
//         owns these" is the whole content of an exclusion; without it the list is a set of files
//         somebody chose not to check.: expected [ Array(1) ] to deeply equal []
//         + [ "src/components/group/rsvp-form.tsx" ]
//
//       Fixed by writing the three group rows a real sentence each, NOT by lowering the floor. Worth
//       recording precisely because it is the failure mode the whole module is about: the row existed,
//       it looked complete in review, and it said nothing a reader could check.
//
//   (a) THE BANNED POLITENESS LEVEL COMES BACK. `aria-live="assertive"` restored on
//       `hold-expired-state.tsx`'s `CardContent`. 3 failed / 17 passed — SCAN 1 from both sides plus
//       the per-kind shape check, which is why each is asserted separately. The three received arrays,
//       verbatim:
//
//         + [ "src/components/booking/hold-expired-state.tsx:37 — aria-live=\"assertive\"" ]
//         + [ "src/components/booking/hold-expired-state.tsx:37 (status#1) aria-live=\"assertive\"" ]
//         + [ "src/components/booking/hold-expired-state.tsx:37 (status#1) is role=\"status\" with
//              aria-live=\"assertive\"" ]
//
//       File AND line AND the region's key, because "somewhere on the booker path" is not an
//       actionable failure. Reverted → 20 passed.
//
//   (b) AN UNDECLARED REGION SHIPS, AND THE FINDING IS *WHICH* ELEMENT GOT NAMED. A bare
//       `<div role="status">Probe</div>` inserted between `slot-picker.tsx`'s pending helper and its
//       gap hint. 1 failed / 19 passed:
//
//         AssertionError: GATE-03's inventory disagrees with the tree.
//           PRESENT BUT UNDECLARED (a live region shipped with no stated reason):
//           src/components/availability/slot-picker.tsx:290 — status#3 on <div> (role="status")
//           src/components/availability/slot-picker.tsx renders, in source order:
//             :281 status#1 <p> → slot-picker-pending-helper
//             :286 status#2 <div> → slot-picker-gap-hint
//             :290 status#3 <div> → NO ROW
//           One of each is normally ONE rename. An INSERTION shows up as one displaced region at the
//           end of a file's sequence — read the sequence above, not just the line number. …
//
//       READ THE SEQUENCE, BECAUSE THE REPORTED LINE IS THE INNOCENT ONE. Line 286 is the PROBE — it
//       took `slot-picker-gap-hint`'s key by sitting at that ordinal — and line 290 is the real gap
//       hint, displaced and reported as having no row. An ordinal identifies a POSITION, not an
//       element, and an insertion among same-kind siblings therefore accuses the last sibling. The
//       full-sequence block in the message exists because of this probe and did not exist before it;
//       without it the failure points a developer at correct markup.
//
//       Inserting a region of a DIFFERENT kind cannot displace anything, which is why the ordinal is
//       per-kind rather than per-file — probed separately with `<div role="alert">Probe</div>` in the
//       same position, 1 failed / 19 passed, and the report names the insertion itself:
//
//         + [ "  src/components/availability/slot-picker.tsx:286 — alert#1 on <div> (role=\"alert\")" ]
//
//       Both reverted → 20 passed.
//
//   (c) A LOADING REGION LOSES ITS NAME — the probe that matters most, because the failure LOOKS
//       correct in review: the `sr-only` sentence is still right there in the markup. `aria-label`
//       removed from `availability-calendar.tsx`'s day skeleton. 1 failed / 19 passed:
//
//         + [ "src/components/availability/availability-calendar.tsx:408 (loading#1) has no aria-label
//              or aria-labelledby. Its children are aria-hidden placeholders, so with no
//              author-supplied name it announces the empty string. role=\"status\" is nameFrom:author
//              — see the render fixture below." ]
//
//       Reverted → 20 passed.
//
//   (d) GUARD-THE-GUARD / VACUITY. `SCAN_FILES` re-pointed at
//       `src/components/booking/hold-expired-state-nope.tsx` in place of the real path. 4 failed /
//       16 passed:
//
//         FAIL  … > every declared file exists and is non-empty
//         + [ "src/components/booking/hold-expired-state-nope.tsx — ENOENT" ]
//         FAIL  … > found at least one live region in EVERY declared file — no file is padding
//         + [ "src/components/booking/hold-expired-state-nope.tsx" ]
//         FAIL  … > reports declared-but-absent and present-but-undeclared together
//         + [ "  hold-expired-state — declared at
//              src/components/booking/hold-expired-state.tsx#status#1" ]
//         FAIL  … > every declared row's file is in the declared set, and every key is unique
//
//       BUT SCAN 1 AND SCAN 3 BOTH STAYED GREEN — over a file the walker never opened they reported a
//       perfectly clean result, indistinguishable from a real one, and would have stayed that way
//       forever. That is the entire argument for the guards running first, and it is the third time
//       this repository has measured it (`sheet-absent.test.ts` probe (d),
//       `selector-contract.test.ts`). Reverted → 20 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • IT CANNOT SAY HOW MANY TIMES A SCREEN READER SPEAKS. This file reads source and renders two
//     synthetic fixtures. Announcement is browser + AT behaviour, not a DOM property. The announce-once
//     COUNT is `e2e/hold-countdown.spec.ts`'s clock-driven `toBe(1)` over a fifteen-minute hold (and
//     its jsdom twin in `tests/booking/hold-countdown.test.tsx`); RULE 6's one-region-per-outcome claim
//     belongs to `e2e/collision-in-place.spec.ts` (plan 12-13). Whether a real reader utters them in
//     the intended ORDER is a listening test, routed to human UAT in Phase 17.
//   • IT READS AUTHORED SOURCE. A `role` or an `aria-live` composed at runtime is invisible to the AST
//     walk — which is why literal-valued `role` and `aria-busy` are asserted directly below, closing
//     the hole in the one direction it can be closed from here.
//   • THE RENDER HALF IS SYNTHETIC ON PURPOSE. It proves what `role="status"` does with a name and
//     without one. It does NOT prove that any product component renders that shape — SCAN 3 is what
//     says that, and this is what says SCAN 3 is asking for the right attribute.
//   • THE EXCLUSIONS ARE NOT AUDITED. Nine files carry `aria-live` outside the declared set and this
//     file makes no claim about any of them. `live-regions.ts`'s own footer says the same thing; it is
//     repeated here because this is the file whose green run is most likely to be read as coverage.
//   • `announces` AND `why` ARE PROSE. Nothing can tell a true sentence from a plausible one. The
//     assertions below check that the columns are non-trivially populated, which is a floor, not a
//     verification.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

import { stripComments } from "./helpers/strip-comments";
import {
  BOOKER_PATH_LIVE_REGION_FILES,
  LIVE_REGION_EXCLUSIONS,
  LIVE_REGION_IDS,
  LIVE_REGIONS,
  LIVE_REGION_KEYS,
  AUTHOR_NAMED_KINDS,
  liveRegionKey,
  type LiveRegionKind,
} from "@/lib/design/live-regions";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The set under audit, taken as a PARAMETER everywhere so probe (d) is a one-line edit and so the
// self-tests below run the same code path the real assertions run (`leak.test.ts:208-212`'s rule).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const SCAN_FILES: readonly string[] = BOOKER_PATH_LIVE_REGION_FILES;

/**
 * The declared file count, pinned HERE as well as at `DeclaredFileCountIsTen`.
 *
 * Two places on purpose. The type alias fails the build; this fails the gate that reads the set, with a
 * message. Plans 12-12 and 12-13 each move BOTH, in the commit that adds their component — a set that
 * widened in one place and not the other is the exact drift T-12-06-SETDRIFT names.
 *
 * TEN as of plan 12-12, which added `src/components/search/relax-band.tsx` (STATE-03's relaxation band,
 * `role="status"`, one announcement on arrival). Eleven when 12-13 adds `collision-notice.tsx`.
 */
const DECLARED_FILE_COUNT = 10;

/** A file this size is a stub or a truncated read; every declared file is far larger. */
const MIN_FILE_BYTES = 200;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The collector
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** One attribute value, plus whether it was a literal the scan can actually read. */
type AttrValue = { readonly raw: string; readonly literal: boolean };

type FoundRegion = {
  readonly file: string;
  readonly line: number;
  readonly kind: LiveRegionKind;
  /** 1-based ordinal among regions of the SAME kind in the SAME file, in source order. */
  readonly at: number;
  readonly key: string;
  readonly role: AttrValue | null;
  readonly ariaLive: AttrValue | null;
  readonly ariaBusy: AttrValue | null;
  readonly named: boolean;
  /** The JSX tag, for failure messages — `div`, `p`, `CardContent`. */
  readonly tag: string;
};

/** The attributes that make an element a live region, or that decide its shape. */
const WATCHED = new Set(["role", "aria-live", "aria-busy", "aria-label", "aria-labelledby"]);

function attrValue(attr: ts.JsxAttribute, sf: ts.SourceFile): AttrValue {
  const init = attr.initializer;
  // A bare attribute (`<div hidden />`) has no initializer; treat it as the empty literal.
  if (init === undefined) return { raw: "", literal: true };
  if (ts.isStringLiteral(init)) return { raw: init.text, literal: true };
  if (ts.isJsxExpression(init)) {
    const expr = init.expression;
    if (expr !== undefined && ts.isStringLiteral(expr)) return { raw: expr.text, literal: true };
    if (expr !== undefined && ts.isNoSubstitutionTemplateLiteral(expr)) {
      return { raw: expr.text, literal: true };
    }
    // Anything else — a ternary, an identifier, a template with substitutions. The raw text is kept
    // so SCAN 1 can still look inside it; `literal: false` is what stops the shape checks pretending
    // they know the value.
    return { raw: init.getText(sf), literal: false };
  }
  return { raw: init.getText(sf), literal: false };
}

/**
 * Classify an element into one of the five declared kinds.
 *
 * `aria-busy` FIRST, and that ordering is the anti-dodge: an element carrying `aria-busy="true"` is a
 * `loading` region no matter what else it says, so a skeleton cannot be relabelled as a plain `status`
 * to escape SCAN 3's `aria-label` requirement. It would simply key as `#loading#N` and be reported by
 * SCAN 2 as present-but-undeclared while its row was reported as declared-but-absent.
 */
function classify(role: string | null, ariaBusy: string | null): LiveRegionKind | null {
  if (ariaBusy === "true") return "loading";
  if (role === "alert") return "alert";
  if (role === "timer") return "timer";
  if (role === "status") return "status";
  return "threshold";
}

/**
 * Walk one module's JSX and collect every live region in it, in source order.
 *
 * `(file, text)` rather than `(file)` so the self-tests can feed fixtures that are never written to
 * disk and still exercise this exact function.
 */
function collectFrom(file: string, text: string): FoundRegion[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: FoundRegion[] = [];
  const perKind = new Map<LiveRegionKind, number>();

  const visitElement = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): void => {
    const attrs = new Map<string, AttrValue>();
    for (const property of node.attributes.properties) {
      if (!ts.isJsxAttribute(property)) continue;
      const name = property.name.getText(sf);
      if (!WATCHED.has(name)) continue;
      attrs.set(name, attrValue(property, sf));
    }

    const role = attrs.get("role") ?? null;
    const ariaLive = attrs.get("aria-live") ?? null;
    const ariaBusy = attrs.get("aria-busy") ?? null;

    // A live region is an element with `aria-live`, or with one of the three roles that IS one.
    const roleIsRegion =
      role !== null && role.literal && ["status", "alert", "timer"].includes(role.raw);
    if (ariaLive === null && !roleIsRegion) return;

    const kind = classify(
      role !== null && role.literal ? role.raw : null,
      ariaBusy !== null && ariaBusy.literal ? ariaBusy.raw : null,
    );
    if (kind === null) return;

    const at = (perKind.get(kind) ?? 0) + 1;
    perKind.set(kind, at);

    out.push({
      file,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      kind,
      at,
      key: liveRegionKey({ file, kind, at }),
      role,
      ariaLive,
      ariaBusy,
      named: attrs.has("aria-label") || attrs.has("aria-labelledby"),
      tag: node.tagName.getText(sf),
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) visitElement(node);
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return out;
}

type Scan = {
  /** `file — ENOENT` / `file — N bytes` for every declared path the walker could not use. */
  readonly unreadable: string[];
  /** Every file actually opened. */
  readonly opened: string[];
  readonly regions: FoundRegion[];
  /** `file:line — aria-live="assertive"` from the COMMENT-STRIPPED text of each file. */
  readonly assertiveText: string[];
};

/**
 * The banned politeness level, matched in either quote style, INCLUDING the closing delimiter so the
 * failure message quotes a whole attribute rather than a truncated one.
 *
 * It deliberately does not try to reach inside a JSX expression: `aria-live={x ? "assertive" : "polite"}`
 * is invisible to this regex and is caught by the AST assertion beside it, which is why SCAN 1 is
 * asserted from two sides rather than one.
 */
const ASSERTIVE = /aria-live\s*=\s*["'{][^"'}]*assertive[^"'}]*["'}]?/g;

function scan(files: readonly string[]): Scan {
  const result: Scan = { unreadable: [], opened: [], regions: [], assertiveText: [] };

  for (const file of files) {
    const abs = resolve(process.cwd(), file);
    if (!existsSync(abs)) {
      result.unreadable.push(`${file} — ENOENT`);
      continue;
    }
    const bytes = statSync(abs).size;
    if (bytes < MIN_FILE_BYTES) {
      result.unreadable.push(`${file} — ${bytes} bytes`);
      continue;
    }
    const text = readFileSync(abs, "utf8");
    result.opened.push(file);

    // COMMENTS STRIPPED FIRST for the text scan. Every one of these files explains its live region in
    // prose, and `live-regions.ts` quotes the banned value by name; a scan that counted prose would be
    // red against the tree that documents the decision correctly.
    stripComments(text)
      .split("\n")
      .forEach((line, index) => {
        for (const match of line.matchAll(ASSERTIVE)) {
          result.assertiveText.push(`${file}:${index + 1} — ${match[0]}`);
        }
      });

    result.regions.push(...collectFrom(file, text));
  }

  return result;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
const scanned = scan(SCAN_FILES);

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// GUARD-THE-GUARD FIRST, on purpose: every zero below is worthless if the scan opened nothing.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("guard-the-guard — the scan read the set it is asserting about", () => {
  it("every declared file exists and is non-empty", () => {
    expect(
      scanned.unreadable,
      "a declared path could not be read. SCAN 1 and SCAN 3 are ABSENCE assertions: over a file the " +
        "walker never opened they report a perfectly clean result, indistinguishable from a real one, " +
        "and they would stay that way forever.",
    ).toEqual([]);
    expect(scanned.opened).toHaveLength(SCAN_FILES.length);
  });

  it(`audits exactly ${DECLARED_FILE_COUNT} files, the number the type alias pins`, () => {
    expect(
      SCAN_FILES.length,
      `the declared set is ${SCAN_FILES.length} files, not ${DECLARED_FILE_COUNT}. This number is ` +
        "pinned in TWO places — `DeclaredFileCountIsTen` in `src/lib/design/live-regions.ts` fails " +
        "the build, and this fails the gate with a message. Plans 12-12 and 12-13 each move BOTH, in " +
        "the same commit as the component they add. A set that widened in one place and not the other " +
        "is exactly the drift T-12-06-SETDRIFT names.",
    ).toBe(DECLARED_FILE_COUNT);
  });

  it("found at least one live region in EVERY declared file — no file is padding", () => {
    const barren = SCAN_FILES.filter((f) => !scanned.regions.some((r) => r.file === f));
    expect(
      barren,
      "a declared file contributes no live region at all. Either it lost its region (and its rows " +
        "should go with it) or it never had one, in which case the set is padded and the gate's " +
        "reach reads wider than it is.",
    ).toEqual([]);
  });

  it("pointed at a path that does not exist, reports it rather than passing over it", () => {
    // Probe (d) as a permanent assertion rather than a one-off. The realistic version of this failure
    // is a path renamed by a refactor, which never throws — it just quietly stops being audited.
    const empty = scan(["src/components/booking/hold-expired-state-nope.tsx"]);
    expect(empty.unreadable).toEqual([
      "src/components/booking/hold-expired-state-nope.tsx — ENOENT",
    ]);
    expect(empty.regions, "…and it reports zero regions over nothing").toEqual([]);
    expect(empty.assertiveText, "…and a perfectly clean SCAN 1").toEqual([]);
  });

  it("declares an exclusion list, and every exclusion names its owning phase", () => {
    // The exclusions are the half of the declaration that cannot be reconstructed from the tree: a
    // file deliberately left to Phase 13 and a file nobody ever looked at scan identically.
    expect(LIVE_REGION_EXCLUSIONS.length).toBeGreaterThan(0);
    const unreasoned = LIVE_REGION_EXCLUSIONS.filter(
      (row) => !/Phase\s+1[34]/.test(row.why) || row.why.length < 40,
    ).map((row) => row.file);
    expect(
      unreasoned,
      "an excluded file's `why` does not name the phase that owns it. \"Phase 13 owns these\" is the " +
        "whole content of an exclusion; without it the list is a set of files somebody chose not to " +
        "check.",
    ).toEqual([]);
    // No path may be both declared and excluded — the two lists are a partition, not two opinions.
    const overlap = LIVE_REGION_EXCLUSIONS.map((row) => row.file).filter((file) =>
      (SCAN_FILES as readonly string[]).includes(file),
    );
    expect(overlap).toEqual([]);
  });

  it("every row's `announces` names a text change and every `why` names a rule", () => {
    // A floor on the prose columns, not a verification of them — see the NOT COVERED footer.
    const thin = LIVE_REGION_IDS.filter((id) => {
      const row = LIVE_REGIONS[id];
      return row.announces.length < 40 || !/RULE\s+[1-7]/i.test(row.why);
    });
    expect(
      thin,
      "a row's `announces` is too short to name both a text change and a moment, or its `why` cites " +
        "none of GATE-03's seven numbered rules. A row whose reason is \"so it announces\" is true of " +
        "every live region ever written and is a row that should not exist.",
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SCAN 1 — the banned politeness level, from both sides.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("SCAN 1 — `aria-live=\"assertive\"` is banned on the declared set", () => {
  it("finds it in no declared file", () => {
    expect(
      scanned.assertiveText,
      "the interrupting politeness level is back on the booker path. It talks over whatever a screen " +
        "reader is currently speaking — on the checkout route, plausibly the price. GATE-03 rule 7: " +
        "where an event genuinely must be noticed, the mechanism is a POLITE region plus MOVED FOCUS, " +
        "which is what `hold-expired-state.tsx` does.",
    ).toEqual([]);
  });

  it("and no COLLECTED region carries it either — including inside a computed value", () => {
    // The text scan catches the literal. This catches `aria-live={x ? "assertive" : "polite"}`, which
    // is the spelling a text scan sees and a shape check would not, and it names the region's key.
    const offenders = scanned.regions
      .filter((region) => region.ariaLive !== null && region.ariaLive.raw.includes("assertive"))
      .map(
        (region) =>
          `${region.file}:${region.line} (${region.kind}#${region.at}) aria-live=${JSON.stringify(
            region.ariaLive?.raw,
          )}`,
      );
    expect(offenders).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SCAN 2 — the declared set and the rendered set are the SAME SET.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("SCAN 2 — every region has a row, and every row has a region", () => {
  it("reports declared-but-absent and present-but-undeclared together", () => {
    const found = new Map(scanned.regions.map((region) => [region.key, region] as const));

    const undeclared = scanned.regions
      .filter((region) => !LIVE_REGION_KEYS.has(region.key))
      .map(
        (region) =>
          `  ${region.file}:${region.line} — ${region.kind}#${region.at} on <${region.tag}> ` +
          `(role=${JSON.stringify(region.role?.raw ?? null)})`,
      );

    const absent = LIVE_REGION_IDS.filter((id) => !found.has(liveRegionKey(LIVE_REGIONS[id]))).map(
      (id) => `  ${id} — declared at ${liveRegionKey(LIVE_REGIONS[id])}`,
    );

    // THE WHOLE SEQUENCE FOR ANY FILE THAT DISAGREES, and this is not verbosity — it is the fix for a
    // measured weakness of ordinal keying. A new same-kind region INSERTED among existing ones takes
    // the identity of the row that used to sit at its ordinal and displaces the LAST one, so the
    // reported violation names an innocent element and the actual insertion is invisible. Probe (b)
    // measured exactly that. Printing the file's full sequence puts the shift on screen.
    const dirtyFiles = [
      ...new Set([
        ...scanned.regions.filter((r) => !LIVE_REGION_KEYS.has(r.key)).map((r) => r.file),
        ...LIVE_REGION_IDS.filter((id) => !found.has(liveRegionKey(LIVE_REGIONS[id]))).map(
          (id) => LIVE_REGIONS[id].file,
        ),
      ]),
    ];
    const context = dirtyFiles.map(
      (file) =>
        `  ${file} renders, in source order:\n` +
        scanned.regions
          .filter((region) => region.file === file)
          .map(
            (region) =>
              `    :${region.line} ${region.kind}#${region.at} <${region.tag}> → ` +
              `${LIVE_REGION_KEYS.get(region.key) ?? "NO ROW"}`,
          )
          .join("\n"),
    );

    // BOTH DIRECTIONS IN ONE MESSAGE, because one of each is almost always a single rename and two
    // separate failures make the reader do the join by hand.
    expect(
      [...undeclared, ...absent],
      "GATE-03's inventory disagrees with the tree.\n" +
        (undeclared.length > 0
          ? "  PRESENT BUT UNDECLARED (a live region shipped with no stated reason):\n" +
            undeclared.join("\n") +
            "\n"
          : "") +
        (absent.length > 0
          ? "  DECLARED BUT ABSENT (a row whose region is gone — usually the other half of a rename):\n" +
            absent.join("\n") +
            "\n"
          : "") +
        (context.length > 0 ? context.join("\n") + "\n" : "") +
        "  One of each is normally ONE rename. An INSERTION shows up as one displaced region at the " +
        "end of a file's sequence — read the sequence above, not just the line number. Add the row in " +
        "`src/lib/design/live-regions.ts` with the sentence the user hears and the numbered rule it " +
        "satisfies — never delete the row to make this green.",
    ).toEqual([]);
  });

  it("every declared row's file is in the declared set, and every key is unique", () => {
    for (const id of LIVE_REGION_IDS) {
      expect(SCAN_FILES, `${id} names a file outside the audited set`).toContain(
        LIVE_REGIONS[id].file,
      );
    }
    const keys = LIVE_REGION_IDS.map((id) => liveRegionKey(LIVE_REGIONS[id]));
    expect(
      new Set(keys).size,
      "two rows share a key, so one of them is asserting nothing and the set comparison above is " +
        "green with a region uncovered",
    ).toBe(keys.length);
    expect(LIVE_REGION_KEYS.size).toBe(LIVE_REGION_IDS.length);
  });

  it("reads markup and not prose, in both directions", () => {
    // Without this, the equality above is satisfiable by a collector that finds nothing at all.
    const flagged = collectFrom(
      "fixture.tsx",
      'export const A = () => <div role="status" aria-label="x">hi</div>;',
    );
    expect(flagged.map((r) => r.key)).toEqual(["fixture.tsx#status#1"]);

    const prose = collectFrom(
      "fixture.tsx",
      [
        '// <div role="status" aria-live="assertive" /> is what this used to be',
        '/* aria-live="assertive" is banned; see live-regions.ts */',
        "export const A = () => <div className=\"p-4\" />;",
      ].join("\n"),
    );
    expect(
      prose,
      "the collector counted a live region that exists only in a comment. These files explain their " +
        "regions in prose and a scan that counted the explanation would be red against a correct tree.",
    ).toEqual([]);
  });

  it("keys same-kind regions by their ordinal, which is why `slot-picker.tsx` needs one", () => {
    const two = collectFrom(
      "fixture.tsx",
      'export const A = () => (<div><p role="status">a</p><p role="status">b</p></div>);',
    );
    expect(two.map((r) => r.key)).toEqual(["fixture.tsx#status#1", "fixture.tsx#status#2"]);

    // A region of a DIFFERENT kind does not renumber them — the reason the ordinal is per-kind and
    // not per-file. Probe (b) measured the cascade that the per-file spelling would have produced.
    const mixed = collectFrom(
      "fixture.tsx",
      'export const A = () => (<div><p role="status">a</p><p role="alert">e</p><p role="status">b</p></div>);',
    );
    expect(mixed.map((r) => r.key)).toEqual([
      "fixture.tsx#status#1",
      "fixture.tsx#alert#1",
      "fixture.tsx#status#2",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SCAN 3 — the naming mechanism, and the shape each kind is required to have.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("SCAN 3 — the naming mechanism, per kind", () => {
  it("every `loading` region is named by its author", () => {
    // THE CLAIM 12-UI-SPEC's falsifiable #3 is really about, narrowed to where it is TRUE and
    // load-bearing. `role="status"` is nameFrom:author, so a region whose children are all
    // `aria-hidden` placeholders has NOTHING to announce without an author-supplied name. The render
    // fixture below is the measurement; this is the structural proxy for it.
    const offenders = scanned.regions
      .filter((region) => AUTHOR_NAMED_KINDS.includes(region.kind) && !region.named)
      .map(
        (region) =>
          `${region.file}:${region.line} (${region.kind}#${region.at}) has no aria-label or ` +
          "aria-labelledby. Its children are aria-hidden placeholders, so with no author-supplied " +
          'name it announces the empty string. role="status" is nameFrom:author — see the render ' +
          "fixture below.",
      );
    expect(offenders).toEqual([]);
  });

  it("and no OTHER kind mixes the two naming mechanisms", () => {
    // The other direction, and it is not symmetry for its own sake. Every non-`loading` region on
    // this path carries its own sentence, and that sentence IS what a screen reader speaks when the
    // region updates. An `aria-label` on such a region names it with a second string nobody wrote for
    // the booker, and on at least one AT pairing a named live region is announced BY ITS NAME rather
    // than by its content — i.e. the message is replaced. Two mechanisms, one region, is the
    // ambiguity; the ban is which one wins being stated in markup rather than left to the reader.
    const offenders = scanned.regions
      .filter((region) => !AUTHOR_NAMED_KINDS.includes(region.kind) && region.named)
      .map(
        (region) =>
          `${region.file}:${region.line} (${region.kind}#${region.at}) carries BOTH its own text and ` +
          "an author name. Pick one: a decorative-content region is `loading` and takes an " +
          "aria-label; a region whose text is the message takes neither.",
      );
    expect(offenders).toEqual([]);
  });

  it("holds every kind to its declared attribute shape", () => {
    // `live-regions.ts`'s mapping table, as assertions. Without this, `kind` would be a label a row
    // could set to anything — and `loading` is the one kind that carries an obligation, so every
    // other kind is a place to hide from it.
    const problems: string[] = [];
    for (const region of scanned.regions) {
      const where = `${region.file}:${region.line} (${region.kind}#${region.at})`;
      const role = region.role;
      const live = region.ariaLive;

      if (role !== null && !role.literal) {
        problems.push(`${where} has a COMPUTED role (${role.raw}); this scan cannot read it`);
      }
      if (region.ariaBusy !== null && !region.ariaBusy.literal) {
        problems.push(`${where} has a COMPUTED aria-busy; this scan cannot read it`);
      }

      switch (region.kind) {
        case "loading":
          if (role?.raw !== "status") problems.push(`${where} is busy but not role="status"`);
          break;
        case "alert":
          if (live !== null) problems.push(`${where} is role="alert" and also sets aria-live`);
          break;
        case "timer":
          if (live?.raw !== "off") {
            problems.push(
              `${where} is role="timer" without aria-live="off". Ticking numerals inside a live ` +
                "region speak over the booker once a second for fifteen minutes — the specific " +
                "defect GATE-03 is named for.",
            );
          }
          break;
        case "status":
          if (live !== null && live.literal && live.raw !== "polite") {
            problems.push(`${where} is role="status" with aria-live=${JSON.stringify(live.raw)}`);
          }
          break;
        case "threshold":
          if (role !== null) {
            problems.push(
              `${where} is the role-less threshold region and has acquired role=` +
                `${JSON.stringify(role.raw)}. A role here is a PERMANENT implicit polite region, so ` +
                "the countdown's expiry would no longer be silent and `HoldExpiredState` would " +
                "become a SECOND region announcing one event (rule 6).",
            );
          }
          if (live === null || !live.raw.includes("polite")) {
            problems.push(`${where} is a threshold region that is not polite`);
          }
          break;
      }
    }
    expect(problems).toEqual([]);
  });

  it("exactly one `threshold` region exists, and it is the countdown's", () => {
    const thresholds = scanned.regions.filter((region) => region.kind === "threshold");
    expect(
      thresholds.map((region) => region.file),
      "`threshold` is the one shape on this path that carries `aria-live` with NO role, and it is a " +
        "deliberate exception with a measured reason (see `live-regions.ts`). A second one is far " +
        "more likely to be an anonymous live region than a second countdown.",
    ).toEqual(["src/components/booking/hold-countdown.tsx"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// RENDER — THE MECHANISM. Why SCAN 3 demands the attribute instead of accepting the sr-only child.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("the mechanism — `role=\"status\"` takes NO accessible name from its content", () => {
  const LABEL = "Loading test content";

  it("computes an EMPTY name for a status region named only by an sr-only child", () => {
    // This markup is exactly what "carry an `sr-only` label naming what is loading" describes in
    // prose, and its accessible name is `""`. `status` is `nameFrom: author` in ARIA — name-from-
    // content is not permitted for it, so the child names nothing. Measured through
    // `@testing-library`'s `{ name }` option, which is `dom-accessibility-api`; NOT imported directly.
    render(
      <div role="status" aria-busy="true">
        <span className="sr-only">{LABEL}</span>
      </div>,
    );
    expect(screen.queryAllByRole("status")).toHaveLength(1);
    expect(
      screen.queryAllByRole("status", { name: LABEL }),
      "a status region named by its own content would make every aria-label on this path redundant, " +
        "and SCAN 3 would be asking for an attribute nothing needs",
    ).toHaveLength(0);
  });

  it("computes the label when the author supplies one — the same div, one attribute apart", () => {
    render(
      <div role="status" aria-busy="true" aria-label={LABEL}>
        <span className="sr-only">{LABEL}</span>
      </div>,
    );
    expect(screen.queryAllByRole("status", { name: LABEL })).toHaveLength(1);
  });

  it("keeps the sr-only child, because CONTENT and NAME are different mechanisms", () => {
    // Both are wanted and the gate demands both for a `loading` region: the `aria-label` is what the
    // region IS, the `sr-only` span is what it SAYS when it appears. Dropping the span as "redundant"
    // once the label exists would leave a named region with nothing to announce.
    const { container } = render(
      <div role="status" aria-busy="true" aria-label={LABEL}>
        <span className="sr-only">{LABEL}</span>
      </div>,
    );
    const srOnly = container.querySelectorAll(".sr-only");
    expect(srOnly).toHaveLength(1);
    expect(srOnly[0].textContent).toBe(LABEL);
  });

  it("shows the same is NOT true of a role whose name comes from content", () => {
    // The control that makes the three assertions above a fact about `status` rather than a fact
    // about `dom-accessibility-api`. A button IS nameFrom:content, and it computes its name from the
    // same markup shape that leaves a status region unnamed.
    render(<button type="button">{LABEL}</button>);
    expect(screen.queryAllByRole("button", { name: LABEL })).toHaveLength(1);
  });
});
