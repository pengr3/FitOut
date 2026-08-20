// D-69 / D-82 / D-83 — THE REVERSED STATE'S TWO GREP TRIPWIRES, AS A TEST.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE GUARDS, AND WHY IT IS TWO BANS AND NOT ONE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/components/booking/payment-reversed-state.tsx` is the surface a booker lands on when FitOut
// took their money and then could not deliver the slot. 13-RESEARCH called it the phase's sharpest
// file, for a reason that is measurable rather than rhetorical: its shipped copy was wrong in TWO
// OPPOSITE DIRECTIONS at once, and no gate in the repository could see either.
//
//   BAN 1 — THE NOT-COMPLETED SENTENCE. The file shipped the sentence STATE-05 assigns to the
//   *not-completed* state: the one that tells a booker no money left their account. On a reversal
//   money DID leave their account, and on the manual rails it has not come back yet, so the sentence
//   is the exact inverse of the truth in two directions at once — and the booker's own bank app is
//   the thing they will check it against. 13-CONTEXT § Specific Ideas states the tie-break: if our
//   screen and their statement disagree, our screen is wrong. The sentence must not appear in this
//   file AT ALL, comments included (see the tripwire rule below).
//
//   BAN 2 — THE MANUAL-RETURN BRANCH'S VOCABULARY. D-83 splits the copy across two money truths. On
//   the automatic branch an API call really did send the money back, and the copy may say so. On the
//   MANUAL branch nothing has been sent back: a human has to move it off the FitOut platform wallet
//   by hand. Two words are therefore banned inside that branch's strings:
//     (a) the r-word D-83 forbids there — claiming a return that has not happened is the same class
//         of false money statement as ban 1, pointing the other way;
//     (b) the phrase pairing *cannot* with *be reversed* — D-82 is explicit that the money is NOT
//         stuck. It sits on the platform wallet and a person can move it. The accurate phrasing is
//         *"not reversed automatically"*, and an impossibility claim we cannot stand behind is worse
//         than a longer sentence.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE TRIPWIRE'S OWN RULE APPLIES TO THE TEST THAT ENFORCES IT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `price-surface.test.ts` is the model and its rule is inherited verbatim: a grep is only a real
// guard if it cannot be tripped by the very text forbidding the string. So every banned phrase below
// is stored in TWO PIECES and joined at runtime, split MID-WORD so no fragment reads as the phrase in
// a search of this file either — and the guard-the-guard fixtures are BUILT from that same encoding
// rather than written out. This file's own acceptance criterion is a raw
// `grep -ci` for ban 1 over this file returning ZERO.
//
// COMMENTS ARE NOT STRIPPED, and that is the whole point of a tripwire rather than a render check.
// The hazard is not "the sentence renders"; it is "the sentence EXISTS in the file", because from
// that moment every future grep for it matches its own prohibition and the guard is dead for good.
// A comment is exactly where that arrives — "just in a comment, to explain what we must not say".
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE APOSTROPHE PASS — WITHOUT IT THIS GATE WOULD HAVE BEEN GREEN AGAINST THE LIVE DEFECT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// MEASURED, not anticipated. The shipped sentence is written in JSX prose, and `react/no-unescaped-
// entities` is why every apostrophe on that surface is an HTML ENTITY in source: what is actually in
// the file is `&apos;`, not `'`. A contiguity scan for the plain-apostrophe spelling therefore
// matches nothing, reports a clean file, and the one sentence this gate exists to catch sails
// through. So the scanner normalises `&apos;`, `&#39;`, `&#x27;`, `&rsquo;` and the curly `’` to a
// plain `'` BEFORE it looks for anything, on both passes, and the fixture set below includes the
// entity spelling so the normalisation itself cannot rot.
//
// TWO PASSES, and the second is not decoration either. The raw-line pass catches the phrase written
// normally and can report a LINE NUMBER. A whitespace-collapsed copy catches it split across a line
// break — routine in JSX prose, where the formatter wraps a sentence wherever the column limit falls
// and the RENDERED text is contiguous even though the source is not. The collapsed pass cannot report
// a line, so it reports the file; that is the honest thing to say about a match in a normalised copy.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE POSITIVE HALF, AND WHY THE BANS ALONE ARE NOT THE REQUIREMENT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `sheet-absent.test.ts`'s both-sides rule, and `price-surface.test.ts` restates it: a file with no
// money copy at all satisfies every ban above perfectly. Deleting the sentence is not a way to state
// the money truth. So the same file is asserted to STILL carry a money statement, STILL carry the
// booking reference (TRUST-02 — every status), and STILL receive the amount as a finished string.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//   • CONTIGUITY, over source text. Copy assembled at runtime from fragments — a template with a
//     substitution, a word pulled from a map keyed by a prop — is invisible to it. That is the safe
//     direction for a ban (it can miss a violation, never invent one) and it is the same hole
//     `price-surface.test.ts` records for its own phrase scan.
//   • BAN 2'S SCOPE IS A MARKED REGION, not the whole file, because the automatic branch is REQUIRED
//     to use the word the manual branch may not. The region is delimited by two sentinel comments in
//     the component. If either sentinel goes missing the scan would silently have nothing to read, so
//     its presence and a minimum length are asserted FIRST — an unmarked region is a dead gate, not a
//     clean one.
//   • ONE FILE. This gate says nothing about the page that composes it, the cancel review, or the
//     email shell. The window module's own suite under `tests/booking/` owns the three permitted
//     numbers; the page's unsourced window is removed by the same plan and pinned by its own grep.
//
//   ⚠ AND THIS FILE DELIBERATELY NEVER SPELLS BAN 2'S TOKEN CONTIGUOUSLY EITHER — not in the rows,
//     not in the fixtures, and not in this header, which is why the window module above is named by
//     its directory rather than by its filename. That is the tripwire discipline (13-PATTERNS § H)
//     applied one level out: ban 2's scope is a marked region inside ONE component today, and the
//     day somebody widens it to the whole file, a test that had spelled the token would be the first
//     violation of its own rule. Do not "helpfully" name the module here.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";

/** The tree root every path below is resolved against — parameterised for the vacuity probe. */
const ROOT = process.cwd();

/** The one file both bans are about. */
const REVERSED_STATE = "src/components/booking/payment-reversed-state.tsx";

/**
 * A file shorter than this was not really read. `price-surface.test.ts`'s `MIN_FILE_BYTES`, for the
 * same reason: this gate opens a DECLARED path rather than walking a tree, so the failure it has to
 * notice is "the file moved and `existsSync` said no", not "the glob narrowed".
 */
const MIN_FILE_BYTES = 1000;

/**
 * The two sentinels delimiting the manual-return branch's strings inside the component.
 *
 * A marked region rather than an AST walk, deliberately: the thing being scoped is a set of SENTENCES
 * that happen to be adjacent, and every AST shape that could hold them (a const, a ternary arm, a JSX
 * fragment) is one refactor away from a different shape. A sentinel comment survives all of them, and
 * a missing sentinel is loud (see the guard below) rather than quiet.
 */
const MANUAL_BEGIN = "MANUAL-RETURN-COPY:BEGIN";
const MANUAL_END = "MANUAL-RETURN-COPY:END";

/** A region shorter than this is not the branch's copy; it is an emptied region satisfying the ban. */
const MIN_MANUAL_REGION_CHARS = 120;

/**
 * WINDOWS PATH NORMALISATION — `focus-recipe.test.ts:89`'s idiom, load-bearing rather than cosmetic:
 * `path.relative` emits backslashes on this box while every path written here is forward-slash.
 */
function posix(abs: string): string {
  return relative(ROOT, abs).split("\\").join("/");
}

type Opened = {
  /** The declared, forward-slash relative path. */
  readonly rel: string;
  /** Raw source, comments INCLUDED — both bans need them. See the header. */
  readonly raw: string;
};

/**
 * Open one declared file, or `null` when it is not there. Never raises: a broken scan must surface as
 * ONE named guard-the-guard failure, not as a stack trace that buries which gate went quiet.
 */
function openFile(rel: string): Opened | null {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return null;
  return { rel: posix(abs), raw: readFileSync(abs, "utf8") };
}

/**
 * Fold every spelling of an apostrophe onto one, and lower-case. See the header: without this the
 * gate is green against the live defect, because JSX prose stores apostrophes as `&apos;`.
 */
function normalise(text: string): string {
  return text
    .replace(/&apos;|&#0*39;|&#x0*27;|&rsquo;|[\u2018\u2019\u02BC]/gi, "'")
    .toLowerCase();
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
 * BAN 1 — scoped to the WHOLE file, comments included.
 */
const NOT_COMPLETED_LANGUAGE: readonly Forbidden[] = [
  {
    pieces: ["haven't b", "een charged"],
    why:
      "is STATE-05's sentence for the NOT-COMPLETED state, and 13-UI-SPEC assigns it to " +
      "`payment-incomplete-state.tsx` and to nowhere else. On a reversal money DID leave the " +
      "booker's account — the charge can sit visible on their statement for days, and on the manual " +
      "rails it has not come back at all — so this sentence contradicts the one document the booker " +
      "will check it against. D-69 replaces it with the amount, which of the two money truths " +
      "applies, and the verified window.",
  },
];

/**
 * BAN 2 — scoped to the marked manual-return region ONLY.
 *
 * The first row's pieces are split so that neither half is the token: the automatic branch is
 * REQUIRED to use it, and the module that owns the window sentences is named after it, so a
 * whole-file ban would be a ban on the correct copy.
 */
const MANUAL_BRANCH_BANS: readonly Forbidden[] = [
  {
    pieces: ["ref", "und"],
    why:
      "claims money was sent back on the branch where nothing has been sent back. D-83 bans the " +
      "token outright here: the API refused this rail (or the call failed), the amount sits on the " +
      "FitOut platform wallet, and a person has to move it. The copy says the booking is cancelled " +
      "and the amount is flagged for return by hand — never that it has already gone.",
  },
  {
    pieces: ["cannot be ", "reversed"],
    why:
      "states an impossibility that is FALSE. D-82 is explicit: the money is not stuck, it is on the " +
      "platform wallet and a human can transfer it. The accurate phrasing everywhere is `not " +
      "reversed automatically`, and a booker told their money cannot come back has been told the " +
      "one thing about this state that is not true.",
  },
  {
    pieces: ["can't be ", "reversed"],
    why:
      "the contracted spelling of the same false impossibility. Banned beside the other one because " +
      "a copy pass that shortens a sentence is exactly how a superseded claim comes back.",
  },
];

/**
 * Find every occurrence of a forbidden phrase in a body of text, as `label:line — why`.
 *
 * Both passes run over NORMALISED text (see `normalise`). `lineOffset` exists so the manual-region
 * scan can report line numbers in the FILE's coordinates rather than in the slice's.
 */
function findPhrases(
  label: string,
  text: string,
  phrases: readonly Forbidden[],
  lineOffset = 0,
): string[] {
  const hits: string[] = [];
  const lines = text.split("\n");
  const collapsed = normalise(text).replace(/\s+/g, " ");

  for (const phrase of phrases) {
    const needle = normalise(phrase.pieces.join(""));

    let foundOnALine = false;
    lines.forEach((line, index) => {
      if (normalise(line).includes(needle)) {
        foundOnALine = true;
        hits.push(`${label}:${index + 1 + lineOffset} — ${phrase.why}`);
      }
    });

    if (!foundOnALine && collapsed.includes(needle)) {
      hits.push(`${label} (wrapped across lines) — ${phrase.why}`);
    }
  }

  return hits;
}

/** Scan a whole opened file. */
function findInFile(file: Opened, phrases: readonly Forbidden[]): string[] {
  return findPhrases(file.rel, file.raw, phrases);
}

/**
 * The slice of the component between the two sentinels, with the line number it starts on — or
 * `null` when either sentinel is missing, which is a dead gate and is asserted as one.
 */
function manualRegion(file: Opened): { text: string; startLine: number } | null {
  const start = file.raw.indexOf(MANUAL_BEGIN);
  const end = file.raw.indexOf(MANUAL_END);
  if (start === -1 || end === -1 || end <= start) return null;
  const from = start + MANUAL_BEGIN.length;
  return {
    text: file.raw.slice(from, end),
    startLine: file.raw.slice(0, from).split("\n").length - 1,
  };
}

/** Opened ONCE at module level; the `it()` blocks below only assert against this. */
const reversed = openFile(REVERSED_STATE);

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (0) GUARD THE GUARD — asserted FIRST, because every real assertion below is "a list was empty"
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("(0) the scanner can find what it bans, and it really opened the file", () => {
  it("opened the component, and it is a file somebody actually wrote", () => {
    expect(
      reversed,
      `${REVERSED_STATE} was not found. Every ban in this file is \`toEqual([])\`, which a scan over ` +
        `nothing satisfies perfectly. If the component moved, move this declaration in the same commit.`,
    ).not.toBeNull();
    expect(
      reversed!.raw.length,
      `${REVERSED_STATE} is ${reversed!.raw.length} bytes. That is not a component, it is a stub — ` +
        `and a stub passes every ban here.`,
    ).toBeGreaterThanOrEqual(MIN_FILE_BYTES);
  });

  it("pointed at a path that does not exist, opens nothing — which is why the floor above exists", () => {
    // The vacuity probe as a permanent assertion rather than a one-off. `openFile` returns null for a
    // missing path instead of raising, deliberately: the realistic version of this failure is a moved
    // file or a narrowed root, and neither raises.
    expect(openFile("src/components/booking/payment-reversed-state-nope.tsx")).toBeNull();
  });

  it("finds a banned phrase when there IS one — inline, wrapped, and in the entity spelling", () => {
    // BOTH DIRECTIONS, through the same code path the real assertions use. Without this, every
    // "found nothing" below is equally consistent with a scanner that can never find anything. Every
    // fixture is BUILT from the two-piece encoding, so this file still never spells a banned phrase.
    const needle = NOT_COMPLETED_LANGUAGE[0].pieces.join("");

    const inline = findPhrases("fixture-inline.tsx", `<p>Good news — you ${needle} at all.</p>`, [
      ...NOT_COMPLETED_LANGUAGE,
    ]);
    expect(inline).toHaveLength(1);
    expect(inline[0]).toContain("fixture-inline.tsx:1");
    expect(inline[0]).toContain("STATE-05");

    // Contiguous once rendered, not contiguous in source — the formatter's line wrap.
    const words = needle.split(" ");
    const wrappedSource = `<p>\n  ${words[0]}\n  ${words.slice(1).join(" ")}\n</p>`;
    const wrapped = findPhrases("fixture-wrapped.tsx", wrappedSource, NOT_COMPLETED_LANGUAGE);
    expect(wrapped).toHaveLength(1);
    expect(wrapped[0]).toContain("wrapped across lines");

    // THE ENTITY SPELLING — the one the live defect was written in. See the header.
    const entitySource = `<p>you ${needle.replace("'", "&apos;")} for this.</p>`;
    expect(entitySource.includes("&apos;")).toBe(true);
    expect(findPhrases("fixture-entity.tsx", entitySource, NOT_COMPLETED_LANGUAGE)).toHaveLength(1);

    // …and a clean fixture is clean, so the scanner is not simply always positive.
    expect(
      findPhrases("fixture-clean.tsx", "<p>It is on its way back to you.</p>", [
        ...NOT_COMPLETED_LANGUAGE,
        ...MANUAL_BRANCH_BANS,
      ]),
    ).toEqual([]);
  });

  it("finds each manual-branch ban too, and reports it in the FILE's line coordinates", () => {
    for (const row of MANUAL_BRANCH_BANS) {
      const hits = findPhrases("fixture-manual.tsx", `an ordinary ${row.pieces.join("")} sentence`, [
        row,
      ]);
      expect(hits, `the row encoded as ${JSON.stringify(row.pieces)} matched nothing`).toHaveLength(1);
      expect(hits[0]).toContain("fixture-manual.tsx:1");
    }
    // The offset is what makes a hit inside the slice point at the right line of the component.
    const offset = findPhrases(
      "fixture-offset.tsx",
      `a ${MANUAL_BRANCH_BANS[0].pieces.join("")} sentence`,
      [MANUAL_BRANCH_BANS[0]],
      41,
    );
    expect(offset[0]).toContain("fixture-offset.tsx:42");
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (1) BAN 1 — the not-completed state's sentence appears nowhere in the reversed state
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("(1) D-69 — the reversed state never borrows the not-completed state's money sentence", () => {
  it("spells it nowhere in the file, comments included", () => {
    const hits = reversed === null ? [] : findInFile(reversed, NOT_COMPLETED_LANGUAGE);
    expect(
      hits,
      `the reversed state spells the not-completed state's money sentence: ${JSON.stringify(hits)}. ` +
        `A reversal means money LEFT the booker's account, and on the manual rails it has not come ` +
        `back — so this sentence is the inverse of the truth in two directions and contradicts the ` +
        `booker's own bank app. It must not appear in the file AT ALL, comments included, because a ` +
        `grep that matches its own prohibition stops being a guard. Encode it in two pieces if you ` +
        `must refer to it.`,
    ).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (2) BAN 2 — the manual-return branch's vocabulary
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("(2) D-82 / D-83 — the manual-return branch claims no return and no impossibility", () => {
  it("carries a marked manual-return region that is long enough to be the copy", () => {
    // ASSERTED FIRST. The ban below scans a slice; an absent or emptied slice satisfies it perfectly.
    const region = reversed === null ? null : manualRegion(reversed);
    expect(
      region,
      `${REVERSED_STATE} has no \`${MANUAL_BEGIN}\` / \`${MANUAL_END}\` pair. The manual branch's ` +
        `strings are scanned by that marked region and by nothing else, so removing the sentinels ` +
        `does not relax this gate — it switches it off. If the branch was restructured, move the ` +
        `sentinels in the same commit.`,
    ).not.toBeNull();
    expect(
      region!.text.trim().length,
      `the marked manual-return region is ${region!.text.trim().length} characters. That is not the ` +
        `branch's copy; an empty region passes every ban below.`,
    ).toBeGreaterThanOrEqual(MIN_MANUAL_REGION_CHARS);
  });

  it("uses neither the banned token nor the false impossibility inside that region", () => {
    const region = reversed === null ? null : manualRegion(reversed);
    const hits =
      region === null
        ? []
        : findPhrases(REVERSED_STATE, region.text, MANUAL_BRANCH_BANS, region.startLine);
    expect(
      hits,
      `the manual-return branch says something about the booker's money that is not true: ` +
        `${JSON.stringify(hits)}. On this branch the API refused the rail (or the call failed), the ` +
        `amount is on the FitOut platform wallet, and a person has to move it — so nothing has been ` +
        `sent back yet (D-83) and nothing is impossible (D-82: the accurate phrasing is \`not ` +
        `reversed automatically\`). The automatic branch is a different set of sentences and is ` +
        `deliberately outside this region.`,
    ).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// (3) THE POSITIVE HALF — deleting the copy is not a way to satisfy a ban
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("(3) the file still states the money truth it was corrected in order to state", () => {
  it("still renders the money statement, the reference, and a finished amount string", () => {
    // `sheet-absent`'s both-sides shape. A file with no money copy at all satisfies (1) and (2)
    // perfectly, and "we deleted the sentence" is the opposite of D-69.
    const raw = reversed === null ? "" : reversed.raw;

    expect(
      raw.includes("MoneyStatement"),
      `${REVERSED_STATE} no longer composes MoneyStatement. STATE-06/D-73 make that component the ` +
        `single owner of every "where is your money" sentence on /bookings/**, and this is the state ` +
        `it exists for. Removing it is not a way to satisfy the bans above.`,
    ).toBe(true);

    expect(
      raw.includes("BookingReference"),
      `${REVERSED_STATE} no longer renders the booking reference. TRUST-02 requires it on EVERY ` +
        `status, and on the manual branch it is the token a person needs in order to move the money.`,
    ).toBe(true);

    expect(
      raw.includes("amountLabel"),
      `${REVERSED_STATE} no longer takes the server-composed amount. D-69 requires the EXACT figure ` +
        `that left the booker's account, and D-130/GATE-05 require it to arrive as a finished string ` +
        `— the RSC formats it, this component never computes money.`,
    ).toBe(true);
  });
});
