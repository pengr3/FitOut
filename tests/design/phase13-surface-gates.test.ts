// 13-UI-SPEC § Color — THE TWO COLOUR CONTRACTS OF PHASE 13, AS A TEST.
//
// Two claims, both of which the spec states in falsifiable form and neither of which anything in this
// repository could previously have failed:
//
//   1. THE ALARM TOKEN RENDERS NOWHERE THIS PHASE'S SURFACES REACH. A reversed payment, a failed
//      checkout, a settling webhook and a cancelled booking are NOT errors the booker caused. DS-10
//      reserves the `attention` tone for a genuine failure needing a human, and the booker is not that
//      human — the operator alert `handleGoneSlot` already raises is. Colour-as-alarm on a money
//      surface tells a booker they did something wrong at the exact moment they did not.
//
//   2. THE ACCENT RESERVED-FOR LIST STAYS AT TEN. Every coral on these surfaces is already entry 1
//      (`<Button variant="brand">`) — `Back to availability`, `Try paying again`, `Find another space`,
//      `Invite people`, `Pay now` — so Phase 13 introduces no new KIND of accent use at all. The spec
//      records that as a finding rather than an omission, and a finding worth stating is worth pinning.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THIS FILE NEVER SPELLS EITHER BANNED SPELLING CONTIGUOUSLY, AND THAT IS NOT STYLE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A grep is only a real guard if it cannot be tripped by the very text forbidding the string. Every
// spelling below is stored in TWO PIECES, split MID-WORD so neither fragment reads as the thing, and
// joined at runtime — the `payout-sweep` / `price-surface.test.ts:256-283` idiom this repository already
// uses. The consequence is deliberate and is asserted by the plan's own acceptance criterion:
// a `grep -c` for the ink spelling over this file returns 0, and so does a grep for the bare word. The
// prose below therefore says "the alarm token" throughout; that is the cost of the idiom and it is
// cheaper than a permanently disarmed check.
//
// ⚠ THAT COST IS REAL AND WAS PAID ONCE ALREADY, IN THIS FILE, ON THE FIRST DRAFT. The sentence above
// originally quoted the acceptance criterion literally — `grep -c '…' …` with the spelling written out
// — so the very line documenting that the file contains no such string contained one, and the criterion
// measured 1. That is exactly the failure mode `price-surface.test.ts` warns about ("just in a comment,
// to explain what we must not say"), arriving in the file whose whole subject is that warning. Recorded
// rather than quietly fixed, because the next author will be tempted by the same sentence.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// COMMENTS ARE STRIPPED, AND THE COLLISION THAT DECIDES IT WAS MEASURED RATHER THAN ARGUED
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `price-surface.test.ts` deliberately does NOT strip comments for two of its scans, and its reason is
// sound for the hazard IT guards: there, the danger is that the phrase EXISTS at all, because the moment
// it does every future grep matches its own prohibition. That is not the hazard here. The hazard here is
// that a booker SEES an alarm colour on a money surface — a rendering claim — and a comment renders
// nothing.
//
// The difference is not hypothetical on this tree. MEASURED, 21 August 2026, over the three declared
// roots: a raw text scan reports **7 hits across 5 files**; the same scan over comment-stripped code
// reports **3 hits across 3 files**. All four of the difference are comments EXPLAINING the contract —
// `hold-countdown.tsx:70` ("the ONLY use on this path"), `hold-expired-state.tsx:4` ("expiry is not an
// error, so this is NEVER red"), `refund-breakdown.tsx:81` ("the numerals may carry it because they are
// PAIRED with this label"), `headcount-meter.tsx:19` ("never an alarm"). A gate that reported those four
// would be demanding that four files stop explaining themselves, which is `sheet-absent.test.ts`'s
// recorded reason for the default and the right one. The two counts are BOTH asserted below, and the
// gap between them is asserted to be non-zero — so the stripper is proved to be doing work here rather
// than assumed to be.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE BAN IS A CLOSED SET WITH PINNED COUNTS, NOT A ZERO — AND THE SPEC'S LITERAL ZERO IS UNSATISFIABLE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// 13-UI-SPEC § Color's falsifiable form reads: *"zero alarm tokens under `src/app/(app)/bookings/**`,
// `src/components/booking/**` and `src/components/group/**`"*. MEASURED before this file was written,
// that is **not satisfiable by the shipped tree**, and none of the three survivors is a Phase-13 defect:
//
//   • `hold-countdown.tsx` — the checkout hold's final SIXTY SECONDS. 12-UI-SPEC § Color declares it in
//     as many words: *"One optional use on this path: the countdown's numerals in the final 60 seconds.
//     Nothing else."* It is a Phase-12 surface that happens to live in a Phase-13 root.
//   • `refund-breakdown.tsx` — the `Service fee refund` numerals, which are PAIRED with the
//     unconditional `Service fees aren't refunded` label directly beneath them. Never colour-only, and
//     the component's own header states it is the one permitted use on that page.
//   • `request-countdown.tsx` — the final-hour emphasis on its two HOURS-scale call sites (the host
//     inbox SLA and the booker payment window). ⚠ THIS IS THE ONE A READER WILL MISREAD AS A REGRESSION
//     THIS PHASE INTRODUCED, AND IT IS NOT. Plan 13-07 found that reusing the component on the
//     not-completed state would have shipped a permanently emphasised countdown — the predicate is
//     "under an hour", which is true from the first paint to the last on a fifteen-minute hold — and
//     fixed it with an opt-out prop (`finalHourEmphasis`) so both shipped call sites stay
//     byte-identical. `deferred-items.md` carries the whole entry, and
//     `tests/booking/payment-states.test.tsx` asserts the RENDERED tree of both Phase-13 states is free
//     of it. The token remains in that file's source by design.
//
// So the gate is the shape `contrast-pairs.ts`'s `EXCLUDED_PAIRS` and `visual-baselines.ts`'s blocked
// rows already use: a declared inventory with an argument per row and a PINNED COUNT per file, asserted
// in BOTH directions. An undeclared file with a hit is red; a declared file that grows a SECOND hit is
// red; a declared file that loses its hit is red too, because a row nobody can reach any more is a row
// that has stopped being a decision. `deferred-items.md` records the phase's own reading of this: a ban
// list cannot catch the item nobody thought of, so prefer a closed-set count.

import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { stripComments } from "./helpers/strip-comments";
import { ACCENT_USES, type AccentUsePhase } from "../../src/lib/design/accent-uses";
import { CONTRAST_PAIRS, EXCLUDED_PAIRS } from "../../src/lib/design/contrast-pairs";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The scanned trees
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The three roots 13-UI-SPEC § Color names, verbatim and in its order.
 *
 * They are the trees this phase BUILT IN, not the trees it owns end to end — `hold-countdown.tsx` and
 * `collision-notice.tsx` are Phase-12 surfaces sitting inside one of them. That overlap is the reason
 * the inventory below carries arguments rather than a bare number.
 */
const ROOTS = ["src/app/(app)/bookings", "src/components/booking", "src/components/group"] as const;

const REPO = resolve(__dirname, "../..");

/**
 * WINDOWS PATH NORMALISATION — copied from `status-vocab.test.ts:218` with its reason intact. Load
 * bearing, not cosmetic: on this box `path.relative` emits backslashes while every key, every pin and
 * every failure message here is a forward-slash path. Without it the pinned map matches nothing, the
 * violation list comes back empty, and every assertion passes vacuously.
 */
function label(file: string): string {
  return relative(REPO, file).split("\\").join("/");
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

type Opened = {
  readonly rel: string;
  /** The file as written, comments included. Read ONLY by the collision measurement. */
  readonly raw: string;
  /** Comments removed, line count preserved — see the header for why this is what the ban reads. */
  readonly code: string;
};

/**
 * Open one repository-relative path, or `null` when it does not exist.
 *
 * `null` rather than a throw, deliberately, and `price-surface.test.ts:648` records why: the realistic
 * version of this failure is a MOVED FILE or a narrowed root, which never throws — it silently produces
 * a clean scan. The vacuity probe at the foot of the first describe is what turns that into a failure.
 */
function openFile(rel: string): Opened | null {
  const abs = resolve(REPO, rel);
  if (!existsSync(abs)) return null;
  const raw = readFileSync(abs, "utf8");
  return { rel, raw, code: stripComments(raw) };
}

/** Scanned ONCE at module level; every `it()` below asserts against this. */
const SCANNED: readonly Opened[] = ROOTS.flatMap((root) =>
  collectSourceFiles(resolve(REPO, root)).map((abs) => {
    const raw = readFileSync(abs, "utf8");
    return { rel: label(abs), raw, code: stripComments(raw) };
  }),
);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The banned spellings, each in two pieces and each with the reason it is banned
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type Banned = {
  /** The spelling, split mid-word so neither fragment reads as it. Joined at runtime, never written. */
  readonly pieces: readonly [string, string];
  /** WHY it is banned. Travels into the failure message — a row without a reason is not a row. */
  readonly why: string;
};

/**
 * The four spellings 13-UI-SPEC names. All four, rather than the ink one alone, because the hazard is
 * the ALARM READING and a surface can reach it four ways: ink, fill, the button variant, and the raw
 * custom property.
 */
const BANNED: readonly Banned[] = [
  {
    pieces: ["text-destru", "ctive"],
    why:
      "paints INK in the alarm hue. On a money surface it tells a booker the figure they are reading " +
      "is a fault of theirs. Every Phase-13 money statement is `foreground on muted` or " +
      "`muted-foreground on muted`, both already declared and measured.",
  },
  {
    pieces: ["bg-destru", "ctive"],
    why:
      "paints a whole SURFACE in the alarm hue — the loudest form of the same claim, and the one that " +
      "cannot be missed at a glance. DS-10 reserves the tone for a genuine failure needing a human, " +
      "and the booker reading a reversed payment is not that human.",
  },
  {
    pieces: ['variant="destru', 'ctive"'],
    why:
      "the alarm BUTTON. 13-UI-SPEC § Copywriting Contract puts it plainly: a plan that introduces one " +
      "of these here has misread the phase. `Cancel booking`, `Remove attendee` and `Regenerate link` " +
      "are all expected lifecycle outcomes and all ship as neutral `outline`.",
  },
  {
    pieces: ["--destru", "ctive"],
    why:
      "the raw custom property, which is how the token arrives when somebody writes a bespoke class or " +
      "an inline style to get around the three utility spellings above. Banning the utilities without " +
      "the property leaves the obvious escape open.",
  },
];

type Hit = { readonly rel: string; readonly line: number; readonly why: string };

/** Every occurrence of a banned spelling in `text`, as `{file, line, why}`. */
function findBanned(rel: string, text: string): Hit[] {
  const hits: Hit[] = [];
  const lines = text.split("\n");
  for (const banned of BANNED) {
    const needle = banned.pieces.join("");
    lines.forEach((line, index) => {
      if (line.includes(needle)) hits.push({ rel, line: index + 1, why: banned.why });
    });
  }
  return hits;
}

/** `file → how many banned spellings its CODE contains`, for a set of opened files. */
function countByFile(files: readonly Opened[], read: (f: Opened) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const file of files) {
    const n = findBanned(file.rel, read(file)).length;
    if (n > 0) out[file.rel] = n;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The declared sites — a closed set, with the argument attached to each row
// ─────────────────────────────────────────────────────────────────────────────────────────────────

type DeclaredSite = {
  /** How many banned spellings that file's CODE carries. Pinned, and asserted in both directions. */
  readonly count: number;
  /** Why the use is legal, and which phase declared it. An empty string is a compile-legal row and a red one. */
  readonly why: string;
};

/**
 * MEASURED 21 August 2026, comments stripped: three files, one occurrence each. Anything not in this
 * map must be zero; anything in it must be exactly its number.
 */
const DECLARED_SITES: Readonly<Record<string, DeclaredSite>> = {
  "src/components/booking/hold-countdown.tsx": {
    count: 1,
    why:
      "PHASE 12, declared in as many words. 12-UI-SPEC § Color: 'One optional use on this path: the " +
      "countdown's numerals in the final 60 seconds. Nothing else.' The surface is the CHECKOUT hold, " +
      "not a Phase-13 surface; it lives in a Phase-13 root because the roots are trees, not ownership.",
  },
  "src/components/booking/refund-breakdown.tsx": {
    count: 1,
    why:
      "the `Service fee refund` numerals, PAIRED with the unconditional `Service fees aren't refunded` " +
      "label rendered directly beneath them. Never colour-only, so it survives DS-10's rule about " +
      "hue as a sole signal, and the component's header names it as the one permitted use on that page.",
  },
  "src/components/booking/request-countdown.tsx": {
    count: 1,
    why:
      "the final-HOUR emphasis on the two hours-scale call sites (the host inbox SLA and the booker " +
      "payment window). ⚠ NOT a regression this phase introduced — plan 13-07 added the " +
      "`finalHourEmphasis` opt-out precisely so the fifteen-minute Phase-13 reuse renders WITHOUT it, " +
      "and `tests/booking/payment-states.test.tsx` asserts the rendered tree of both Phase-13 states " +
      "is free of the token. `deferred-items.md` carries the entry so this reading is not rediscovered.",
  },
};

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ALARM-TOKEN BAN
// ═════════════════════════════════════════════════════════════════════════════════════════════════

describe("13-UI-SPEC § Color — the alarm token renders nowhere on this phase's surfaces", () => {
  it("visited a non-zero number of files, and the Phase-13 surfaces are among them", () => {
    // THE POSITIVE CONTROL, and the count alone is the weak half of it. A scan over zero files is
    // green and means nothing — this repository has now recorded that shape nine times — but so is a
    // scan over sixty files that happens to miss the six the phase actually built. So the floor is
    // asserted AND the phase's own surfaces are named.
    expect(
      SCANNED.length,
      "the scan opened NO files. Every assertion below is then trivially green and this whole file " +
        "is decoration. The likely cause is a moved or renamed root, not an empty tree.",
    ).toBeGreaterThan(0);
    // Measured 21 August 2026: 61. A floor rather than an equality, because Phase 14 and Phase 15 are
    // entitled to add files to these trees and a gate that reds on a NEW file teaches people to move
    // the number without reading it.
    expect(SCANNED.length).toBeGreaterThanOrEqual(55);

    // SCAN-REACHES-WHAT-IT-CLAIMS (`status-vocab.test.ts`'s idiom). These six are the phase's own
    // surfaces; a root that no longer contains them is a root pointed somewhere else.
    const rels = new Set(SCANNED.map((f) => f.rel));
    for (const required of [
      "src/components/booking/not-completed-state.tsx",
      "src/components/booking/payment-reversed-state.tsx",
      "src/components/booking/pending-payment-state.tsx",
      "src/components/group/attendee-roster.tsx",
      "src/components/group/share-link-box.tsx",
      "src/app/(app)/bookings/[id]/page.tsx",
    ]) {
      expect(
        rels.has(required),
        `${required} is not in the scanned set, so the roots no longer reach this phase's own ` +
          "surfaces and a clean result says nothing about them.",
      ).toBe(true);
    }
  });

  it("finds every banned spelling when one is planted, through the same code path", () => {
    // BOTH DIRECTIONS. Without this, every "found nothing" below is equally consistent with a scanner
    // that can never find anything. The fixtures are BUILT from the two-piece encoding, so this file
    // still never writes a spelling out.
    for (const banned of BANNED) {
      const planted = `<p className="${banned.pieces.join("")}">x</p>`;
      const hits = findBanned("fixture.tsx", planted);
      expect(
        hits,
        `the scanner did not find a planted \`${banned.pieces[0]}…\`, so its absence in the tree ` +
          "proves nothing.",
      ).toHaveLength(1);
      expect(hits[0].line).toBe(1);
      expect(hits[0].why).toBe(banned.why);
    }

    // …and a clean fixture is clean, so the scanner is not simply always positive.
    expect(
      findBanned("clean.tsx", '<p className="text-muted-foreground tabular-nums">x</p>'),
    ).toEqual([]);
  });

  it("reports exactly the declared sites, in both directions", () => {
    const measured = countByFile(SCANNED, (f) => f.code);

    const undeclared = Object.entries(measured)
      .filter(([rel]) => DECLARED_SITES[rel] === undefined)
      .flatMap(([rel]) => findBanned(rel, SCANNED.find((f) => f.rel === rel)!.code))
      .map((hit) => `${hit.rel}:${hit.line} — ${hit.why}`);
    expect(
      undeclared,
      "an UNDECLARED alarm-token site under the three Phase-13 roots. This is the contract 13-UI-SPEC " +
        "§ Color states and the reason each row above carries its argument: the four surfaces this " +
        "phase built explain a payment that did not complete, and none of them is a fault of the " +
        "booker's. If the use is genuinely warranted, it needs a row in `DECLARED_SITES` with the " +
        "argument written out — not a deletion of this assertion.",
    ).toEqual([]);

    for (const [rel, site] of Object.entries(DECLARED_SITES)) {
      expect(
        measured[rel] ?? 0,
        `${rel} carries ${measured[rel] ?? 0} alarm-token spellings, not the declared ${site.count}. ` +
          `Declared because: ${site.why}. MORE than the pin is a new use that nobody argued for; ` +
          "FEWER is a declared row that has stopped being reachable, which is a decision that quietly " +
          "expired rather than a cleanup — either way the row and the tree have to be reconciled by " +
          "hand.",
      ).toBe(site.count);
    }

    // …and no row was left without an argument. A `why` is what makes this an inventory rather than a
    // list of exceptions, and an empty string is otherwise perfectly legal.
    for (const [rel, site] of Object.entries(DECLARED_SITES)) {
      expect(site.why.length, `${rel} is declared with no argument`).toBeGreaterThan(80);
    }
  });

  it("strips comments, and the four prose collisions it thereby ignores really exist", () => {
    // THE STRIPPER, PROVED TO BE DOING WORK HERE rather than assumed to be. If a future refactor
    // removed the strip, this assertion is what notices — and if a future edit deleted all four of the
    // explanatory comments, it notices that too and says so, because a tree whose contract is no
    // longer written down anywhere is a real change even though nothing rendered differently.
    const rawCounts = countByFile(SCANNED, (f) => f.raw);
    const codeCounts = countByFile(SCANNED, (f) => f.code);
    const rawTotal = Object.values(rawCounts).reduce((a, b) => a + b, 0);
    const codeTotal = Object.values(codeCounts).reduce((a, b) => a + b, 0);

    // Measured 21 August 2026: raw 7 across 5 files, code 3 across 3 files.
    expect(
      rawTotal,
      "a raw scan found no MORE hits than a stripped one, so either the stripper is a no-op here or " +
        "the four comments that explain this contract have been deleted from the tree.",
    ).toBeGreaterThan(codeTotal);
    expect(rawTotal - codeTotal).toBeGreaterThanOrEqual(4);

    // Named, so the gap is legible instead of merely non-zero.
    for (const proseOnly of [
      "src/components/booking/hold-expired-state.tsx",
      "src/components/group/headcount-meter.tsx",
    ]) {
      expect(
        rawCounts[proseOnly] ?? 0,
        `${proseOnly} no longer explains, in a comment, why it is never painted in the alarm hue.`,
      ).toBeGreaterThan(0);
      expect(
        codeCounts[proseOnly] ?? 0,
        `${proseOnly} now carries the token in CODE, not only in prose.`,
      ).toBe(0);
    }
  });

  it("pointed at a path that does not exist, opens nothing — which is why the floor exists", () => {
    // The vacuity probe as a permanent assertion rather than a one-off, `price-surface.test.ts:648`'s
    // idiom. A missing file scans perfectly clean and is indistinguishable from a real result.
    expect(openFile("src/components/booking/not-completed-state-nope.tsx")).toBeNull();
    expect(findBanned("nothing.tsx", "")).toEqual([]);

    // …and the real one opens, so the probe is not merely testing that a typo is a typo.
    expect(openFile("src/components/booking/not-completed-state.tsx")).not.toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ACCENT PIN
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * Every accent-bearing spelling a Phase-13 file can carry, and the `ACCENT_USES` entry it belongs to.
 *
 * ⚠ A SOURCE SCAN CANNOT SEE A TOKEN THAT ARRIVES THROUGH AN IMPORT — plan 13-07's recorded trap, and
 * it is live in this very measurement. `collision-notice.tsx` renders entry 9's SURFACE (`bg-brand/10`)
 * and its GLYPH (`text-brand`) by spreading `STATUS_TONE_RECIPES["soft-accent"]` from
 * `src/lib/design/status-tones.ts`; only the decorative EDGE is a literal in the file. So this scan sees
 * one of that recipe's three parts. That is enough for the claim being made — the claim is about the
 * KIND of use, and the edge identifies the kind — but it is not a census of accent pixels and must not
 * be read as one.
 */
const ACCENT_RECIPES: readonly { readonly match: string; readonly useId: number; readonly why: string }[] =
  [
    {
      match: 'variant="brand"',
      useId: 1,
      why:
        "the opt-in CTA variant. Every coral on a Phase-13 surface is this and only this: " +
        "`Back to availability`, `Try paying again`, `Find another space`, `Invite people`, `Pay now`.",
    },
    {
      match: "border-brand/30",
      useId: 9,
      why:
        "the soft-accent notice's decorative EDGE, at `collision-notice.tsx` — Phase 12's STATE-07 " +
        "adopter of entry 9. The surface and glyph of that same recipe arrive through " +
        "`status-tones.ts` and are invisible to this scan; see the note above.",
    },
  ];

/**
 * Anything that looks like the accent token in a UTILITY or CUSTOM-PROPERTY position. Matched against
 * stripped code.
 *
 * THE PREFIX IS MANDATORY, and that is a correction rather than a tightening. The first version made it
 * optional and matched the bare word inside `variant="brand"` as well as the literal — so every one of
 * the 18 CTA sites reported twice, once correctly as entry 1 and once as an unclaimed bare `brand`.
 * Requiring either a utility prefix (`bg-`, `text-`, `border-`, `ring-`, a variant chain ending in one)
 * or the two dashes of the raw custom property is what separates "a class built on the accent" from "the
 * word brand appearing in a string".
 */
const ACCENT_TOKEN = /(?:^|[^\w-])((?:--|[a-z][a-z-]*-)brand(?:-foreground)?(?:\/(?:\d+|\[[^\]]+\]))?)/g;

type AccentSighting = { readonly rel: string; readonly line: number; readonly text: string };

/**
 * Every accent sighting under the scanned trees: the CVA variant spelled as a literal, plus every
 * utility class built on the accent token.
 *
 * The regex is deliberately loose — it collects `bg-brand`, `text-brand`, `ring-brand`, `border-brand/30`
 * and any alpha or bracketed form — because the failure this is looking for is *a recipe nobody
 * declared*, and a tight pattern only ever finds the recipes somebody already thought of.
 * `deferred-items.md` records the phase's own version of that lesson: a ban list cannot catch the item
 * nobody thought of.
 */
function accentSightings(files: readonly Opened[]): AccentSighting[] {
  const out: AccentSighting[] = [];
  for (const file of files) {
    file.code.split("\n").forEach((line, index) => {
      if (line.includes('variant="brand"')) {
        out.push({ rel: file.rel, line: index + 1, text: 'variant="brand"' });
      }
      for (const m of line.matchAll(ACCENT_TOKEN)) {
        out.push({ rel: file.rel, line: index + 1, text: m[1] });
      }
    });
  }
  return out;
}

/** A sighting is legal only if a declared recipe claims it. Returns the unclaimed ones. */
function unclaimed(sightings: readonly AccentSighting[]): string[] {
  return sightings
    .filter((s) => !ACCENT_RECIPES.some((r) => r.match === s.text))
    .map((s) => `${s.rel}:${s.line} — \`${s.text}\` matches no declared accent use`);
}

describe("13-UI-SPEC § Color — the accent reserved-for list, and the pairing inventory", () => {
  it("holds exactly ten entries, and Phase 13 declared none of them", () => {
    // The LENGTH is enforced at compile time by `AccentUseCountIsTen` in the module itself, on every
    // machine and inside `next build`. It is restated here because a runtime failure names the number
    // it found, and a `tsc` failure names only the alias — the honest weakness `visual-baselines.ts`
    // records about its own two aliases.
    expect(ACCENT_USES).toHaveLength(10);
    expect(new Set(ACCENT_USES.map((u) => u.id)).size, "duplicate entry ids").toBe(10);

    // ⚠ THE COMPARISON IS WIDENED THROUGH A TYPED CONSTANT, AND THE REASON IS A FINDING WORTH KEEPING.
    // `ACCENT_USES` is `as const satisfies`, so `tsc` narrows `declaredIn` across the ten rows to the
    // literal union `10 | 11 | 12` — the number 13 is not in it. Written as a bare `=== 13` this line is
    // therefore a COMPILE ERROR ("types '10 | 11 | 12' and '13' have no overlap"), which was observed
    // while writing this file and is the strongest possible form of the claim: the compiler proves
    // Phase 13 appended nothing before a test runs at all.
    //
    // The runtime check is kept rather than deleted in favour of that, because the narrowing is a
    // property of the `as const` and nothing else. One widened annotation on the array — the ordinary
    // "add a type to make an error go away" edit — puts 13 back in the union, restores this line to
    // legality, and takes the compile-time proof away silently. This assertion is what still fails then.
    const PHASE_13: AccentUsePhase = 13;
    const appendedByThisPhase = ACCENT_USES.filter(
      (u) => (u.declaredIn as AccentUsePhase) === PHASE_13,
    ).map((u) => u.device);
    expect(
      appendedByThisPhase,
      "Phase 13 appended an accent use. 13-UI-SPEC states the opposite as a FINDING rather than an " +
        "omission: every coral on the confirmation, payment-state, receipt and group surfaces is " +
        "already entry 1, so there is no new KIND of accent use in the whole phase. An eleventh entry " +
        "is a product decision, not a styling one.",
    ).toEqual([]);

    // 7 + 1 + 2 + 0, restated as data so the arithmetic is checkable rather than asserted in prose.
    const byPhase = new Map<number, number>();
    for (const use of ACCENT_USES) byPhase.set(use.declaredIn, (byPhase.get(use.declaredIn) ?? 0) + 1);
    expect(Object.fromEntries(byPhase)).toEqual({ 10: 7, 11: 1, 12: 2 });
  });

  it("every declared use still has a call site on disk", () => {
    // A kind that has quietly stopped shipping is a row that has stopped being a decision. This is the
    // cheapest thing that can tell the difference between an inventory and a museum.
    const missing = ACCENT_USES.filter((u) => openFile(u.site) === null).map(
      (u) => `${u.id}: ${u.site} — ${u.device}`,
    );
    expect(
      missing,
      "a declared accent use names a file that is not in the tree. Either the recipe moved (update " +
        "the `site`) or the use has stopped shipping (which is an entry to retire, with an argument).",
    ).toEqual([]);
  });

  it("every accent recipe under the Phase-13 trees maps to a declared use", () => {
    const sightings = accentSightings(SCANNED);

    expect(
      sightings.length,
      "the accent scan found NOTHING under three trees that ship at least five coral call-to-action " +
        "buttons. A clean result here is a broken scanner, not a clean tree.",
    ).toBeGreaterThan(0);

    expect(
      unclaimed(sightings),
      "an accent recipe under the Phase-13 trees that no `ACCENT_USES` entry claims. That is an " +
        "ELEVENTH kind of accent use arriving without the argument the list exists to demand.",
    ).toEqual([]);

    // THE CLOSED SET, which is the assertion that actually carries the spec's claim. Measured
    // 21 August 2026: 18 `variant="brand"` occurrences across 13 files (entry 1), and exactly one
    // `border-brand/30` at `collision-notice.tsx` (entry 9). Two KINDS, both pre-Phase-13.
    const reached = [
      ...new Set(
        sightings.map((s) => ACCENT_RECIPES.find((r) => r.match === s.text)!.useId),
      ),
    ].sort((a, b) => a - b);
    expect(
      reached,
      "the set of accent USES these trees reach has changed. It is pinned rather than counted because " +
        "13-UI-SPEC's claim is about kinds: entry 1 is the opt-in CTA variant and entry 9 is the " +
        "soft-accent notice Phase 12 declared. A third id here is a Phase-13 surface reaching for a " +
        "device nobody assigned it.",
    ).toEqual([1, 9]);
  });

  it("the accent scanner finds an undeclared recipe when there is one", () => {
    // The direction that is otherwise unproved. `bg-brand` is the plausible mistake — a surface that
    // decides to paint itself coral — and it is exactly what an eleventh entry would look like.
    const planted: Opened = {
      rel: "fixture-accent.tsx",
      raw: "",
      code: '<div className="rounded-xl bg-brand p-4 text-brand-foreground">x</div>',
    };
    const hits = unclaimed(accentSightings([planted]));
    expect(hits.length, "the accent scanner cannot see an undeclared recipe").toBeGreaterThan(0);
    expect(hits[0]).toContain("fixture-accent.tsx:1");

    // …and the two declared spellings are NOT reported, so it is not simply always positive.
    const legal: Opened = {
      rel: "fixture-legal.tsx",
      raw: "",
      code: '<Button variant="brand" />\n<div className="border border-brand/30" />',
    };
    expect(unclaimed(accentSightings([legal]))).toEqual([]);
  });

  it("renders zero undeclared colour pairings — the inventory is unchanged in both directions", () => {
    // 13-UI-SPEC § Color: "Zero new `CONTRAST_PAIRS`, zero new `EXCLUDED_PAIRS`. Every ink this phase
    // renders is already declared and already measured in both themes." A NEW pair would mean a
    // surface reached for an ink nobody measured; a LOST one would mean a measured pairing stopped
    // being checked. Both are equalities for that reason — `contrast.test.ts` asserts only floors
    // (`>= 39`, `>= 7`), which cannot see an addition at all.
    //
    // Measured 21 August 2026, at the head of this plan: 39 and 7.
    expect(
      CONTRAST_PAIRS.length,
      "the declared contrast inventory changed size during a phase whose UI-SPEC states it adds " +
        "nothing to it. A new row is fine — it just is not this phase's, and it needs the number here " +
        "moved deliberately rather than to make a suite green.",
    ).toBe(39);
    expect(EXCLUDED_PAIRS.length, "the declared exclusion inventory changed size").toBe(7);
  });
});
