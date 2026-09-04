// D-75 / TRUST-05 — THE RECEIPT NEVER PRESENTS AS AN OFFICIAL ONE, AND THAT IS A TEST.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS GATE EXISTS AT ALL
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Philippine official receipts carry real legal requirements — registration, serial numbering, retention
// — and whether FitOut issues them is a business decision the PM and their accountant have not made
// (13-CONTEXT D-75, and the parked question in that document's `<deferred>` block). So the document
// FitOut does ship must never IMPLY the status it does not have.
//
// The failure mode is drift, not malice. Nobody sets out to fake a government document; somebody adds a
// field because a booker asked for one, or because the layout looked bare, and six months later the page
// carries a serial number and a tax field and reads exactly like the thing it is not. This file is the
// commit at which that becomes a red run instead of a review comment.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// EVERY BANNED TOKEN IS STORED IN TWO PIECES AND JOINED AT RUNTIME
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `price-surface.test.ts` established the rule and the reason: a scan that spelled its own needle would
// be a permanent false positive the moment anyone pointed it at the test directory — and, worse, the
// forbidden string would then live in the repository as a copy-pasteable literal. The pieces below split
// mid-token, so no fragment reads as the thing in a search of this file either.
//
// The scanned files keep the same discipline from their side: `receipt/page.tsx`'s header describes the
// six tokens rather than listing them, and says so explicitly.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TWO OF THE SIX RULES ARE NARROWER THAN THEY LOOK, AND BOTH NARROWINGS ARE LOAD-BEARING
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. THE SCAN IS CASE-SENSITIVE, AND A CASE-INSENSITIVE ONE WOULD BE UNSATISFIABLE. The receipt's
//      whole promise is the sentence *"It isn't an official receipt"* — you cannot deny a thing without
//      naming it. The lower-case form is therefore REQUIRED to appear, and the capitalised two-word
//      title used as a document heading is what is banned. A case-insensitive rule here would be a rule
//      no working receipt could ever satisfy, which is the shape of gate that gets deleted rather than
//      fixed. Measured rather than assumed: assertion 2 below requires the lower-case form to be present
//      in the same file assertion 1 scans.
//
//   2. THE THREE-LETTER TOKENS ARE WORD-BOUNDED. Two of them are ordinary letter runs inside ordinary
//      English words, and a substring scan would flag prose that has nothing to do with tax documents.
//      Anchoring at `\b` and matching upper case keeps the rule about the FIELD LABEL rather than about
//      the letters.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE POSITIVE HALF IS NOT A NICETY — IT IS WHAT MAKES THE BAN MEAN ANYTHING
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A file with no receipt in it satisfies six absence assertions perfectly. So does a deleted route, a
// renamed path, and a glob that stopped matching. Assertion 2 requires the disclosure sentence to be
// PRESENT, and the guard-the-guard block requires both declared files to have been opened and to be
// non-trivial in size. `price-surface.test.ts`'s vacuity probe (c) is the precedent, and its finding is
// the reason: *"an absence assertion cannot notice it was handed an empty list."*
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • THIS FILE READS SOURCE. It says nothing about what RENDERS. A banned token arriving through an
//     import, a map lookup or a template substitution is invisible to it — the same hole
//     `price-surface.test.ts` records for its own phrase scan, and the safe direction for a ban (it can
//     miss a violation, never invent one).
//   • The declared file set is a DECLARATION. A second receipt surface added later is not scanned until
//     someone adds it here, which is why the set is asserted BY NAME as well as by count.
//   • It cannot judge LAYOUT. A document that carried none of the six tokens and still aped the visual
//     furniture of an official form would pass. That is a review question and 13-VALIDATION keeps it as
//     a manual item.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — recorded verbatim (21 August 2026)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`). Both
// probes were run, both were reverted from a saved copy rather than with `git checkout`, and the
// verbatim output is in the 13-12 SUMMARY.
//
//   (a) THE BAN. The taxpayer-identification field added to the receipt route as a `<dt>`.
//   (b) VACUITY. The route's declared path re-pointed at a file that does not exist, to prove the
//       absence assertions cannot pass against a scan that read nothing.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";

/**
 * The tree root every path below is resolved against.
 *
 * PARAMETERISABLE rather than hardcoded, for `leak.test.ts:208-212`'s reason: probe (b) in the header is
 * a one-line edit, and the guard-the-guard assertions run the same code path the real assertions run.
 */
const ROOT = process.cwd();

/** The route that composes the document. */
const RECEIPT_PAGE = "src/app/(app)/bookings/[id]/receipt/page.tsx";
/** The itemisation it hands the money to. */
const RECEIPT_LINES = "src/components/booking/receipt-lines.tsx";

/** Every file that renders any part of the receipt, asserted by name as well as by count. */
const RECEIPT_FILES = [RECEIPT_PAGE, RECEIPT_LINES] as const;

/**
 * A file shorter than this was not really read. `price-surface.test.ts`'s per-file floor, for the same
 * reason: the failure this gate has to notice is "the path moved and `existsSync` said no", not "a glob
 * narrowed".
 */
const MIN_FILE_BYTES = 1000;

/** `path.relative` emits backslashes on Windows while every path here is forward-slash. */
function posix(abs: string): string {
  return relative(ROOT, abs).split("\\").join("/");
}

type Opened = { readonly rel: string; readonly raw: string };

/**
 * Open one declared file, or `null` when it is not there. Never throws: a broken scan must surface as ONE
 * named guard-the-guard failure rather than as a stack trace that buries which gate went quiet.
 */
function openFile(rel: string): Opened | null {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) return null;
  return { rel: posix(abs), raw: readFileSync(abs, "utf8") };
}

/** Scanned ONCE at module level; the `it()` blocks only assert against these. */
const opened = new Map<string, Opened>();
for (const rel of RECEIPT_FILES) {
  const file = openFile(rel);
  if (file !== null) opened.set(rel, file);
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE SIX BANNED TOKENS, EACH IN TWO PIECES AND EACH WITH THE REASON IT IS BANNED
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type Banned = {
  /** The token, split mid-word so neither fragment reads as it. Joined at runtime, never written. */
  readonly pieces: readonly [string, string];
  /** WHY it is banned. Travels into the failure message — a row without a reason is not a row. */
  readonly why: string;
  /**
   * `true` → the joined token is matched at word boundaries rather than as a bare substring.
   *
   * Only the short letter runs need it, and they need it for a concrete reason rather than for tidiness:
   * two of them occur inside ordinary English words, so an unanchored scan would report a file's own
   * prose as a breach of itself — `price-surface.test.ts`'s assertion 4 records the same narrowing and
   * the same reason.
   */
  readonly wordBounded: boolean;
};

const BANNED: readonly Banned[] = [
  {
    pieces: ["Offici", "al Receipt"],
    why:
      "the capitalised two-word title IS the claim. Used as a heading or a field label it states that " +
      "this document has a legal status FitOut has not established, and a booker has no way to tell " +
      "the difference by looking. The lower-case form is deliberately NOT banned — it is the sentence " +
      "that denies the status, and you cannot deny a thing without naming it.",
    wordBounded: false,
  },
  {
    pieces: ["OR N", "o"],
    why:
      "the abbreviated form of the same title, in the shape it appears on a real one: a label followed " +
      "by a number. It is the single most compact way to imply the whole apparatus.",
    wordBounded: false,
  },
  {
    pieces: ["T", "IN"],
    why:
      "a taxpayer-identification field belongs to a registered document. Printing one — even blank, " +
      "even as a placeholder — asserts that this record participates in a tax filing, which is exactly " +
      "the business decision that has not been taken.",
    wordBounded: true,
  },
  {
    pieces: ["B", "IR"],
    why:
      "naming the revenue bureau, in any form, states an association FitOut does not have. There is no " +
      "version of this that is decorative.",
    wordBounded: true,
  },
  {
    pieces: ["Seria", "l No"],
    why:
      "serial numbering is one of the concrete legal requirements of a real official receipt, and the " +
      "booking reference is emphatically not one: it is a one-way hash of the booking id, minted per " +
      "booking with no sequence and no registry behind it. Labelling it as a serial would be a false " +
      "statement about the only identifier on the page.",
    wordBounded: false,
  },
  {
    pieces: ["V", "AT"],
    why:
      "a tax line is a claim about what was collected and remitted. FitOut's own money row is labelled " +
      "`Service fee` for the same reason (C1 / D-73) — it is platform revenue, never a government levy.",
    wordBounded: true,
  },
] as const;

/** Join the two pieces. Written once so no call site ever holds a whole banned token in a literal. */
function needle(row: Banned): string {
  return `${row.pieces[0]}${row.pieces[1]}`;
}

/**
 * The disclosure sentence, as its two halves.
 *
 * SPLIT AROUND THE APOSTROPHE ON PURPOSE, and the reason is mechanical rather than stylistic: the JSX
 * source escapes it as an HTML entity (the repo's lint rule requires it), so the rendered sentence and
 * the source text are not the same string. Matching the two halves means this assertion tracks the COPY
 * rather than the escaping, and a future switch between the entity and a typographic apostrophe does not
 * turn a correct receipt red.
 */
const DISCLOSURE = [
  "This is a booking record for your own reference.",
  "an official receipt.",
] as const;

describe("(1) D-75 — the receipt spells none of the six official-document tokens", () => {
  for (const rel of RECEIPT_FILES) {
    it(`${rel} carries none of them, comments included`, () => {
      const file = opened.get(rel);
      expect(file, `${rel} was not opened — see the guard-the-guard block`).toBeTruthy();
      const raw = file?.raw ?? "";

      const hits: string[] = [];
      for (const row of BANNED) {
        const found = row.wordBounded
          ? new RegExp(`\\b${needle(row)}\\b`).test(raw)
          : raw.includes(needle(row));
        // The failure names the FILE and the REASON without printing the token — the same discipline the
        // scanned files keep, and the reason `why` is a mandatory field rather than a comment.
        if (found) hits.push(`${rel} — ${row.why}`);
      }

      expect(
        hits,
        "the receipt spells a token that implies official status (D-75). It must not appear in this " +
          "file AT ALL, comments included: a scan that matches its own prohibition is not a guard, and " +
          "the token would then live in the repository as a copy-pasteable literal.",
      ).toEqual([]);
    });
  }
});

describe("(2) D-75 — and it says what it IS, which is what makes the ban mean something", () => {
  it("the route renders the informal-record disclosure", () => {
    const file = opened.get(RECEIPT_PAGE);
    expect(file, `${RECEIPT_PAGE} was not opened — see the guard-the-guard block`).toBeTruthy();
    const raw = file?.raw ?? "";

    const missing = DISCLOSURE.filter((half) => !raw.includes(half));
    expect(
      missing,
      "the receipt no longer states that it is an informal record. Six absence assertions are " +
        "satisfied perfectly by a file with no receipt in it, so this presence assertion is what gives " +
        "them meaning. The sentence renders on screen AND on paper — it carries no `print:` variant and " +
        "no `hidden`, because the screen is where a booker is most likely to assume the wrong thing " +
        "about what they are looking at (D-75).",
    ).toEqual([]);
  });

  it("the disclosure is not itself hidden from one of the two media", () => {
    const raw = opened.get(RECEIPT_PAGE)?.raw ?? "";
    // The sentence's own element must not be print-only or screen-only. Located by its first half and
    // checked over the enclosing element's source, which is the smallest window that can carry a
    // visibility variant.
    const at = raw.indexOf(DISCLOSURE[0]);
    expect(at, "the disclosure sentence was not found at all").toBeGreaterThan(-1);
    const elementStart = raw.lastIndexOf("<", at);
    const element = raw.slice(elementStart, at);
    expect(
      /\bhidden\b|print:hidden/.test(element),
      "the informal-record disclosure is inside an element that hides it in one medium. D-75 requires " +
        "it in BOTH: a `print:`-only line leaves the screen reader of this page believing they are " +
        "looking at something official, and a screen-only line lets the printed sheet imply it.",
    ).toBe(false);
  });
});

describe("guard-the-guard — an absence assertion cannot notice it was handed nothing", () => {
  it("opened every declared receipt file", () => {
    expect(
      opened.size,
      `the scanner opened ${opened.size} of ${RECEIPT_FILES.length} declared receipt files (missing: ` +
        `${RECEIPT_FILES.filter((r) => !opened.has(r)).join(", ") || "none"}). Every absence asserted ` +
        `above is green against a scan that read nothing.`,
    ).toBe(RECEIPT_FILES.length);
  });

  it("read a non-trivial amount of each", () => {
    const thin = [...opened.values()]
      .filter((f) => f.raw.length < MIN_FILE_BYTES)
      .map((f) => `${f.rel} (${f.raw.length} bytes)`);
    expect(
      thin,
      `a declared receipt file is under ${MIN_FILE_BYTES} bytes, which is not a receipt. The scan would ` +
        `report clean against a stub or a moved path.`,
    ).toEqual([]);
  });

  it("the declared set is the set, by name", () => {
    expect([...opened.keys()].sort()).toEqual([...RECEIPT_FILES].sort());
  });
});
