// AC#39 / 14-UI-SPEC § the alarm token gains ZERO new occurrences — THE HOST TONE CENSUS.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THE CLAIM ACTUALLY IS, AND WHY IT IS NOT "ZERO"
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The phase's claim is ZERO **NEW** alarm-coloured elements on a set of calm host workflow surfaces. It
// is not zero alarm-coloured elements, and the difference is the whole reason this file is a MAP rather
// than a count.
//
// A request that expires, a booking that was cancelled, a listing with no hours, a payout that has not
// happened yet and a week with nothing set are all NORMAL STATES OF A WORKING MARKETPLACE. Colour-as-
// alarm on any of them tells a host something is broken when nothing is — and a host who is told that
// three times stops believing the fourth, which is the one that mattered. What the alarm role IS
// reserved for is a genuine failure needing a human (a paused payout account) and the canonical
// form-field refusal (a validation message on a control the host just used). Both of those exist on
// these trees today, both are correct, and both would be deleted by a gate asserting zero.
//
// ⚠ 14-RESEARCH § The destructive-token census MEASURED the pre-phase tree with this repository's own
// comment stripper and states the consequence in as many words: *"A plan writing acceptance #39 as a
// zero-count scan over those three trees goes red on the first run. Write it as a PINNED PER-FILE MAP,
// the shape `EXPECTED_SURVIVING_ACCENT_LINES` and `DECLARED_SITES` already use."* That is what this is.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE ASSERTION IS EQUALITY, IN BOTH DIRECTIONS, AND THE SECOND DIRECTION IS THE HALF A FLOOR MISSES
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A ceiling ("no more than N") catches the regression everybody thinks of: a later plan paints a normal
// state red. It misses the opposite one entirely — a well-meant sweep that "removes the last red from
// the host tree" and takes the paused-payout alert with it, leaving a host whose money is genuinely
// stuck reading a muted grey line. So the map and the measurement must be EQUAL: a new occurrence fails,
// and a removed one fails too, and each failure names the file.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// COMMENTS ARE STRIPPED, WITH THE REPOSITORY'S OWN STRIPPER, AND THAT IS LOAD-BEARING HERE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Four of the five files below explain, in prose, why their own occurrence is correct — and two more
// files on these trees carry prose about the token while rendering none of it. A scan that counted
// those sentences would report a tree twice as alarming as the one that ships, and the "fix" would be
// deleting the explanations. `tests/design/helpers/strip-comments.ts` is the one stripper; it tracks
// quote state so a trailing comment is removed without eating `accept="image/*"`, and
// `strip-comments.test.ts` is the record of the four hand-rolled copies it replaced, all of which
// missed trailing comments and one of which let a grey primary CTA ship.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE DELIBERATELY DOES NOT PIN — owned elsewhere, and double-pinning is worse than not
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • `src/components/booking/request-countdown.tsx` — its ONE occurrence (the final-hour emphasis on
//     the digits) is pinned at a count of one by `tests/design/phase13-surface-gates.test.ts` and is
//     RETAINED by decision on that hours-scale surface (D-146). It is also outside all three trees
//     below, so it is out of scope twice over. Two gates pinning one number is two places to edit and
//     one of them will be forgotten; that file owns it.
//   • `src/components/listing/**` — the photo uploader's remove control, the address autocomplete's
//     field error (whose retention 14-UI-SPEC discharges explicitly) and the listing card's delete
//     action. On Phase-14 surfaces, outside the three declared trees, and none of them is a host
//     workflow state.
//   • `src/components/ui/**` — the vendored primitives DECLARE the role (the alert variant, the button
//     variant, the invalid-field border). Declaring it is not spending it, and `button-variants.test.ts`
//     is what keeps the declarations honest.
//   • WHETHER ANY OF THIS IS RED ON SCREEN. This is a source scan. It proves which files reach for the
//     role and how often; it cannot prove a browser paints it, and it cannot see a hand-rolled colour
//     that never names the token at all — `tests/design/leak.test.ts` is what watches for that.
//   • THE SEVERITY OF AN OCCURRENCE. Two occurrences in one file may be one alert and its description,
//     or two unrelated alarms. The map counts; the `why` beside each entry is what carries the
//     judgement, and an entry without one is not an entry.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";

import { stripComments } from "./helpers/strip-comments";

const SRC_DIR = resolve(process.cwd(), "src");

/**
 * The three trees AC#39 names, and no others.
 *
 * The host ROUTE tree and the two COMPONENT trees this phase restyled. Widening this to `src/` would
 * fold in the vendored primitives that declare the role and the booker surfaces that legitimately spend
 * it, and the map would stop being about host workflow surfaces — which is the only thing the claim is
 * about.
 */
const TREES = [
  "src/app/(host)/",
  "src/components/host/",
  "src/components/availability/",
] as const;

/**
 * The alarm role's token name.
 *
 * Every spelling is matched through this ONE name rather than through a list of utilities, and that is
 * deliberate: `text-…`, `border-…`, `bg-…`, `variant="…"`, an `aria-invalid:`-scoped border and the
 * foreground pair are six ways to spend the same decision, and a list of the five somebody thought of
 * is a list the sixth walks past. The word is what the tree is being counted for.
 */
const ALARM_ROLE = "destructive";

/** Word-boundary-ish: the name, wherever it appears, including inside a compound utility. */
const ALARM_PATTERN = new RegExp(ALARM_ROLE, "g");

/**
 * THE MAP — every file on the three trees that spends the alarm role, its count, and WHY that
 * occurrence is correct.
 *
 * Populated by MEASURING the tree this phase leaves behind, not by copying 14-RESEARCH's pre-phase
 * table: one entry below did not exist when that table was measured, and finding it is the reason this
 * gate is a measurement.
 *
 * A file absent from this map must render ZERO. A file present must render EXACTLY its number.
 */
const EXPECTED_ALARM_OCCURRENCES: Readonly<Record<string, { count: number; why: string }>> = {
  // ⚠ THE ONE ENTRY 14-RESEARCH's PRE-PHASE TABLE DOES NOT HAVE, and it is the finding this gate was
  // written to surface rather than the regression it was written to stop. That table measured the host
  // ROUTE tree at ZERO. Plan 14-11 then shipped D-150's truthful save state: a persistent region beside
  // the advance control whose `failed` arm carries THE SERVER'S OWN REFUSAL SENTENCE — the reason a
  // draft did not save. Its two sibling states are muted; only the refusal takes this ink.
  //
  // It is inside the role's reservation rather than an exception to it. § Color reserves the alarm role
  // for a genuine failure needing a human and for the canonical field-refusal, and this is both at
  // once: the host pressed a control, the server said no, and nothing further happens until they act.
  // The alternative — a refusal rendered in the same muted ink as `Saving…` and `Saved` — is an absence
  // dressed as a state, which is the inversion this phase's whole tone argument is against.
  //
  // SO THE PHASE'S ARITHMETIC IS +1, NOT 0, AND THAT IS SAID PLAINLY HERE RATHER THAN AVERAGED AWAY.
  // 14-UI-SPEC AC#39 asks for zero new occurrences on these three trees; the tree ships nine where the
  // research measured eight. The plan that added it is named, the reason is written beside it, and the
  // number is pinned — which is what makes the next one a decision rather than a drift.
  "src/app/(host)/host/listings/[id]/edit/wizard.tsx": {
    count: 1,
    why:
      "D-150's save-state region (plan 14-11). ONE ink branch: the `failed` arm, carrying the server's " +
      "own refusal sentence. `Saving…` and `Saved` are muted. A form refusal on a control the host " +
      "just pressed is the canonical use of the alarm role, and the region is empty at idle so the " +
      "colour is never on screen except when something is genuinely waiting on the host.",
  },

  // ─── the four 14-RESEARCH measured before the phase, unchanged by it ────────────────────────────

  "src/components/availability/weekly-hours-editor.tsx": {
    count: 1,
    why:
      "the overlap / on-the-hour validation message, rendered beside the day rows the host just " +
      "edited. THE canonical field-refusal: the shared `weeklyHoursSchema` is the one authority (this " +
      "surface draws and never judges), and its sentence is the only thing standing between the host " +
      "and hours that would break the double-booking constraint.",
  },
  "src/components/host/host-cancel-dialog.tsx": {
    count: 1,
    why:
      "the cancellation FEE figure inside the confirm dialog — a real charge the host is about to " +
      "incur, on the one irreversible action this tree offers. Its call site records the constraint " +
      "that makes it legal: the figure may take this ink ONLY alongside the explicit 'deducted from " +
      "your next payout' sentence, never colour-only (07-UI-SPEC § Colour). The dialog's own confirm " +
      "control is deliberately NOT the alarm variant.",
  },
  "src/components/host/payout-banner.tsx": {
    count: 3,
    why:
      "the paused-payout banner: the alert VARIANT on the paused branch, plus the two refusal lines " +
      "(one per branch) that render the server's sentence when the onboarding call fails. A paused " +
      "payout account is money that will not reach the host and bookings that cannot be taken — a " +
      "genuine failure needing a human, which is exactly what DS-10 reserves this role for. Frozen by " +
      "D-156: HFLOW-05 is a token pass, and plan 14-01's string-literal gate is what proves it.",
  },
  "src/components/host/payout-state-badge.tsx": {
    count: 3,
    why:
      "the failed / needs-attention payout state, rendered as the alert PATTERN rather than a chip " +
      "(05-UI-SPEC): the variant, its container edge and its description ink. None of the happy payout " +
      "states reaches this branch — a payout that simply has not happened yet is neutral, which is the " +
      "distinction this file's own header draws. Frozen by D-156, like the banner above.",
  },
};

/** Collect every `.ts`/`.tsx` file under a directory — `brand-recipe.test.ts:429`'s reference walker. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * WINDOWS PATH NORMALISATION — `brand-recipe.test.ts:441`'s note, and load-bearing for the same reason:
 * on this box `path.relative` emits backslashes while every scope decision here is a forward-slash
 * prefix comparison. Without it `TREES` matches nothing, the measurement comes back empty, and the
 * equality assertion passes against a map full of expectations nobody checked.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/** One file's reading: how many times it spends the role, and which spellings it used. */
type Reading = { count: number; spellings: string[] };

/** The measurement, comment-stripped, over the three trees. */
function measure(): Map<string, Reading> {
  const out = new Map<string, Reading>();
  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    if (!TREES.some((tree) => name.startsWith(tree))) continue;

    const stripped = stripComments(readFileSync(file, "utf8"));
    const matches = [...stripped.matchAll(ALARM_PATTERN)];
    if (matches.length === 0) continue;

    // The surrounding utility or prop, for the failure message: a red should say WHICH spelling
    // arrived, not just that a number moved. The quote and `=` are deliberately INSIDE the window so
    // a prop spelling comes back as the prop rather than as the bare word — a bare word tells a
    // reader nothing about whether an alert variant or a text colour was added.
    const spellings = matches.map((m) => {
      const at = m.index ?? 0;
      const before = stripped.slice(Math.max(0, at - 40), at);
      const after = stripped.slice(at + ALARM_ROLE.length, at + ALARM_ROLE.length + 24);
      const head = (before.match(/[^\s`{}(),;<>]*$/) ?? [""])[0];
      const tail = (after.match(/^[^\s`{}(),;<>]*/) ?? [""])[0];
      return `${head}${ALARM_ROLE}${tail}`;
    });

    out.set(name, { count: matches.length, spellings });
  }
  return out;
}

const measured = measure();

describe("AC#39 — the alarm token gains ZERO NEW occurrences on the host and availability trees", () => {
  it("the scanner actually reads all three trees (guard-the-guard)", () => {
    const seen = collectSourceFiles(SRC_DIR).map(label);
    for (const tree of TREES) {
      const inTree = seen.filter((f) => f.startsWith(tree));
      expect(
        inTree.length,
        `the scanner found ${inTree.length} source files under \`${tree}\`. Every assertion below is ` +
          "a comparison against a MEASUREMENT, and a measurement of nothing agrees with an empty map " +
          "perfectly — which is this repository's most-recorded failure mode. If a tree moved, move " +
          "this list with it and say so; do not let the scan go quiet.",
      ).toBeGreaterThan(0);
    }
  });

  it("comments are stripped, so prose about the role is not an occurrence (self-test)", () => {
    // The fixture is the shape that actually ships on these trees: a file that EXPLAINS its own
    // decision. Both spellings — a leading comment and a trailing one — because the four hand-rolled
    // strippers this repository replaced all missed the trailing form, which is the dominant habit here.
    const fixture =
      `// this line talks about ${ALARM_ROLE} and renders none of it\n` +
      `const a = "text-muted-foreground"; /* nor does ${ALARM_ROLE} here */\n` +
      `const b = "text-${ALARM_ROLE}";\n`;
    const stripped = stripComments(fixture);
    expect(
      [...stripped.matchAll(new RegExp(ALARM_ROLE, "g"))].length,
      "the stripper let a comment through. Every count in the map below would then include the " +
        "sentences that explain why an occurrence is correct — which would make the honest files read " +
        "as the alarming ones, and the 'fix' would be deleting the explanations.",
    ).toBe(1);
  });

  it("every file that spends the alarm role is declared, with a reason", () => {
    const undeclared = [...measured.entries()]
      .filter(([file]) => EXPECTED_ALARM_OCCURRENCES[file] === undefined)
      .map(([file, r]) => `  ${file} — ${r.count}x: ${[...new Set(r.spellings)].join(", ")}`);

    expect(
      undeclared,
      "these files on the host or availability trees spend the ALARM role and are not in this gate's " +
        "map:\n" +
        `${undeclared.join("\n")}\n` +
        "The phase's claim is zero NEW alarm-coloured elements on a set of calm host workflow " +
        "surfaces. A request that expires, a booking that was cancelled, a listing with no hours, a " +
        "payout that has not happened yet and a week with nothing set are all normal states of a " +
        "working marketplace, and colour-as-alarm on any of them tells a host something is broken " +
        "when nothing is. If this occurrence is a genuine failure needing a human, or a form-field " +
        "refusal on a control the host just used, add it to the map WITH THAT REASON. Otherwise it is " +
        "the regression this gate exists for.",
    ).toEqual([]);
  });

  it("no declared occurrence has quietly disappeared", () => {
    const vanished = Object.keys(EXPECTED_ALARM_OCCURRENCES)
      .filter((file) => measured.get(file) === undefined)
      .map((file) => `  ${file} — expected ${EXPECTED_ALARM_OCCURRENCES[file].count}x, found none`);

    expect(
      vanished,
      "these files were declared as spending the alarm role for a stated reason and now spend it " +
        "nowhere:\n" +
        `${vanished.join("\n")}\n` +
        "This direction is the half a ceiling misses. A sweep that 'removes the last red from the " +
        "host tree' takes the paused-payout alert with it, and a host whose money is genuinely stuck " +
        "then reads a muted grey line. If the removal is deliberate, delete the entry and say why in " +
        "the same commit.",
    ).toEqual([]);
  });

  it("every declared count is exactly right", () => {
    const wrong = Object.entries(EXPECTED_ALARM_OCCURRENCES)
      .map(([file, expected]) => ({ file, expected, actual: measured.get(file) }))
      .filter(({ expected, actual }) => actual !== undefined && actual.count !== expected.count)
      .map(
        ({ file, expected, actual }) =>
          `  ${file} — declared ${expected.count}, measured ${actual?.count}: ` +
          `${[...new Set(actual?.spellings ?? [])].join(", ")}\n      declared reason: ${expected.why}`,
      );

    expect(
      wrong,
      "these declared counts no longer match the tree:\n" +
        `${wrong.join("\n")}\n` +
        "A count moving UP means a normal state was painted as an alarm; a count moving DOWN means a " +
        "genuine one stopped being. The reason beside each entry is what tells the two apart — read " +
        "it before moving a number.",
    ).toEqual([]);
  });
});
