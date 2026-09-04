// DS-08 / D-21 — THE ACCENT RESERVED-FOR LIST, AS DATA. Ten entries, each with the phase that
// declared it, the recipe it renders and a call site on disk.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE IS NET-NEW WORK IN PLAN 13-15, AND WHAT WAS ACTUALLY THERE BEFORE IT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// 13-UI-SPEC § Color states the phase's accent contract in a falsifiable form: *"`ACCENT_USES` stays at
// 10 entries"*. 12-UI-SPEC AC#43 says the same thing about its own number, 11-UI-SPEC AC#35 about its
// own, and three Phase-13 SUMMARYs (13-02, 13-07, 13-09) each report `ACCENT_USES` as *"untouched at
// 10"* in their no-regression lists.
//
// MEASURED, 21 August 2026, before a line of this file was written: **there was no `ACCENT_USES`.** A
// repository-wide search for the identifier returned matches in `.planning/` prose only — the UI-SPECs
// that name it, the plans that cite it, and the summaries that certify it unchanged. Nothing in `src/`
// or `tests/` declared it, imported it, counted it or could have failed because of it. The reserved-for
// list existed as a numbered list in five markdown documents, three of which are archived milestone
// artifacts.
//
// So a claim three plans certified was checked by nobody, and the shape of that is worse than an absent
// gate: an absent gate leaves an obvious hole, while a gate everyone believes exists is one nobody goes
// looking for. `contrast-pairs.ts:5-9` makes exactly this argument about colour pairs, and
// `visual-baselines.ts:9-13` makes it about screenshots. This file is the third instance of it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THE LIST IS, AND WHAT IT IS NOT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-21's rule is that **coral appears only where somebody asked for it**. The list is therefore an
// inventory of KINDS — of the distinct visual devices allowed to carry the accent — and not a census of
// call sites. `<Button variant="brand">` is ONE entry however many buttons wear it; the availability
// calendar's selected day is a second entry even though it is also "a coral fill", because a booker
// reads it as a different device doing a different job.
//
// That distinction is the whole reason the number moves so rarely. Phase 10 declared 7. Phase 11
// appended 1 (a share image's rule). Phase 12 appended 2. **Phase 13 appends none**, and 13-UI-SPEC
// records that as a FINDING rather than an omission: every coral on the confirmation, payment-state,
// receipt and group surfaces is already entry 1 — `Back to availability`, `Try paying again`,
// `Find another space`, `Invite people`, `Pay now`. There is no new kind of accent use in the phase.
//
// ⚠ IT IS NOT AN ACCENT BUDGET. Nothing here counts how MUCH coral a screen shows. "Exactly one element
// in the viewport carries an accent fill" is a per-surface rendered claim and belongs to the visual
// gates; `brand-recipe.test.ts:97` records the same boundary from its side.
//
// ⚠ IT IS NOT A WHOLE-TREE SCAN. `tests/design/phase13-surface-gates.test.ts` uses this inventory to
// assert that the three Phase-13 trees introduce no ELEVENTH kind. It does not audit the rest of `src/`
// against these ten, and it must not be read as having done so — see NOT COVERED at the foot.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHERE THIS FILE LIVES — the reason `contrast-pairs.ts:11-14` and `visual-baselines.ts:60-64` give for
// theirs. `src/lib/design/` is outside the DS-13 leak gate's scanned trees
// (`config/design-leak-patterns.mjs` → `LEAK_SCAN_PREFIXES` covers `src/app/**` and `src/components/**`
// only), so this module can quote file paths and utility classes honestly without a per-line exemption.
// It is a declaration with no imports and no side effects; nothing in the app imports it, and it is
// tree-shaken out of every bundle.

/** Which phase's UI-SPEC put the entry on the list. The list is append-only; nothing has ever left it. */
export type AccentUsePhase = 10 | 11 | 12 | 13;

/** One reserved use of the accent. Every field is mandatory — a row without a reason is not a row. */
export type AccentUse = {
  /** The entry's number in the UI-SPECs' own numbering. Stable: entries are appended, never renumbered. */
  readonly id: number;
  /** The phase that declared it, so "Phase 13 appends zero" is a claim about data rather than about prose. */
  readonly declaredIn: AccentUsePhase;
  /** The device, in the words the declaring UI-SPEC used. */
  readonly device: string;
  /**
   * A repository-relative path that renders it TODAY, forward slashes, verified to exist by the test.
   *
   * ONE site rather than all of them, and deliberately the site the declaring spec named. The inventory
   * is of kinds; the path is here so a reader can go and look at one, and so a kind that has quietly
   * stopped shipping fails an assertion instead of sitting in a list forever.
   */
  readonly site: string;
  /** Why this is a use somebody asked for, rather than coral that leaked onto a surface. */
  readonly why: string;
};

/**
 * The complete list, in the UI-SPECs' own order. Phase 10's seven, Phase 11's one, Phase 12's two.
 *
 * ⚠ APPENDING TO THIS ARRAY IS A COMPILE ERROR UNTIL `AccentUseCountIsTen` MOVES WITH IT, and the alias
 * carries the number in its NAME on purpose — the `visual-baselines.ts` idiom, for the reason that file
 * states: *"A gate whose name says 27 while its constraint says 53 is a gate that reads correct and is
 * not."* `tsc` cannot catch a stale name, so it has to move by hand, in the same commit, which is the
 * one moment anybody will read the argument for the new entry.
 */
export const ACCENT_USES = [
  // ─── Phase 10 — "the complete list, nothing else" (10-UI-SPEC § Color) ──────────────────────────
  {
    id: 1,
    declaredIn: 10,
    device: '`<Button variant="brand">` — the opt-in booker/host call to action',
    site: "src/components/ui/button.tsx",
    why:
      "D-21's entry: the accent is a VARIANT a call site opts into, never the default. It is the only " +
      "entry that renders through the CVA recipe, which is why `brand-recipe.test.ts` can pin its call " +
      "sites by count while the other nine are pinned by file.",
  },
  {
    id: 2,
    declaredIn: 10,
    device: "the selected day in the availability calendar",
    site: "src/components/availability/availability-calendar.tsx",
    why:
      "the accent CARRIES MEANING here — it is the only signal of which day the grid is showing, and " +
      "the canonical accent-carries-meaning surface 10-UI-SPEC names.",
  },
  {
    id: 3,
    declaredIn: 10,
    device: "the selected day in the date-pass picker",
    site: "src/components/availability/date-pass-picker.tsx",
    why:
      "the day-pass twin of entry 2. A separate entry rather than a second site of one, because the " +
      "two pickers are separate components with separate selection models and either could lose the " +
      "recipe without the other noticing.",
  },
  {
    id: 4,
    declaredIn: 10,
    device: "the selected hour run in the slot picker, and its transient start-anchor ring",
    site: "src/components/availability/slot-picker.tsx",
    why:
      "the hour-scale form of entry 2: the run a booker has selected, plus the ring that marks the " +
      "anchor while a second endpoint is being chosen. Both are the user's own gesture reflected back.",
  },
  {
    id: 5,
    declaredIn: 10,
    device: "the spots-left chip tint — `bg-brand/10`, the `soft-accent` status tone",
    site: "src/components/availability/spots-left-chip.tsx",
    why:
      "the first tinted rather than filled accent, and the reason `status-tones.ts` carries a " +
      "`soft-accent` tone at all. Scarcity on an open-capacity listing is brand-relevant information, " +
      "not a status.",
  },
  {
    id: 6,
    declaredIn: 10,
    device: "the unread-notification dot",
    site: "src/components/notifications/notification-item.tsx",
    why:
      "a 6px dot is the smallest accent in the app and the one place a fill is the entire control. " +
      "It is never the sole signal — the row's own weight changes too.",
  },
  {
    id: 7,
    declaredIn: 10,
    device: "the current-step marker in the listing wizard",
    site: "src/app/(host)/host/listings/[id]/edit/wizard.tsx",
    why:
      "progress through a multi-step host form. The one HOST-side entry on the list, and the only one " +
      "that paints a marker rather than a control.",
  },

  // ─── Phase 11 — exactly one appended (11-UI-SPEC § Color) ───────────────────────────────────────
  {
    id: 8,
    declaredIn: 11,
    device: "the 8px `--brand` rule at the foot of the generated share image",
    site: "src/app/opengraph-image.tsx",
    why:
      "the only accent that renders OUTSIDE a browser session, in a surface with no theme and no " +
      "user. Measured as `brand on background` — an already-declared pair — so it adds a use and not " +
      "a contrast row.",
  },

  // ─── Phase 12 — exactly two appended (12-UI-SPEC § Color) ───────────────────────────────────────
  {
    id: 9,
    declaredIn: 12,
    device:
      "the `soft-accent` informational notice at PANEL scale — `bg-brand/10` surface, " +
      "`border-brand/30` edge, `text-brand` glyph, `text-foreground` ink",
    site: "src/components/availability/slot-picker.tsx",
    why:
      "already shipping and never declared until Phase 12: the slot picker's gap hint is exactly this " +
      "recipe. Phase 12 declared it and added the STATE-07 collision notice and the relaxed filter " +
      "chip as adopters. `src/components/booking/collision-notice.tsx` is the adopter the Phase-13 " +
      "trees contain.",
  },
  {
    id: 10,
    declaredIn: 12,
    device: "the suggested-window outline in the refreshed slot grid (D-55)",
    site: "src/components/availability/slot-picker.tsx",
    why:
      "mechanically entry 4's device applied to a SERVER-NAMED set rather than to a user gesture, " +
      "which is exactly why it is its own entry: the accent stops meaning 'you chose this' and starts " +
      "meaning 'the system suggests this', and that is a different promise to the reader.",
  },
] as const satisfies readonly AccentUse[];

// ---------------------------------------------------------------------------
// The compile gate
// ---------------------------------------------------------------------------

/** `T` must be exactly `true`; anything else is a compile error at the alias that uses it. */
type Assert<T extends true> = T;

/**
 * 7 (Phase 10) + 1 (Phase 11) + 2 (Phase 12) + 0 (Phase 13) = 10.
 *
 * TYPE-LEVEL rather than a `it(…)` length check, and the reason is the same one `visual-baselines.ts`
 * gives: this fails on EVERY machine, inside `npx tsc --noEmit` and inside `next build`'s own type
 * check — which is CI job 1 — rather than only where somebody remembers to run a suite. A list that
 * asserts its own length in the same file a vitest run reads is satisfied by editing two lines; a list
 * whose count is a compile constraint fails the build of everything that imports the module.
 */
export type AccentUseCountIsTen = Assert<(typeof ACCENT_USES)["length"] extends 10 ? true : false>;

/** The ids, for a gate that wants to pin WHICH uses a tree reaches rather than how many exist. */
export type AccentUseId = (typeof ACCENT_USES)[number]["id"];

// ---------------------------------------------------------------------------
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ---------------------------------------------------------------------------
//
//   • THIS IS A DECLARATION. It proves nothing about what any surface renders. The rendered claim —
//     "exactly one element in the viewport carries an accent fill" — is a picture, and it belongs to
//     the visual gates.
//   • THE TREE IS NOT AUDITED AGAINST THESE TEN. `phase13-surface-gates.test.ts` maps only the three
//     Phase-13 trees. One accent recipe outside them is already known not to map cleanly onto an entry:
//     `src/components/search/search-bar.tsx:134` renders `border-brand/30` — entry 9's EDGE without
//     entry 9's surface, glyph or ink. It is not a violation of anything asserted today, and adjudicating
//     it means deciding whether a bare tinted edge is entry 9, an eleventh entry, or a leak. That is a
//     design decision on a Phase-12 surface, recorded in `deferred-items.md` rather than settled here by
//     a plan that does not own that file.
//   • A SITE PATH IS ONE EXAMPLE, NOT A CENSUS. A kind that moved to a second file and left the declared
//     one behind fails the existence check honestly; a kind that GREW three more call sites does not
//     register here at all, by design — that is the budget question, not the list question.
//   • THE NUMBER IS COMPILE-CHECKED; THE CONTENTS ARE NOT. Nothing here can tell a correct `device`
//     string from a plausible one, and an entry whose `why` is wrong compiles.
