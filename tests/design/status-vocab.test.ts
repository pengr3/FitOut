// DS-10 — the status vocabulary is a CLOSED union of four tones, every status declares an icon, and
// the filled green badge is gone. This is the file that keeps all three true.
//
// WHY THIS FILE EXISTS AT ALL. Before plan 10-10 the repo carried TWO tone vocabularies and neither
// was the design system's: `booking-status.ts` declared a three-value union, `payout-ledger-status.ts`
// a four-value one, and the value they shared was a filled green chip measuring 3.24:1. Nothing went
// red, because nothing was checking — "the badge vocabulary" was a claim in a spec rather than a type
// in the tree. The type layer below is what makes it a type; the source layer is what stops the
// retired pairing walking back in through a copy-paste.
//
// THE COMPILE GATE IS REAL, AND WAS WATCHED. Adding a fifth member to `STATUS_TONES` without giving
// it a recipe was tried locally and observed to fail, then reverted. Verbatim:
//
//   src/lib/design/status-tones.ts(79,14): error TS2741: Property 'warning' is missing in type
//   '{ neutral: {…}; positive: {…}; attention: {…}; "soft-accent": {…}; }' but required in type
//   'Record<"neutral" | "positive" | "attention" | "soft-accent" | "warning", StatusToneRecipe>'.
//
//   `npx tsc --noEmit` exited 2. That is the assertion no runtime test can make, which is why the
//   recipe map is a total `Record` and not a lookup with a fallback — and why it is recorded here
//   rather than described as a property the map "has".
//
// OBSERVED RED, NOT ASSUMED. The retired filled pairing was reinstated on `payout-state-badge.tsx`'s
// `paid` recipe and this file went NON-ZERO: **3 failed / 10 passed**, on exactly the three
// assertions that should care — the one-legal-site count, the four-call-site set, and the
// recipe-by-value check, each naming `src/components/host/payout-state-badge.tsx` in its message.
// The other ten stayed green, which is the correct blast radius: the type layer is unaffected by a
// call site, and it would be a bad sign if it moved. Reverted → 13 passed.
//
// WHY THE ICON COMPLETENESS CHECK IS A SOURCE SCAN AND NOT AN IMPORT. `BADGE_RECIPES` lives inside
// `booking-status-badge.tsx` / `payout-state-badge.tsx`, which pull in `lucide-react`, `radix-ui` and
// the vendored `Badge`. This suite runs under `vitest.design.config.ts`, whose whole point is that it
// touches no database and no DOM (`environment: "node"`). Importing two React component modules to
// read one const would drag that surface into a gate that is destined to run inside `next build`. The
// derive FUNCTIONS are imported directly — they are pure `.ts` with no runtime imports at all.
//
// THIS FILE MAY NAME THE RETIRED PAIRING VERBATIM; `src/` MAY NOT. The scanner roots at `src/`, so
// `tests/` is outside its own walk. That asymmetry is deliberate and is the same one
// `brand-recipe.test.ts` relies on — it is what lets the banned string be stated here by name instead
// of being described in a paraphrase nobody can grep for. It is also why the surviving call site in
// `wizard.tsx` explains itself in a comment that carefully does NOT quote the class: a comment naming
// the string it is exempting would make this file's own count read 2.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • PIXELS. This proves the class names and the tone values. It does not prove a browser paints a
//     legible chip: `cn()` / tailwind-merge precedence at a call site can still drop a class, and the
//     `positive` recipe deliberately overrides the Badge CVA's default variant rather than replacing
//     it. Phase 11's GATE-01 pass and Phase 17's a11y audit see real pixels.
//   • WHETHER THE TONE COLOURS CLEAR THEIR BAR. That is `contrast.test.ts`'s job, against the pair
//     inventory in `src/lib/design/contrast-pairs.ts`. This file only cares that the vocabulary is
//     closed, total, and reaching the four call sites unchanged.
//   • STATUSES OUTSIDE THESE TWO DERIVATIONS. A future surface that invents its own chip without
//     routing through `StatusTone` is invisible here.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import {
  STATUS_TONES,
  STATUS_TONE_RECIPES,
  type StatusTone,
} from "@/lib/design/status-tones";
import {
  deriveBookingStatusView,
  type BookingDbStatus,
} from "@/components/booking/booking-status";
import {
  derivePayoutLedgerView,
  type PayoutLedgerState,
} from "@/components/host/payout-ledger-status";

const SRC_DIR = resolve(process.cwd(), "src");

/** The four tones, written out independently of the module so a rename cannot rewrite the test. */
const EXPECTED_TONES = ["neutral", "positive", "attention", "soft-accent"] as const;

/** Every booking status the DB can hold (mirrors the `booking_status` pgEnum). */
const ALL_BOOKING_STATUSES: BookingDbStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "declined",
  "completed",
  "requested",
  "approved",
];

/** Every payout-ledger state (mirrors the `payout_ledger_state` pgEnum). */
const ALL_PAYOUT_STATES: PayoutLedgerState[] = [
  "held",
  "processing",
  "paid",
  "refunded",
  "failed",
];

/**
 * THE RETIRED PAIRING, as the two classes it is made of rather than as one adjacency (WR-03).
 *
 * The filled green chip: a `--success` fill carrying its LABEL in `--success-foreground`, which
 * measured 3.24:1 against a 4.5 text bar. Four of these shipped and all four are gone.
 *
 * WHY NOT THE ADJACENT STRING. This was `"bg-success text-success-foreground"` matched with
 * `includes()`, which is an assertion about two tokens being adjacent, in that order, separated by
 * exactly one space. The pairing renders identically — and the gate passes — if the classes are
 * REORDERED, double-spaced, wrapped across lines by a formatter, split across two `cn()` arguments,
 * or merely separated by any third class such as `rounded-full`. The last of those is not a
 * contrived evasion; it is what happens the first time somebody adds a border radius. Detecting the
 * two classes INDEPENDENTLY within one class string and intersecting them removes every one of
 * those escapes at once, and costs nothing in precision: two classes on the same element are the
 * pairing, whatever order they were typed in.
 */
const RETIRED_FILL = "bg-success";
const RETIRED_INK = "text-success-foreground";

/**
 * The ONE file allowed to keep it, and why.
 *
 * D-14 draws the line at "is this a status, or is it progress?". The wizard's completed-step marker
 * is a `<span>` whose only child is a glyph — there is no text node in it and no branch that could
 * add one — so the pairing it carries is the NON-TEXT one, measured at 3.83 court / 3.84 grove
 * against a 3.05 bar. That is a declared pairing in `contrast-pairs.ts` and the single legal use of
 * `--success-foreground` in the product. The count below is the RECORD of that decision, not an
 * oversight waiting to be tidied: a second filled green surface anywhere goes red here.
 */
const LEGAL_FILLED_PAIRING_SITE = "src/app/(host)/host/listings/[id]/edit/wizard.tsx";

/**
 * The four call sites that took the `positive` recipe, pinned per file rather than as a bare total.
 *
 * A total of 4 is satisfiable by re-treating the listing card twice and missing the payout banner.
 * This map is not. It is also the link that keeps the literal classes at these call sites honest:
 * they are written out in each file (the repo's convention for a call site — see
 * `availability/spots-left-chip.tsx`, the shipped soft accent), and asserted here BY VALUE against
 * `STATUS_TONE_RECIPES.positive`, so a change to the vocabulary that does not reach the call sites
 * fails at the file that did not move.
 */
const POSITIVE_CALL_SITES = [
  "src/components/booking/booking-status-badge.tsx",
  "src/components/host/payout-state-badge.tsx",
  "src/components/host/payout-banner.tsx",
  "src/components/listing/listing-card.tsx",
] as const;

/** Where a call site may live. `src/lib/` is excluded: the vocabulary itself declares these classes. */
const CALL_SITE_TREES = ["src/app/", "src/components/"] as const;

/**
 * Collect every `.ts`/`.tsx` file under a directory, recursively.
 *
 * Copied from `tests/design/focus-recipe.test.ts:69`, this phase's reference walker. `.css` is not
 * collected: the retired pairing was always a pair of utility classes on an element, never a rule in
 * the stylesheet.
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
 * WINDOWS PATH NORMALISATION — copied verbatim from `tests/design/focus-recipe.test.ts:90`. Load
 * bearing, not cosmetic: on this box `path.relative` emits backslash separators while every scope
 * decision here is a FORWARD-SLASH prefix comparison. Without it `CALL_SITE_TREES` matches nothing,
 * the violation list comes back empty and every count assertion passes vacuously — which is exactly
 * what the guard-the-guard block exists to catch.
 */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/**
 * Does `text` use `cls` as a WHOLE Tailwind class?
 *
 * The boundary matters more than usual here: a plain `includes("text-success")` also matches
 * `text-success-foreground`, which is the very class DS-10 declares illegal as text. A check that
 * cannot tell the two apart would report the wizard as a `positive` call site and would go green on
 * a call site that reinstated the retired ink.
 */
function usesClass(text: string, cls: string): boolean {
  return new RegExp(`${cls.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-/])`).test(text);
}

/**
 * Every string literal in a `.ts`/`.tsx` file — one chunk per class string.
 *
 * Copied from `tests/design/focus-recipe.test.ts`, which added it for WR-02 and chose this unit for
 * the same reason it is needed here: a class string is the smallest thing that reliably belongs to
 * ONE element, and both checks below are claims about a single element.
 */
function classChunks(path: string, text: string): string[] {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const out: string[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      out.push(node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * The set of UTILITIES in one class string, each with its variant chain removed and its opacity
 * modifier KEPT.
 *
 * Both halves of that sentence are load-bearing.
 *
 * REMOVING THE VARIANT CHAIN is what lets `data-[state=on]:bg-muted` be recognised as the same
 * utility as `bg-muted`, without a regex that has to guess where the chain ends. The scan walks
 * bracket depth, so a colon inside `data-[state=on]` does not split the token.
 *
 * KEEPING THE OPACITY MODIFIER is WR-09. The previous check used a regex whose right boundary was
 * `(?![\w-])`, which does not exclude `/` — so `bg-muted/40` satisfied a `bg-muted` surface match.
 * Those are two different rendered colours with two different contrast ratios, and the tree already
 * ships the tinted one (`search-result-card.tsx`'s `group-hover:bg-muted/40`). Comparing whole
 * utility strings makes the distinction structural rather than a lookahead that has to remember to
 * list every character that could follow.
 */
/**
 * Blank out comment lines. Copied from `tests/design/type-scale.test.ts:438`, this phase's reference
 * stripper — line-oriented rather than a `/\*…*\/` regex for the measured reason recorded there.
 */
function stripCommentLines(text: string): string {
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

function utilitiesIn(chunk: string): Set<string> {
  const out = new Set<string>();
  for (const raw of chunk.split(/\s+/).filter(Boolean)) {
    const token = raw.replace(/^!+/, "");
    let depth = 0;
    let start = 0;
    for (let i = 0; i < token.length; i++) {
      const ch = token[i];
      if (ch === "[" || ch === "(") depth++;
      else if (ch === "]" || ch === ")") depth--;
      else if (ch === ":" && depth === 0) start = i + 1;
    }
    out.add(token.slice(start));
  }
  return out;
}

interface Scan {
  /** Normalised forward-slash paths of every file the walker visited. */
  scanned: string[];
  /** Files under `src/app/` + `src/components/` carrying the retired filled pairing. */
  retiredPairingSites: string[];
  /** Files under `src/app/` + `src/components/` carrying the positive tone's icon hue. */
  positiveIconSites: string[];
  /** Raw text of every scanned file, keyed by normalised path. */
  text: Map<string, string>;
  /** Per call-site file: one utility SET per class string, so checks can be per-element. */
  utilities: Map<string, Set<string>[]>;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
function scanSrc(): Scan {
  const scan: Scan = {
    scanned: [],
    retiredPairingSites: [],
    positiveIconSites: [],
    text: new Map(),
    utilities: new Map(),
  };

  for (const file of collectSourceFiles(SRC_DIR)) {
    const name = label(file);
    const text = readFileSync(file, "utf8");
    scan.scanned.push(name);
    scan.text.set(name, text);

    if (!CALL_SITE_TREES.some((tree) => name.startsWith(tree))) continue;

    // PER CLASS STRING (WR-03 / WR-09): both the retired pairing and the recipe's surface+ink are
    // claims about ONE element, and a file-level `includes()` answers a weaker question.
    const chunks = classChunks(name, text).map(utilitiesIn);
    scan.utilities.set(name, chunks);

    if (chunks.some((u) => u.has(RETIRED_FILL) && u.has(RETIRED_INK))) {
      scan.retiredPairingSites.push(name);
    }
    if (usesClass(text, STATUS_TONE_RECIPES.positive.icon)) scan.positiveIconSites.push(name);
  }

  return scan;
}

const scan = scanSrc();

describe("DS-10 — the scan itself reaches what it claims to police", () => {
  // GUARD-THE-GUARD. Both source assertions below are counts, and a scanner that visited zero files
  // satisfies a count of 0 perfectly while satisfying a count of 1 not at all — so the failure would
  // at least be loud. The positive control is what makes the SET assertions trustworthy: a walker
  // that skipped `src/components/booking/` would report the badge files as clean.
  it("visits the whole source tree, not a fraction of it", () => {
    expect(scan.scanned.length).toBeGreaterThan(200);
  });

  it("reaches the badge files this plan re-treated — the positive control for every count below", () => {
    for (const site of POSITIVE_CALL_SITES) {
      expect(scan.scanned).toContain(site);
    }
    expect(scan.scanned).toContain(LEGAL_FILLED_PAIRING_SITE);
  });
});

describe("DS-10 — the tone vocabulary is closed and its recipe map is total", () => {
  it("declares exactly four tones, and exactly these four", () => {
    expect(STATUS_TONES).toHaveLength(4);
    expect([...STATUS_TONES].sort()).toEqual([...EXPECTED_TONES].sort());
  });

  it("gives every tone a recipe with all three slots filled — no tone can ship half-declared", () => {
    expect(Object.keys(STATUS_TONE_RECIPES).sort()).toEqual([...EXPECTED_TONES].sort());
    for (const tone of STATUS_TONES) {
      const recipe = STATUS_TONE_RECIPES[tone];
      expect(recipe, `no recipe for ${tone}`).toBeDefined();
      expect(recipe.surface.length, `${tone}.surface`).toBeGreaterThan(0);
      expect(recipe.text.length, `${tone}.text`).toBeGreaterThan(0);
      expect(recipe.icon.length, `${tone}.icon`).toBeGreaterThan(0);
    }
  });

  it("D-14 — green retreats to the icon: the three lifecycle tones differ ONLY in their icon hue", () => {
    // The structural form of "colour never carries the meaning". `neutral`, `positive` and
    // `attention` are the three tones a lifecycle state can land on, and all three put full-contrast
    // ink on the same neutral tint. If the hue could reach the LABEL, this assertion is where it
    // would arrive — a `positive` whose text is `text-success` fails here before any pixel is drawn.
    const lifecycle: StatusTone[] = ["neutral", "positive", "attention"];
    for (const tone of lifecycle) {
      expect(STATUS_TONE_RECIPES[tone].surface, `${tone}.surface`).toBe("bg-muted");
      expect(STATUS_TONE_RECIPES[tone].text, `${tone}.text`).toBe("text-foreground");
    }

    // …and the icon is what distinguishes them, so it must be distinct per tone. Three tones sharing
    // a surface AND a text colour AND an icon colour would be three names for one chip.
    const icons = lifecycle.map((t) => STATUS_TONE_RECIPES[t].icon);
    expect(new Set(icons).size).toBe(lifecycle.length);
  });

  it("no tone reaches for --success-foreground: it is illegal as text, in every slot", () => {
    // It survives with exactly ONE legal pairing — a non-text glyph on a filled --success surface —
    // and a tone recipe is by definition applied to a chip that has a label. Not one slot of one
    // tone may name it, including the icon slot, because the icon slot's colours land on the neutral
    // tint rather than on a --success fill.
    for (const tone of STATUS_TONES) {
      const recipe = STATUS_TONE_RECIPES[tone];
      for (const [slot, value] of Object.entries(recipe)) {
        expect(value, `${tone}.${slot}`).not.toContain("success-foreground");
      }
    }
  });
});

describe("DS-10 — every derived status lands inside the union and declares an icon", () => {
  it("every booking status, both sides, past and future, derives a tone in the union + an icon", () => {
    const NOW = new Date("2026-07-02T10:00:00Z");
    const FUTURE = new Date("2026-07-02T12:00:00Z");
    const PAST = new Date("2026-07-02T08:00:00Z");

    for (const side of ["booker", "host"] as const) {
      for (const endsAt of [FUTURE, PAST]) {
        for (const status of ALL_BOOKING_STATUSES) {
          const view = deriveBookingStatusView(status, endsAt, NOW, side);
          expect(STATUS_TONES, `${status}/${side} tone`).toContain(view.tone);
          // "Every status declares an icon" is the half of DS-10 that keeps a chip legible to a
          // reader who cannot see the hue at all. A status that derived a tone but no icon would be
          // colour-only by construction.
          expect(view.icon.length, `${status}/${side} icon`).toBeGreaterThan(0);
          expect(view.label.length, `${status}/${side} label`).toBeGreaterThan(0);
        }
      }
    }

    // POSITIVE CONTROL: the loop really did exercise more than one tone. Without this, a derivation
    // that collapsed every status to `neutral` would satisfy every assertion above.
    const tones = new Set(
      ALL_BOOKING_STATUSES.map((s) => deriveBookingStatusView(s, FUTURE, NOW, "booker").tone),
    );
    expect(tones.size).toBeGreaterThan(1);
    expect(tones).toContain("positive");
  });

  it("every payout state derives a tone in the union, and only `failed` is the attention edge", () => {
    for (const state of ALL_PAYOUT_STATES) {
      const view = derivePayoutLedgerView(state);
      expect(STATUS_TONES, `${state} tone`).toContain(view.tone);
      expect(view.label.length, `${state} label`).toBeGreaterThan(0);
    }

    // The never-red rule, asserted rather than asserted-about: a held payout is a NORMAL state.
    expect(derivePayoutLedgerView("failed").tone).toBe("attention");
    for (const happy of ["held", "processing", "paid", "refunded"] as const) {
      expect(derivePayoutLedgerView(happy).tone, `${happy} must not be the attention edge`).not.toBe(
        "attention",
      );
    }
  });
});

describe("DS-10 — every status badge recipe declares an icon", () => {
  /** Does `file`'s recipe map give `key` an `Icon`? Matches both the one-line and braced forms. */
  function declaresIcon(file: string, key: string): boolean {
    const text = scan.text.get(file) ?? "";
    return new RegExp(`\\n\\s*${key.replace("-", "\\-")}:\\s*\\{[^}]*Icon:`).test(text);
  }

  it("the booking badge map gives all seven display statuses an Icon", () => {
    for (const status of ALL_BOOKING_STATUSES) {
      expect(
        declaresIcon("src/components/booking/booking-status-badge.tsx", status),
        `booking badge recipe for ${status} has no Icon`,
      ).toBe(true);
    }
  });

  it("the payout badge map gives every badge-rendered state an Icon, and routes `failed` to an Alert", () => {
    for (const state of ["held", "processing", "paid", "refunded"] as const) {
      expect(
        declaresIcon("src/components/host/payout-state-badge.tsx", state),
        `payout badge recipe for ${state} has no Icon`,
      ).toBe(true);
    }

    // `failed` is deliberately absent from that map: a genuine failure needing a human is a MESSAGE,
    // not a chip, and it keeps the destructive Alert pattern (`text-destructive` on `--card`, a
    // declared pairing at 5.76:1). Asserting the branch exists is what makes the absence a decision.
    //
    // READ FROM STRIPPED SOURCE, and matched on the STATE (WR-13). This assertion previously named
    // the old `view.tone === "attention"` condition and read raw text — so once the component was
    // corrected to branch on the discriminant, the check went on passing because the COMMENT
    // explaining the correction still quoted the old condition. A gate satisfied by a comment about
    // the code rather than by the code is the collision this phase has now hit repeatedly.
    const badge = stripCommentLines(
      scan.text.get("src/components/host/payout-state-badge.tsx") ?? "",
    );
    expect(badge.length, "payout-state-badge.tsx was not read").toBeGreaterThan(0);
    expect(badge).toContain('state === "failed"');
    expect(badge).toContain('variant="destructive"');
    // The guard must NOT be re-expressed against the derived view: that is what let a cast claim a
    // branch was unreachable while nothing checked the value the lookup actually indexes on.
    expect(badge).not.toContain('view.tone === "attention"');
  });
});

describe("DS-10 — the filled green badge is retired, and the one survivor is a glyph", () => {
  it("keeps exactly ONE filled --success surface in the app, the wizard's glyph-only step marker (D-14)", () => {
    // The number is the record of a decision. Every OTHER filled green chip put its LABEL on the
    // fill at 3.24:1; this one puts a CheckIcon on it at 3.83 / 3.84, which is the single legal
    // pairing of --success-foreground and a progress indicator rather than a status.
    expect(scan.retiredPairingSites).toEqual([LEGAL_FILLED_PAIRING_SITE]);
  });

  it("re-treats exactly the four shipped status chips onto the positive recipe", () => {
    expect([...scan.positiveIconSites].sort()).toEqual([...POSITIVE_CALL_SITES].sort());
  });

  it("each of the four carries the positive recipe BY VALUE, on ONE element (WR-09)", () => {
    // The surface and the ink are the badge's OWN recipe, so they are required on the same class
    // string rather than merely somewhere in the file. File-level was too weak in two separate
    // ways: three slots scattered across three unrelated elements satisfied it, and — because the
    // old boundary did not exclude `/` — an opacity-modified surface satisfied it too, which is a
    // different rendered colour with a different contrast ratio.
    const { surface, text, icon } = STATUS_TONE_RECIPES.positive;
    for (const site of POSITIVE_CALL_SITES) {
      const body = scan.text.get(site) ?? "";
      expect(body.length, `${site} was not read`).toBeGreaterThan(0);

      const chunks = scan.utilities.get(site) ?? [];
      expect(chunks.length, `${site} produced no class strings`).toBeGreaterThan(0);
      expect(
        chunks.some((u) => u.has(surface) && u.has(text)),
        `${site} does not carry ${surface} and ${text} on the same element`,
      ).toBe(true);

      // The icon is a CHILD element by construction — the recipe puts the hue on the glyph and the
      // ink on the label — so it cannot be on the same string, and requiring that would be wrong.
      // It is asserted per file, which is this check's one remaining cross-element blind spot and
      // is stated here rather than left for the next reader to discover.
      expect(usesClass(body, icon), `${site} missing ${icon}`).toBe(true);
    }
  });

  it("pins ALL FOUR tone recipes by value, not just the one with a call site (WR-08)", () => {
    // THE VOCABULARY HAD ONE LOAD-BEARING ENTRY. Only `positive` was destructured anywhere in this
    // file, so `neutral`, `attention` and `soft-accent` could be edited to anything at all and
    // nothing in the suite would notice — a closed TYPE over three unenforced values. Changing
    // `neutral.surface` changed nothing and failed nothing.
    //
    // Every class named here is a declared pairing in `contrast-pairs.ts`, which is what makes the
    // table an assertion rather than a copy: foreground-on-muted 18.16 / 16.89, success-on-muted
    // 3.67 / 3.54, destructive-on-muted 5.28 / 5.10, muted-foreground-on-muted 4.82 / 5.28,
    // foreground-on-brand@10% 17.04 / 16.24, brand-on-brand@10% 4.10 / 4.06. Editing a slot here
    // means re-deriving that pairing, which is exactly the friction DS-10 wants.
    expect(STATUS_TONE_RECIPES).toEqual({
      neutral: { surface: "bg-muted", text: "text-foreground", icon: "text-muted-foreground" },
      positive: { surface: "bg-muted", text: "text-foreground", icon: "text-success" },
      attention: { surface: "bg-muted", text: "text-foreground", icon: "text-destructive" },
      "soft-accent": { surface: "bg-brand/10", text: "text-foreground", icon: "text-brand" },
    });

    // Every tone in the closed union has a recipe, and no recipe exists for a tone the union
    // dropped — `outline` in particular, which was removed as a TONE while its badge variant stayed.
    expect(Object.keys(STATUS_TONE_RECIPES).sort()).toEqual([...STATUS_TONES].sort());
    expect(Object.keys(STATUS_TONE_RECIPES)).not.toContain("outline");
  });

  it("renders soft-accent BY VALUE at its one adopter, on a single element", () => {
    // The second tone that is genuinely load-bearing, asserted the same way `positive` is. Without
    // this, `soft-accent` was pinned only against itself by the table above.
    const { surface, text, icon } = STATUS_TONE_RECIPES["soft-accent"];
    const site = "src/components/availability/spots-left-chip.tsx";
    const chunks = scan.utilities.get(site) ?? [];
    expect(chunks.length, `${site} produced no class strings`).toBeGreaterThan(0);
    expect(
      chunks.some((u) => u.has(surface) && u.has(text)),
      `${site} does not carry ${surface} and ${text} on the same element`,
    ).toBe(true);
    expect(usesClass(scan.text.get(site) ?? "", icon)).toBe(true);
  });

  it("records which tones are rendered from the recipe and which only agree with it (WR-08)", () => {
    // THE HONEST STATEMENT of what the reconciliation actually achieved, asserted so it cannot rot
    // into a claim nobody re-checks. `neutral` and `attention` do NOT consume the recipe object at
    // a call site: neutral's chips reach the same colours through `variant="secondary"` (--secondary
    // and --muted hold the same value in both themes), and attention's only adopter is a destructive
    // Alert on --card. Closing that gap means deciding whether approved/processing keep their
    // border treatment and whether the closed lifecycle statuses keep their de-emphasised ink —
    // design decisions, deferred, not silently pending.
    const badge = stripCommentLines(
      scan.text.get("src/components/booking/booking-status-badge.tsx") ?? "",
    );
    expect(badge.length).toBeGreaterThan(0);
    // The outline variant is still selected per status, which is what the vocabulary note now says.
    expect(badge).toContain('variant: "outline"');
    // …and the neutral tint is still reached via the secondary variant rather than the recipe.
    expect(badge).toContain('variant: "secondary"');
  });

  it("cannot be evaded by reordering, extra spacing, or an intervening class (WR-03)", () => {
    // POSITIVE CONTROL for the detection change. Every shape below renders the retired 3.24:1
    // pairing, and every one of them passed the old adjacency check.
    for (const evasion of [
      "text-success-foreground bg-success",
      "bg-success  text-success-foreground",
      "bg-success rounded-full text-success-foreground",
      "inline-flex bg-success px-2 text-success-foreground",
    ]) {
      const u = utilitiesIn(evasion);
      expect(u.has(RETIRED_FILL) && u.has(RETIRED_INK), evasion).toBe(true);
      // …and the old check genuinely did not see them, which is why this test exists.
      expect(evasion.includes(`${RETIRED_FILL} ${RETIRED_INK}`), evasion).toBe(false);
    }

    // The legal glyph-only survivor must still be recognised, or the count above means nothing.
    expect(utilitiesIn("bg-success text-success-foreground").has(RETIRED_FILL)).toBe(true);
  });

  it("does not accept an opacity-modified surface as the solid one (WR-09)", () => {
    // `bg-muted/40` is not `bg-muted`: different composite, different ratio. The tree already ships
    // the tinted form on `search-result-card.tsx`, so this is a live distinction, not a hypothetical.
    expect(utilitiesIn("group-hover:bg-muted/40").has("bg-muted")).toBe(false);
    expect(utilitiesIn("bg-muted").has("bg-muted")).toBe(true);
    expect(usesClass("group-hover:bg-muted/40", "bg-muted")).toBe(false);
    expect(usesClass("border-transparent bg-muted text-foreground", "bg-muted")).toBe(true);

    // The variant chain, by contrast, must NOT change the utility's identity.
    expect(utilitiesIn("data-[state=on]:bg-muted").has("bg-muted")).toBe(true);
  });
});
