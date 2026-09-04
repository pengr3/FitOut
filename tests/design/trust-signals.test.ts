// TRUST-04 — THE CLOSED TRUST-SIGNAL SET, AS A GATE. Twelve forbidden tokens, encoded in two pieces.
//
// 13-CONTEXT D-68 closes the booker-facing trust signal set at FOUR, and every one of them maps to a
// column that exists:
//
//   1. the platform guarantee  — the hold-until-session payout model, stated as a fact about where the
//      booker's money is (D-65). Not a host credential, and deliberately not read off
//      `host_payout.onboarding_complete`, which keeps its existing role as the bookability gate.
//   2. host tenure             — `user.createdAt`   (schema.ts:38)
//   3. listing published       — `listing.publishedAt` (schema.ts:223)
//   4. booking behaviour       — `listing.bookingMode` (schema.ts:199)
//
// ⚠ THERE IS NO RESPONSIVENESS COLUMN ANYWHERE IN `src/lib/db/schema.ts`. Checked against the schema
// when this file was written, and again in phase 18: it carries no rate, latency or SLA field about a
// host's replies. A fifth signal OF THAT SHAPE could therefore only be INVENTED — a sentence with no
// row behind it, on the one surface where a booker is deciding whether their money is safe. TRUST-04
// exists to prevent exactly that, and D-80 forbids the "add the column then" escape hatch.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE RULE THIS GATE ALWAYS STOOD FOR — RESTATED IN PHASE 18, WHEN IT WAS FINALLY TESTED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// This header used to close with "if a surface wants a fifth signal, the answer is no". That sentence
// became FALSE in phase 18 and has been REWRITTEN rather than amended around, because a rule everyone
// believes exists is one nobody goes looking for. The rule it was always standing for is narrower,
// and it is still absolute:
//
//     THE ANSWER IS NO TO A SIGNAL WITH NO COLUMN BEHIND IT.
//
// HVER-05 / D-237 adds a fifth signal that HAS one — two, in fact, and it requires both: the ops-check
// `status` column on the host's phase-18 ops row, joined with `listing.review_state`. (That table's
// name is not written in this file: it contains one of the twelve tokens in its ordinary technical
// sense, and this file may not spell any of them — see the encoding section below. `isFitoutChecked`
// in `src/lib/listing/fitout-check.ts` spells it out where it is safe to.) Both columns are written by
// a named, authenticated staff member (D-218), so the chip stands on a real row rather than on
// marketing — which is the entire distinction TRUST-04 has been enforcing all along.
//
// The fifth signal is exactly one file, `src/components/listing/fitout-check-badge.tsx`, holding both
// of its strings. It is added UNDER THE BAN, not beside it: `FIFTH_SIGNAL_FILES` below runs that file
// through the SAME `findForbidden` pass with the SAME twelve rows. `FORBIDDEN_SIGNALS` stays at
// twelve and `SCAN_ROOTS` stays at three, so this edit makes the gate STRICTLY STRONGER — one more
// file policed, nothing unbanned, no exclusion row anywhere.
//
// D-212 is what keeps that fifth signal honest, and it lives in the predicate rather than here: BOTH
// terms must be `approved`, as positive literals, so a grandfathered row — a row nobody ever checked,
// and the majority of the day-one catalogue — can never wear the chip. A negative spelling against
// the grandfathered value would let four other states through, which is why the predicate has a test
// of its own (`tests/listing/fitout-check-badge.test.tsx`) driving every pair of both enums.
//
// ⚠ DO NOT ADD THE LISTING TREE TO `SCAN_ROOTS` IN ORDER TO REACH THAT FILE. Measured, not assumed:
// `host-block.tsx`'s shipped `HOST_REQUEST_RULE` uses row 11's plural noun in its OTHER, legitimate
// sense (a host looking over a booking request), and row 11's own `why` already records that this copy
// is deliberately outside these roots. Widening the roots goes red against correct, shipped copy —
// which is precisely how a gate gets loosened by whoever has to make it green again. Naming the one
// new file is the narrower and more honest instrument.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE SCOPE DECISION, RECORDED RATHER THAN ASSUMED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The boundary is THE PHASE-13 FILE SET — three roots, declared in `SCAN_ROOTS` below:
//
//     src/app/(app)/bookings/**   ·   src/components/booking/**   ·   src/components/group/**
//
// Phase 12's shipped listing copy lives OUTSIDE it and is unchanged. That copy (in
// `src/components/listing/host-block.tsx`, via `HOST_REQUEST_RULE`) describes request-to-book with a
// verb this gate bans, and it shipped a phase ago against a spec that permitted it. Widening this scan
// to `src/**` would make a green run require editing a surface this phase does not own — which is how a
// gate gets loosened instead of obeyed. It is also WHY signal 4's own sentence in
// `src/components/booking/trust-block.tsx` says **approves**: the phase's copy is clean under the
// phase's own scan, with no exclusion row anywhere.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS SCANS AUTHORED COPY (STRING LITERALS + JSX TEXT) AND NOT RAW SOURCE — MEASURED, NOT ARGUED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// 13-UI-SPEC § The forbidden set says "scans string literals", and that word is load-bearing. Measured
// against the tree on the day this file was written, a RAW-TEXT scan of the three roots reports **ten**
// hits for one of the twelve tokens, and **all ten are comments** — `money-statement.tsx:43` and `:99`,
// `payment-reversed-state.tsx:19`, `:45`, `:157`, `:181`, `support-path.tsx:17`, `:44`,
// `bookings/[id]/page.tsx:575`, `bookings/[id]/cancel/page.tsx:413`. Every one of them is a file saying
// that a refund window, a webhook behaviour or a guard SHAPE was checked against its source. A gate with
// a 100% false-positive rate on a clean tree is a gate somebody deletes, and the honest documentation is
// not optional — `skeleton-measurements.test.ts:13-34` established that rule with the same measurement,
// and `price-surface.test.ts`'s assertion 3 is an AST walk for the same reason.
//
// THE HAZARD HERE IS ALSO GENUINELY DIFFERENT from the two grep tripwires in `price-surface.test.ts`.
// There the hazard was "the phrase EXISTS in the file at all", because the enforcement was a future
// grep that would match its own prohibition. Here the enforcement is THIS FILE, the encoding below
// keeps it disarm-proof by construction, and the thing TRUST-04 bans is a signal a BOOKER READS. A
// comment is not read by a booker.
//
// ⚠ THE ONE THING THAT WOULD MAKE A COMMENT DANGEROUS AGAIN is a `why` string in
// `src/lib/design/selector-contract.ts` — a `why` is a string LITERAL, not a comment, and 13-02 watched
// it turn a different gate red against that very file. That module is not in these three roots, so this
// scan cannot reach it either way; the finding is repeated here so the next author does not conclude
// from "comments are invisible" that all prose is.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE TWO-PIECE ENCODING, AND WHY THIS FILE NEVER SPELLS A BANNED PHRASE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `price-surface.test.ts:252-286`'s rule, applied whole: every phrase is stored in TWO PIECES split
// MID-WORD and joined at runtime, so no fragment reads as the phrase and a search of this file for any
// of the twelve finds nothing — including the searches in this plan's own acceptance criteria. Each row
// carries a mandatory `why` that travels into the failure message, and each `why` is itself written
// around the twelve phrases rather than through them.
//
// The fixtures below are BUILT FROM THE ENCODING (`row.pieces.join("")`) rather than typed out, which is
// what lets a positive control exist without reintroducing the string.
//
// ⚠ THE ENCODING IS ASSERTED, NOT TRUSTED — and it caught its own author on the first run. The header
// paragraph above about the missing responsiveness column originally opened with the past participle of
// row 4, in the ordinary English sense of "checked against the source". The last assertion in group (0)
// re-reads this file and went red naming the row. That is the ninth time in Phase 13 that a criterion
// has collided with the prose explaining it (`booking-row.tsx:112` is the precedent), and it is the
// reason the assertion exists rather than a comment saying "remember not to". The sentence is now
// written with a different verb and every word of the reasoning survived.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TWO PASSES, BECAUSE A FORMATTER WRAPS JSX PROSE MID-SENTENCE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Pass 1 reads each copy unit line by line and reports `file:line`. Pass 2 reads a WHITESPACE-COLLAPSED
// copy and reports the file. The second is not decoration: a JSX sentence is one text node containing
// the newlines the formatter inserted, so the RENDERED text is contiguous while the source is not, and a
// line-wise scan alone would miss a phrase broken at a wrap point. The collapsed pass cannot report a
// line, so it reports the file — the honest thing to say about a match found in a normalised copy.
//
// The collapsed pass runs over the file's copy units CONCATENATED, mirroring `findPhrases`'s whole-file
// second pass, which also means a phrase split across an interpolation boundary is caught. The residual
// is the mirror image: two unrelated adjacent literals could in principle join into a phantom phrase.
// That failure is LOUD and one edit away from correct, which is the direction a ban should fail in.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SCANNED TREE
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The Phase-13 file set, exactly as 13-UI-SPEC § The forbidden set declares it.
 *
 * ⚠ THREE, AND IT STAYED THREE IN PHASE 18. The fifth signal lives in the listing tree, and the
 * listing tree is NOT added here — see the header: `host-block.tsx`'s shipped request-mode sentence
 * uses row 11's plural noun in its other legitimate sense, so widening this list would go red against
 * correct copy this phase does not own. The new file is named explicitly instead.
 */
const SCAN_ROOTS = [
  "src/app/(app)/bookings",
  "src/components/booking",
  "src/components/group",
] as const;

type ScanRoot = (typeof SCAN_ROOTS)[number];

/**
 * THE FIFTH SIGNAL, SCANNED UNDER THE SAME BAN — HVER-05 / D-237.
 *
 * Exactly one file, and that is a property of the design rather than of today's tree: both of the
 * chip's strings (`FITOUT_CHECK_LABEL` and `FITOUT_CHECK_EXPLAINER`) are exported constants living
 * together, precisely so the whole of the new signal's copy is one scannable file. If a surface ever
 * retypes either string instead of importing it, the copy leaves this scan's reach — which is the
 * failure this arrangement is built to make unattractive.
 *
 * These files go through the SAME `findForbidden` pass with the SAME twelve rows as the three roots
 * above. Adding a permitted signal did not buy it an exemption: the gate now polices one more file
 * than it did, and unbanned nothing.
 */
const FIFTH_SIGNAL_FILES = ["src/components/listing/fitout-check-badge.tsx"] as const;

/**
 * WINDOWS PATH NORMALISATION — `focus-recipe.test.ts:89`'s idiom, load-bearing rather than cosmetic.
 * `path.relative` emits backslashes on this box while every path written in this file is
 * forward-slash; without this the reported labels stop matching the declared roots and the per-root
 * assertions below fail for a reason that has nothing to do with the tree.
 */
function posix(abs: string): string {
  return relative(process.cwd(), abs).split("\\").join("/");
}

/**
 * Every `.ts`/`.tsx` file under a directory, recursively — returning what it has when the directory is
 * unreadable rather than raising.
 *
 * `collectSourceFilesSafe`'s shape from `status-vocab.test.ts:1112`, and for its reason: throwing on a
 * missing root turns a renamed directory into a stack trace that buries WHICH gate went quiet, instead
 * of into the empty-root assertion below naming it.
 */
function collectSourceFilesSafe(dir: string, out: string[] = []): string[] {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) collectSourceFilesSafe(full, out);
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
  } catch {
    return out;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE FORBIDDEN PHRASES, EACH IN TWO PIECES AND EACH WITH THE REASON IT IS FORBIDDEN
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type Forbidden = {
  /** The phrase, split mid-word so neither fragment reads as it. Joined at runtime, never written. */
  readonly pieces: readonly [string, string];
  /** WHY it is banned. Travels into the failure message — a row without a reason is not a row. */
  readonly why: string;
};

/**
 * TRUST-04 / D-68 — THE TWELVE TOKENS, in the order 13-UI-SPEC lists them.
 *
 * Four families, and each family is banned for its own reason rather than for a shared vibe:
 *
 *   (a) rows 1-3   — tier chrome. FitOut runs no host tier programme of any kind. A tier badge is a
 *                    claim about a scheme that does not exist, on a money surface.
 *   (b) rows 4-5   — an assurance claim. Nothing in this product checks a host's identity, insurance,
 *                    premises or credentials, and no column records such a check.
 *   (c) rows 6-8   — responsiveness. THE SCHEMA HAS NO SUCH COLUMN (see the header) — the number could
 *                    only be invented, and D-80 forbids adding one this phase.
 *   (d) rows 9-12  — a score or its count. FitOut stores no booker feedback at all in v1.
 */
const FORBIDDEN_SIGNALS: readonly Forbidden[] = [
  {
    pieces: ["superh", "ost"],
    why:
      "tier chrome — the closed-up spelling. FitOut operates no host tier programme, so the badge " +
      "would stand for nothing at all. D-68 closed the set at four signals and phase 18 made it " +
      "five; every one of them names a column, and this one names none.",
  },
  {
    pieces: ["super ho", "st"],
    why:
      "the spaced spelling of the same tier chrome. Banned beside the closed-up one because a copy " +
      "pass that adds a space is exactly how a removed claim comes back.",
  },
  {
    pieces: ["top ho", "st"],
    why:
      "the other tier spelling. It implies a ranking FitOut neither computes nor stores, and on a " +
      "booking-detail page it reads as an assurance about the money rather than as marketing.",
  },
  {
    pieces: ["verif", "ied"],
    why:
      "an assurance claim: it tells a booker somebody at FitOut checked this host. Nothing in the " +
      "product does, and no column records such a check. On a payment surface this is the single " +
      "most damaging invented signal, because it is the one a booker would rely on.",
  },
  {
    pieces: ["verific", "ation"],
    why:
      "the noun form of the same claim. Banned separately because the adjective ban alone leaves " +
      "'pending …' and 'host … badge' phrasings wide open.",
  },
  {
    pieces: ["responds wi", "thin"],
    why:
      "a promise about reply speed. THERE IS NO SUCH COLUMN in src/lib/db/schema.ts — the figure " +
      "could only be invented, and D-80 forbids adding a column for it. D-68 records this finding " +
      "as the reason the set is closed at four rather than five.",
  },
  {
    pieces: ["response ra", "te"],
    why:
      "the same missing measurement expressed as a proportion. Nothing counts a host's replies, so " +
      "there is no denominator to divide by.",
  },
  {
    pieces: ["response ti", "me"],
    why:
      "the same missing measurement expressed as a duration. Nothing timestamps a host's replies " +
      "either, so this cannot be derived from what is stored.",
  },
  {
    pieces: ["star rat", "ing"],
    why:
      "a score. FitOut collects no booker feedback in v1, so a score would be fabricated — and a " +
      "fabricated score on the surface where a booking is confirmed is worse than an empty one.",
  },
  {
    pieces: ["out o", "f 5"],
    why:
      "a score stated against a five-point scale. Same absence as the row above, spelled as a " +
      "denominator instead of as a noun.",
  },
  {
    pieces: ["revie", "ws"],
    why:
      "a feedback count. No such record exists, and the count is the signal a marketplace booker " +
      "reads most literally. Phase 12's shipped listing copy uses this word for a DIFFERENT sense " +
      "(the host looking over a request) and is deliberately outside this scan's roots — which is " +
      "why signal 4's sentence in this phase says the host approves each request instead.",
  },
  {
    // A single glyph has no interior to split, so the disarm-proofing is a CODE-POINT ESCAPE instead:
    // the source text of this file contains `\u2605`, never the character, so a search of this file
    // for the glyph finds nothing — the same property the two-piece rows have, by another mechanism.
    pieces: ["\u2605", ""],
    why:
      "the glyph a score is drawn with. Banned as the character because a surface can render the " +
      "score without ever spelling the word — and a ban on the words alone would read as green " +
      "while the signal shipped.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SCANNER
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** One piece of AUTHORED COPY — a string literal, a template chunk, or JSX text — and where it is. */
type CopyUnit = {
  readonly file: string;
  readonly line: number;
  readonly text: string;
};

type Scan = {
  /** Every `.ts`/`.tsx` file visited, normalised, across all roots. */
  readonly files: string[];
  /** The same, partitioned by declared root, so a root that reached nothing is loud. */
  readonly filesByRoot: Readonly<Record<string, string[]>>;
  /** `.tsx` files only, by root — the positive control the plan requires is stated over these. */
  readonly tsxByRoot: Readonly<Record<string, string[]>>;
  /** Every authored copy unit found, in source order. */
  readonly copy: CopyUnit[];
};

/**
 * Every string literal / template chunk / JSX text node in one file, with its line.
 *
 * The collector is deliberately BROAD — it takes import specifiers and class strings too, not only
 * prose. A ban should over-reach rather than under-reach: a forbidden token inside a path or a utility
 * class is a loud, one-edit failure, whereas a narrowed collector that skipped the one node shape a
 * surface actually used would be a silent green. `status-vocab.test.ts:1175-1188` takes the same
 * position for the same reason, and adds `JsxText` explicitly because JSX prose is not a StringLiteral
 * at all — which is the node shape ALL of this phase's rendered copy lives in.
 */
function readCopy(file: string, source: string): CopyUnit[] {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const units: CopyUnit[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      units.push({
        file,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        text: node.text,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return units;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scan(roots: readonly string[]): Scan {
  const filesByRoot: Record<string, string[]> = {};
  const tsxByRoot: Record<string, string[]> = {};
  const files: string[] = [];
  const copy: CopyUnit[] = [];

  for (const root of roots) {
    const found = collectSourceFilesSafe(resolve(process.cwd(), root)).map(posix);
    filesByRoot[root] = found;
    tsxByRoot[root] = found.filter((f) => f.endsWith(".tsx"));
    for (const name of found) {
      files.push(name);
      copy.push(...readCopy(name, readFileSync(resolve(process.cwd(), name), "utf8")));
    }
  }

  return { files, filesByRoot, tsxByRoot, copy };
}

/**
 * The SAME collector over an EXPLICIT file list rather than a tree walk — `FIFTH_SIGNAL_FILES`'s pass.
 *
 * It returns the files it actually READ, not the files it was asked for, so a renamed or deleted entry
 * shows up as a missing member in the guard-the-guard clause below instead of as a silently empty
 * haystack. `collectSourceFilesSafe` swallows a missing directory for the same reason and reports it
 * the same way: a scan that reached nothing satisfies `toEqual([])` perfectly.
 */
function scanFiles(files: readonly string[]): { files: string[]; copy: CopyUnit[] } {
  const read: string[] = [];
  const copy: CopyUnit[] = [];

  for (const name of files) {
    let source: string;
    try {
      source = readFileSync(resolve(process.cwd(), name), "utf8");
    } catch {
      continue;
    }
    read.push(name);
    copy.push(...readCopy(name, source));
  }

  return { files: read, copy };
}

/**
 * Every forbidden phrase riding authored copy, as `file:line — why`.
 *
 * TWO PASSES — see the header. Pass 1 is line-wise over each copy unit and can name a line. Pass 2 is
 * over the file's copy units concatenated and whitespace-collapsed, and can only name the file.
 *
 * Case-insensitive: TRUST-04 bans the signal, not one capitalisation of it.
 */
function findForbidden(units: readonly CopyUnit[], phrases: readonly Forbidden[]): string[] {
  const hits: string[] = [];

  // Group by file so the collapsed pass has a per-file haystack to build.
  const byFile = new Map<string, CopyUnit[]>();
  for (const unit of units) {
    const bucket = byFile.get(unit.file);
    if (bucket === undefined) byFile.set(unit.file, [unit]);
    else bucket.push(unit);
  }

  for (const [file, fileUnits] of byFile) {
    const collapsed = fileUnits
      .map((u) => u.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .toLowerCase();

    for (const phrase of phrases) {
      const needle = phrase.pieces.join("").toLowerCase();

      let foundOnALine = false;
      for (const unit of fileUnits) {
        // A JsxText node spans the lines the formatter wrapped it onto, so the unit's own text is
        // split back apart here to report the line the phrase actually sits on rather than the line
        // the node opened on.
        unit.text.split("\n").forEach((line, offset) => {
          if (line.toLowerCase().includes(needle)) {
            foundOnALine = true;
            hits.push(`${file}:${unit.line + offset} — ${phrase.why}`);
          }
        });
      }

      if (!foundOnALine && collapsed.includes(needle)) {
        hits.push(`${file} (wrapped across lines) — ${phrase.why}`);
      }
    }
  }

  return hits;
}

const scanned = scan(SCAN_ROOTS);
const fifthSignal = scanFiles(FIFTH_SIGNAL_FILES);

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (0) GUARD THE GUARD — a scan that reached nothing is green and means nothing
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("TRUST-04 — the scan reaches what it claims to police", () => {
  it("walked every declared root, and none of them came back empty", () => {
    // ASSERTED FIRST, because the real assertion below is `toEqual([])` and a scan over nothing
    // satisfies it perfectly. `(app)` is exactly the kind of path a route-group restructure moves,
    // and `collectSourceFilesSafe` deliberately does not raise on a missing directory.
    const barren = SCAN_ROOTS.filter((root) => scanned.filesByRoot[root].length === 0);
    expect(
      barren,
      "a declared root contributed no source files at all. Either the directory moved (move this " +
        "declaration in the same commit) or the walk is broken — and both look identical to a " +
        "passing ban.",
    ).toEqual([]);
  });

  it("visited a NON-ZERO number of .tsx files in each of the three roots", () => {
    // THE POSITIVE CONTROL THE PLAN REQUIRES, stated per root rather than in total: a walk that
    // quietly covered two of the three would still report a healthy total, and the trust block is
    // going to live in exactly one of them. `.tsx` specifically, because rendered copy is JSX.
    const counts = Object.fromEntries(
      SCAN_ROOTS.map((root) => [root, scanned.tsxByRoot[root].length]),
    ) as Record<ScanRoot, number>;

    for (const root of SCAN_ROOTS) {
      expect(
        counts[root],
        `${root} contributed zero .tsx files. Every ban below would be vacuously green for that ` +
          `root: ${JSON.stringify(counts)}`,
      ).toBeGreaterThan(0);
    }
  });

  it("extracted a non-zero amount of authored copy — files present is not copy reachable", () => {
    // A collector that stopped matching node shapes would leave the file list healthy and the
    // haystack empty. That is the vacuity this repository has now recorded nine times.
    expect(
      scanned.copy.length,
      "the collector found no string literal, template chunk or JSX text anywhere in the three " +
        "roots. The tree ships thousands, so this means the node matcher stopped matching — a " +
        "vacuous green, not a clean one.",
    ).toBeGreaterThan(100);

    // …and it reached JSX text specifically, which is the node shape every rendered sentence in this
    // phase is. A collector that only saw StringLiterals would be blind to all of it.
    expect(
      scanned.copy.some((u) => u.file.endsWith(".tsx") && /\S/.test(u.text) && u.text.includes(" ")),
      "no multi-word copy unit was found in any .tsx file — the JSX text pass is not working.",
    ).toBe(true);
  });

  it("reached the fifth signal's file too — it is named, it exists, and it yielded copy", () => {
    // THE SAME VACUITY, ONE LEVEL DOWN. `scanFiles` deliberately skips a file it cannot read, so a
    // rename would leave the ban below green over an empty haystack — a badge free to say anything.
    // Three separate claims, because each one fails for a different reason and the message should say
    // which: the set is declared, every declared file was actually read, and copy came out of it.
    expect(FIFTH_SIGNAL_FILES).toHaveLength(1);

    expect(
      fifthSignal.files,
      "a file named in FIFTH_SIGNAL_FILES could not be read. It moved or was renamed — move this " +
        "declaration in the same commit, because a skipped file makes the ban below vacuously green.",
    ).toEqual([...FIFTH_SIGNAL_FILES]);

    expect(
      fifthSignal.copy.length,
      "no string literal, template chunk or JSX text was extracted from the fifth signal's file. It " +
        "ships two exported copy constants, so zero means the node matcher stopped matching — a " +
        "vacuous green, not a clean one.",
    ).toBeGreaterThan(0);

    // …and it reached real PROSE, not just an import specifier or a utility class. Both shipped
    // constants are multi-word sentences; a haystack of single tokens would mean the copy is gone.
    expect(
      fifthSignal.copy.some((u) => u.text.trim().split(/\s+/).length > 3),
      "the fifth signal's file yielded no multi-word copy — its two exported sentences are not being " +
        "collected, so the ban over them proves nothing.",
    ).toBe(true);
  });

  it("FINDS a forbidden phrase when there is one — in both passes, and in every row", () => {
    // BOTH DIRECTIONS, through the same code path the real assertion uses. Without this, "found
    // nothing" below is equally consistent with a scanner that can never find anything.
    // Every fixture is BUILT from the encoding, so this file still never spells a phrase.
    for (const row of FORBIDDEN_SIGNALS) {
      const needle = row.pieces.join("");
      const inline: CopyUnit[] = [
        { file: "fixture-inline.tsx", line: 7, text: `This host is ${needle} by us.` },
      ];
      const inlineHits = findForbidden(inline, FORBIDDEN_SIGNALS);
      expect(inlineHits.length, `no row matched the decoy built from ${JSON.stringify(row.pieces)}`)
        .toBeGreaterThan(0);
      expect(inlineHits[0]).toContain("fixture-inline.tsx:7");
    }

    // The WRAPPED case — contiguous once rendered, not contiguous in the source a formatter emitted.
    // Row 6 is a two-word phrase, so it is the one that can actually be broken at a wrap point.
    const wrappedRow = FORBIDDEN_SIGNALS[5];
    const [wordA, wordB] = wrappedRow.pieces.join("").split(" ");
    const wrapped: CopyUnit[] = [
      { file: "fixture-wrapped.tsx", line: 1, text: `The host\n  ${wordA}` },
      { file: "fixture-wrapped.tsx", line: 3, text: `${wordB} an hour.` },
    ];
    const wrappedHits = findForbidden(wrapped, FORBIDDEN_SIGNALS);
    expect(wrappedHits).toHaveLength(1);
    expect(wrappedHits[0]).toContain("wrapped across lines");
    expect(wrappedHits[0]).toContain(wrappedRow.why);

    // …and a clean fixture is clean, so the scanner is not simply always positive.
    expect(
      findForbidden(
        [
          {
            file: "fixture-clean.tsx",
            line: 1,
            text: "FitOut holds your payment until after your session.",
          },
          { file: "fixture-clean.tsx", line: 2, text: "Host since June 2026" },
          {
            file: "fixture-clean.tsx",
            line: 3,
            text: "This host approves each request before it's confirmed.",
          },
          // The FIFTH signal's two sentences (HVER-05 / D-237), stated here as the permitted-copy
          // control. The shipped file is scanned for real below; this fixture is what proves the
          // twelve rows have no quarrel with the words the chip actually uses — the near miss being
          // row 11's plural noun, which is why this surface says "checked" instead.
          { file: "fixture-clean.tsx", line: 4, text: "Checked by FitOut" },
          {
            file: "fixture-clean.tsx",
            line: 5,
            text:
              "Someone at FitOut checked this host's account and this listing before it could take " +
              "bookings. We haven't visited the space.",
          },
        ],
        FORBIDDEN_SIGNALS,
      ),
      "the five permitted signals must be clean under this scan — if they are not, the copy is " +
        "wrong or a row is over-broad, and both are worth failing on.",
    ).toEqual([]);
  });

  it("declares twelve rows, each with a reason, and never spells one of them", () => {
    // The count is the record of a decision (13-UI-SPEC § The forbidden set names twelve tokens); a
    // thirteenth is a real change and should have to move this number.
    expect(FORBIDDEN_SIGNALS).toHaveLength(12);

    const source = readFileSync(resolve(process.cwd(), "tests/design/trust-signals.test.ts"), "utf8");
    for (const row of FORBIDDEN_SIGNALS) {
      expect(row.why.length, `a row has no reason: ${JSON.stringify(row.pieces)}`).toBeGreaterThan(40);
      // THE ENCODING, ASSERTED RATHER THAN TRUSTED. This file must not contain any of the twelve
      // contiguously — not in a `pieces` tuple, not in a `why`, not in a fixture, not in the header.
      // The moment it does, every search for that token matches its own prohibition, which is how a
      // guard dies quietly. Case-insensitive, because a search for the signal is.
      expect(
        source.toLowerCase().includes(row.pieces.join("").toLowerCase()),
        `this test file spells ${JSON.stringify(row.pieces)} contiguously somewhere. Encode it in ` +
          `two pieces (or, for a single glyph, as a code-point escape) — see the header.`,
      ).toBe(false);
      // …and neither fragment may read as the whole phrase on its own.
      //
      // EXCEPT for a single-code-point row, which cannot be split at all: there is no mid-word to
      // split at. Its disarm-proofing is the code-point ESCAPE instead, and that is not taken on
      // trust — the assertion immediately above re-read this file and confirmed the glyph itself does
      // not appear in the source. The exemption is therefore about the MECHANISM, not about the
      // guarantee, which both rows still carry.
      const whole = row.pieces.join("");
      if (whole.length === 1) continue;
      for (const piece of row.pieces) {
        if (piece === "") continue;
        expect(
          piece.toLowerCase() === whole.toLowerCase(),
          `a piece of ${JSON.stringify(row.pieces)} is the whole phrase — split it mid-word.`,
        ).toBe(false);
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (1) THE BAN ITSELF — no invented trust signal ships on any Phase-13 booker surface
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("TRUST-04 / D-68 — every booker-facing signal names a column, and nothing invents one", () => {
  /**
   * The permitted set, enumerated ONCE and shared by both failure messages below — five now, and each
   * one named beside the column it stands on, because "you may not add a signal" is only actionable
   * next to "here is what the permitted ones are made of".
   */
  const PERMITTED_SIGNALS =
    `the platform guarantee (the hold-until-session payout model, D-65), user.createdAt, ` +
    `listing.publishedAt, listing.bookingMode, and — added by HVER-05/D-237 in phase 18 — the ` +
    `ops-check status on the host's phase-18 ops row joined with listing.review_state, reduced by ` +
    `isFitoutChecked (both terms 'approved', never grandfathered — D-212)`;

  it("renders none of the twelve forbidden signals anywhere in the Phase-13 file set", () => {
    const hits = findForbidden(scanned.copy, FORBIDDEN_SIGNALS);
    expect(
      hits,
      `an invented trust signal reached a booker surface: ${JSON.stringify(hits, null, 2)}\n\n` +
        `The booker-facing signal set is closed at FIVE, and every one of the five maps to a real ` +
        `column: ${PERMITTED_SIGNALS}. There is NO responsiveness, tier or score column in ` +
        `src/lib/db/schema.ts, so a SIXTH signal of those shapes can only be INVENTED — and D-80 ` +
        `forbids adding a column for it. The answer to "this surface wants one more signal" is no ` +
        `whenever there is no column behind it. Encode the phrase in two pieces if you must refer ` +
        `to it.`,
    ).toEqual([]);
  });

  it("renders none of the twelve in the FIFTH signal's own file either — it is subject to the ban", () => {
    // THE POINT OF THIS CASE. Phase 18 permitted a fifth signal, so the tempting shape was an
    // exclusion row. Instead the new file is run through the SAME `findForbidden` with the SAME twelve
    // rows: the chip may state what a person at FitOut checked, and it still may not borrow a tier
    // word, an assurance-verb form, a responsiveness measure, a score or a score glyph to say it.
    //
    // The live hazard is row 11's plural noun. The fact being stated is a person looking over an
    // account and a listing, so the nearest word to reach for is exactly the one the ban targets in
    // its feedback-count sense — copy on this surface says "checked", and a later edit that reaches
    // for the other word fails HERE rather than shipping.
    const hits = findForbidden(fifthSignal.copy, FORBIDDEN_SIGNALS);
    expect(
      hits,
      `the fifth signal's own copy tripped the ban: ${JSON.stringify(hits, null, 2)}\n\n` +
        `HVER-05 permits this chip because it names real columns — ${PERMITTED_SIGNALS}. It does NOT ` +
        `exempt the chip from the twelve. Say what was checked, in words the gate has no quarrel ` +
        `with, and keep both strings in ${FIFTH_SIGNAL_FILES[0]} so this scan can still see them.`,
    ).toEqual([]);
  });
});
