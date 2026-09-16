// STATE-01 — THE declared inventory of the box classes a skeleton and the real content it stands in
// for must BOTH be sized from, and the only module `tests/design/skeleton-measurements.test.ts` lets
// a `patterns/*skeleton*.tsx` file get a height, a width or an aspect ratio out of.
//
// WHY A CONSTANT AND NOT A MATCHING LITERAL IN TWO FILES. STATE-01's requirement is not "a skeleton
// exists". It is "the skeleton is built from the same measurements as the real content, so nothing
// shifts when the data arrives". Two files that happen to agree on `h-20` today satisfy the first
// reading and fail the second the moment one of them changes: the real row grows a line, the
// skeleton keeps its old box, and the layout shift the skeleton was built to prevent is now caused
// by the skeleton. A constant in one module makes "does not shift" MECHANICAL — the two sides cannot
// disagree, because there is only one side. That is the whole reason this file exists, and it is why
// the source gate bans the literals rather than merely preferring the constants.
//
// WHY THIS MODULE LIVES AT `src/lib/design/`. Same reason `contrast-pairs.ts:11-14` gives for its
// own location: the leak gate scans `src/app/**` and `src/components/**` only (see
// `config/design-leak-patterns.mjs` → LEAK_SCAN_PREFIXES), and this file necessarily NAMES the box
// utilities — `h-20`, `aspect-[4/3]`, `size-12` — that the skeleton gate forbids at a call site.
// Keeping it outside the scanned tree means it can be honest without needing a per-line exemption,
// and it puts it beside `contrast-pairs.ts`, `status-tones.ts` and `selector-contract.ts`, which is
// where this repo already keeps declared design data.
//
// STILL INSIDE TAILWIND'S SOURCE ROOT, WHICH IS LOAD-BEARING. `globals.css:28` is
// `@import "tailwindcss" source("../")`, rooted at `src/`. So every class named below is a real class
// candidate and really gets emitted. A "tidier" home outside `src/` (a `config/` module, say) would
// compile, typecheck, pass every gate — and ship skeletons with no height, because Tailwind would
// never see the strings.
//
// THE VALUES ARE MEASUREMENTS, NOT PREFERENCES. Each one is derived from the real component it has to
// match, and the derivation is the comment beside it. Changing a value here is a change to the real
// content's geometry as well; if the two ever need to differ, that is a design decision that needs
// its own constant, not an override at a call site.
//
// NOT COVERED — a real blind spot, stated so the next reader under-trusts this file:
//   • This module DECLARES box classes. It cannot tell you a component stopped using them. A skeleton
//     that imports `ROW_CARD_HEIGHT` and then writes `h-24` beside it is a violation this file is
//     structurally unable to see — that is `tests/design/skeleton-measurements.test.ts`'s job, and it
//     is why that gate asserts the ABSENCE of literals as well as the presence of the import.
//   • Nor can it tell you the constant still matches the real content. `RESULT_CARD_MEDIA` and
//     `AspectRatio ratio={4 / 3}` are two spellings of one number in two languages, and only the
//     ±2px Playwright comparison in plan `11-21` measures the rendered result. jsdom cannot see this
//     class of bug at all (D-131).

/**
 * The search/listing result card's cover media box.
 *
 * Matches `<AspectRatio ratio={4 / 3}>` in `search-result-card.tsx:177` and `listing-card.tsx` — the
 * ratio is the ONE geometry fact a card grid's skeleton has to get right, because the media block is
 * what sets every cell's height and therefore the whole grid's.
 */
export const RESULT_CARD_MEDIA = "aspect-[4/3]";

/**
 * A booking/request row's height: 80px.
 *
 * Derived, not chosen — a `Card` is `p-4` (16px top + 16px bottom) around a 48px thumbnail, which is
 * 16 + 48 + 16 = 80. This reasoning previously lived as a comment at the top of
 * `src/app/(app)/bookings/loading.tsx`, where it sized one hardcoded `h-20`; it lives here now
 * because the row and its skeleton both need it and only one of them can own it.
 */
export const ROW_CARD_HEIGHT = "h-20";

/**
 * The set of declared heights a stacked-row skeleton may be TOLD to draw — the type of
 * `RowListSkeleton`'s optional `height`.
 *
 * WHY A UNION OF DECLARED VALUES AND NOT `string`. `RowListSkeleton` stands in for three different
 * row shapes across the app, and the phase that measures the host rows will find they are not all
 * 80px. The moment the pattern accepts a height at all, the obvious call site writes the number it
 * wants inline — and a placeholder that invents its own box is precisely the drift this whole module
 * exists to prevent. Typing the prop as the declared set makes an undeclared value a COMPILE error
 * at the call site, which is the cheapest possible place to catch it.
 *
 * FIVE MEMBERS NOW, AND EVERY WIDENING HAS HAPPENED EXACTLY WHERE IT WAS SUPPOSED TO. When plan 14-01
 * declared this type it had one member and said so, and said that widening it would be an edit IN
 * THIS FILE — add the constant with its derivation, add it to this union — because the set of legal
 * row heights is decided where the heights are derived, not at whichever `loading.tsx` needed a
 * taller bar that afternoon. Plan 14-15 measured the three host row shapes against the rendered
 * routes and added them at the bottom of this file with their measurements. That is the whole
 * mechanism working: three plates now draw three different boxes and not one of the three numbers
 * was typed at a call site.
 *
 * THE HOLE THE TYPE CANNOT CLOSE, stated so the next reader under-trusts it. These are string
 * LITERAL types, so a hand-typed value that happens to equal a declared one still typechecks: the
 * compiler cannot tell a constant from its own text. That residual case is closed by two source
 * gates rather than by the type — `tests/design/skeleton-measurements.test.ts` inside the pattern
 * files, and `tests/design/loading-coverage.test.ts` at every route's loading plate. The type stops
 * the wrong number; the gates stop the right number written the wrong way.
 *
 * THE FIFTH MEMBER ARRIVED THE SAME WAY THE THIRD AND FOURTH DID (plan 18-12). `/ops` is the first
 * INTERNAL surface to compose `RowListSkeleton`, and its row is the tallest thing in the product
 * because it carries a photo mosaic. The widening is an edit IN THIS FILE — the constant with its
 * derivation, then the union — measured off the rendered route before either was written down.
 */
export type RowSkeletonHeight =
  | typeof ROW_CARD_HEIGHT
  | typeof HOST_AGENDA_ROW_HEIGHT
  | typeof HOST_REQUEST_ROW_HEIGHT
  | typeof HOST_BOOKING_ROW_HEIGHT
  | typeof OPS_QUEUE_ROW_HEIGHT;

/** The 48px thumbnail inside a row card — the term that makes `ROW_CARD_HEIGHT` 80px and not 64px. */
export const ROW_CARD_THUMB = "size-12";

/**
 * The app shell's header: 56px on mobile, 64px from `sm:` up.
 *
 * Both values are on the declared spacing ladder (`*-14` / `*-16`, the 3xl step the UI-SPEC names as
 * the desktop header height). It is a MEASUREMENT rather than a style because the header's box must
 * not move when the auth slot resolves from pending to signed-in — an assertion that needs one
 * number, not two agreeing ones.
 */
export const HEADER_HEIGHT = "h-14 sm:h-16";

/**
 * The confirmation moment's container floor: the viewport MINUS the header, at both header heights.
 *
 * DERIVED FROM `HEADER_HEIGHT` DIRECTLY ABOVE, WHICH IS WHY IT SITS HERE rather than in the Phase 13
 * block at the foot of this file. `h-14` is 3.5rem and `sm:h-16` is 4rem, so the two `calc()` terms
 * are that constant's two values restated in the only unit `calc()` can consume. A future header-height
 * change has to break in ONE place, and this is the only arrangement in which the reader changing
 * `HEADER_HEIGHT` cannot miss the second site.
 *
 * WHAT IT BUYS. 13-UI-SPEC § Spacing Scale declares this the phase's ONE exception to the ladder,
 * because it is not a spacing value at all: it is the only way BFLOW-08's "distinct confirmation
 * moment" becomes a MEASUREMENT instead of an adjective. The moment fills the viewport below the
 * chrome, so the ordinary booking detail necessarily begins below the fold.
 *
 * `svh`, NOT `vh` AND NOT `dvh` — and the unit is the whole substance of the constant:
 *   • `vh` counts the viewport as if the iOS URL bar were retracted, so it OVERSHOOTS while the bar
 *     is showing and the moment spills past the fold by the height of the bar.
 *   • `dvh` re-resolves as the bar retracts. A `min-height` expressed in `dvh` therefore GROWS
 *     mid-scroll and reflows the page under the reader's thumb — on the one surface in the product
 *     whose job is to be calm and final.
 *   • `svh` is the SMALLEST viewport, so the floor is a promise that holds in every bar state and
 *     never moves once painted.
 *
 * PHASE 11'S "`dvh`, NEVER `vh`" RULE IS NOT BEING VIOLATED HERE, and this is stated so it does not
 * read as one. That rule was written for a `max-height` on a sheet, where following the LIVE viewport
 * is exactly right — a sheet that must not exceed what the reader can see should shrink and grow with
 * the chrome. A `min-height` promise is the opposite obligation: it must hold at the smallest
 * viewport, so it takes the smallest unit. Different unit, same reasoning.
 *
 * DECLARED HERE, CONSUMED BY PLAN 13-08. It is deliberately declared before its call site exists so
 * its derivation lives beside its source; no call site in plan 13-01 uses it.
 */
export const CONFIRMATION_MOMENT_MIN_H =
  "min-h-[calc(100svh-3.5rem)] sm:min-h-[calc(100svh-4rem)]";

/**
 * The header's auth slot: the box reserved WHILE the session is still resolving.
 *
 * The compact cluster is the 32px navigation trigger plus a 12px header gap plus the 44px
 * notification bell: 32 + 12 + 44 = 88px. The bell establishes the 44px height. Its entire job is
 * to be the same size empty as it is full, so the header does not reflow when the session lands.
 */
export const AUTH_SLOT_BOX = "h-11 min-w-22";

/**
 * The auth slot's ICON control placeholder: 32 × 32px.
 *
 * The square controls in the header that ARE 32px: the `aria-label="Menu"` drawer trigger
 * (`site-chrome.tsx`'s `NavDrawer`, which reads this constant), and the compact navigation-menu
 * trigger. The header skeleton reads the same constant so its first placeholder cannot drift.
 *
 * CORRECTED IN PLAN 11-12. This docblock previously read *"the bell, and every square control that
 * sits beside it … all of which are `size-8`"*, and the bell half was FALSE:
 * `notifications/notification-bell.tsx:106` is `size-11`, a 44px touch target, and has been since
 * D-92 shipped. The number came from `11-UI-SPEC § Responsive behaviour`'s cluster arithmetic
 * (*"mode switch 96 + bell 32 + Profile 48 + 2 gaps 24 = 200px"*), which is the spec's estimate
 * rather than a measurement of the shipped control — the same direction as the spec's `lg:sticky`
 * count, which `sticky-offset.test.ts` records as 3 against the spec's 1.
 *
 * It is corrected rather than retargeted because BOTH numbers are real: the drawer trigger is
 * genuinely 32px and the bell is genuinely 44px. `NOTIFICATION_BELL_BOX` below is the second one. A
 * stated reason that has quietly become false is worse than no reason (11-09's finding 4), and this
 * one was load-bearing: it is what a reader reaches for when they need a `<Suspense>` fallback for
 * the bell, and reaching for it would have shipped a 12px layout shift on every authenticated page.
 */
export const AUTH_SLOT_ICON = "size-8";

/**
 * The notification bell's box: 44 × 44px.
 *
 * Measured off the shipped control (`notifications/notification-bell.tsx:106` — `relative size-11`),
 * not derived from the UI-SPEC's cluster estimate; see the correction on `AUTH_SLOT_ICON` above. 44px
 * is the WCAG 2.5.8 target-size minimum, which is why the bell is the one control in the cluster that
 * does not sit on the 32px icon step.
 *
 * WHY IT NEEDED ITS OWN CONSTANT, in one sentence: plan 11-12 puts the bell — and ONLY the bell —
 * behind a `<Suspense>` boundary in both group headers, so the boundary's fallback has to be the
 * bell's own box or the cluster reflows the moment the notification read lands. `AUTH_SLOT_BOX` is
 * the whole 88px slot and `AUTH_SLOT_ICON` is 32px; neither is 44, and using either would cause
 * the layout shift the auth slot exists to prevent.
 */
export const NOTIFICATION_BELL_BOX = "size-11";

/**
 * The minimum height of a boxed panel — the price breakdown, the calendar day panel, an empty state.
 *
 * A floor rather than a fixed height: panel CONTENT varies (a breakdown has three lines or five),
 * so pinning the height would truncate. What must not vary is the panel's minimum, because that is
 * what stops a short panel and its skeleton disagreeing about how much of the page they occupy.
 */
export const PANEL_MIN_HEIGHT = "min-h-40";

/**
 * A placeholder text bar: 16px.
 *
 * THE SEVENTH CONSTANT, AND IT IS NOT IN THE UI-SPEC'S LIST — recorded here rather than quietly
 * added. `11-UI-SPEC § Loading` declares six constants and then requires (AC#16) that a skeleton
 * contain ZERO literal box utilities of its own; all three prescribed skeleton shapes are "a box plus
 * two or three text bars", and none of the six can express a bar's height. Those two requirements
 * cannot both hold with six constants, so the choice was between a seventh constant and a second
 * declared exemption in the source gate. The constant wins: an exemption for `h-4` would legalise a
 * literal HEIGHT at a call site, which is the one shape T-11-GEODRIFT is about, whereas a constant
 * keeps the gate's ban absolute and leaves the fraction widths as its only exemption.
 *
 * The value matches the bars in the two shipped analogs byte-for-byte —
 * `(host)/host/listings/loading.tsx:14-15` and the tab-strip bar in `(app)/bookings/loading.tsx` —
 * so the routes that migrate onto these patterns shimmer at exactly the geometry they shimmer at
 * today. It is a PROPORTION of the placeholder rather than a measurement of any real line box (a
 * `text-sm` line is 20px, not 16), which is why the WIDTHS beside it stay literal fractions; it lives
 * here anyway because AC#16 asks for zero literal heights, not for zero unmeasured ones.
 */
export const TEXT_BAR_HEIGHT = "h-4";

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 12 — the seven values the booker path spends, declared BEFORE any surface consumes one
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every one of these is taken verbatim from `12-UI-SPEC.md § New measurement constants`, and every one
// is a DERIVATION rather than a preference — the derivation is the comment beside it, in the shape the
// nine constants above established. They are declared here, in plan 12-01, before the plans that render
// them exist, for the reason this module's header gives: a constant declared once is a value ONE plan
// can be wrong about, whereas a literal invented at nine call sites is nine independent chances to be
// wrong and no mechanism that can notice.
//
// TWO OF THEM CARRY A HAZARD, and the hazard lives here rather than only in a planning document —
// a later plan reads the constant, not the document. See `CALENDAR_CELL` and `SLOT_CHIP_BOX`.

/**
 * The gutter shared by the search result grid and its skeleton: 16px, 24px from `sm:` up.
 *
 * THE `[11-17]` ±4px DRIFT, RESOLVED MECHANICALLY (D-57). `ResultsGrid` shipped `gap-4 lg:gap-6` and
 * `CardGridSkeleton` shipped a 20px gutter — ±4px per gutter, in OPPOSITE directions either side of
 * `lg`, which is why neither side looked wrong on its own. The 20px step is retired: it is not on the
 * declared spacing ladder (D-05), and both 16px and 24px are. The `lg:` step goes with it — a third
 * gutter value at a third breakpoint is a number nobody can justify, and the grid already changes
 * column count at `sm:` and `lg:`.
 *
 * The two sides cannot disagree again, because there is only one string. That is this module's whole
 * argument, applied to the one geometry that had already drifted.
 *
 * `/host/listings` (Phase 14) composes `CardGridSkeleton` and its gutter moves with this constant. That
 * is intended: it adopts the constant when it adopts the skeleton, it does not get a second one.
 */
export const RESULT_GRID_GAP = "gap-4 sm:gap-6";

/**
 * The availability calendar's cell size: 44px.
 *
 * `ui/calendar.tsx` ships `--spacing(7)` = 28px, which is the BFLOW-05 debt MEASURED rather than
 * asserted. Overriding the variable at the call site is the whole edit: the nav buttons, the weekday
 * row and the caption all read `--cell-size` and re-size together.
 *
 * HAZARD — THE DAY BUTTON IS NOT COVERED BY THIS CONSTANT, and a later plan that assumes it is will
 * ship a 28px touch target under a 44px grid. `ui/calendar.tsx`'s day class carries `aspect-square`
 * plus `min-w-(--cell-size)`, so the day button's HEIGHT does not follow the variable the way its
 * width does (RESEARCH Pitfall 2). The day-button half goes through the `components={{ DayButton }}`
 * seam and must be MEASURED — a rendered `boundingBox()`, not a class inspection — by the plan that
 * owns it (12-09). Setting this variable is necessary and NOT sufficient.
 *
 * PAID, AND THE HAZARD WAS AN UNDERSTATEMENT (plan 12-09). The measurement found THREE more overrides,
 * not one, and the third is the one nobody predicted:
 *   • `aspect-auto h-11 w-full min-w-0` on the day button, through the `DayButton` seam;
 *   • `[&_td]:aspect-auto` on the root — the vendored ratio is on the day `<td>` as well as on the
 *     button, so a 44px button sat in a 25px cell and every week row overlapped the next by 19px;
 *   • a responsive WIDTH on the calendar itself, because `min-w-0` makes the cell `1fr` and
 *     `ui/calendar.tsx`'s `w-fit` root then collapses the whole grid to the width of the numerals —
 *     MEASURED at 25.08px per cell, i.e. WORSE than the 28px debt, with every source gate green.
 * All three live at `availability-calendar.tsx`'s Calendar call site with their derivations; the
 * numbers are in `e2e/calendar-hit-area.spec.ts`'s header. `date-pass-picker.tsx` mounts the same
 * vendored `Calendar` and did NOT receive them — see `deferred-items.md`.
 */
export const CALENDAR_CELL = "[--cell-size:--spacing(11)]";

/**
 * A slot chip's box: 44 × 80px.
 *
 * 44px is the WCAG 2.5.5 target-size figure, already this app's declared `size="touch"` (D-22) and
 * already `NOTIFICATION_BELL_BOX`. 80px is the width the shipped slot skeleton
 * (`availability-calendar.tsx`) reserves for a chip.
 *
 * HAZARD DISCHARGED (plan 12-09), and the condition it set is what makes this constant true rather
 * than aspirational. It used to read: *"this is the shimmer's box today, NOT yet the single source of
 * both — the UI-SPEC derives `w-20` from 'the real chip's minimum' and the real chip does not have
 * that minimum (`min-h-11` and no `min-w-20`, RESEARCH Pitfall 9), so whichever plan makes this the
 * single source MUST add `min-w-20` to the real chip in the SAME commit."*
 *
 * That commit is 12-09's second task. `availability-calendar.tsx`'s `CalendarDaySkeleton` now sizes
 * its eight bars from this string, and `slot-picker.tsx`'s `CHIP_BASE` carries `min-w-20` — added in
 * the same commit, with the reason at the class site. A MINIMUM rather than a fixed width on the chip,
 * deliberately: the multi-unit sub-label (`2 of 4 free`) is wider than 80px at some counts, and the
 * number the shimmer has to reserve is the floor, because the floor is what decides how many chips fit
 * on a row and therefore how tall the grid is.
 */
export const SLOT_CHIP_BOX = "h-11 w-20";

/**
 * A sticky bottom bar's height: 64px.
 *
 * A declared ladder step, and the same height as the desktop header (`HEADER_HEIGHT`'s `sm:h-16`), so
 * the app's two fixed edges match. A 44px action centred inside it needs no declared vertical padding
 * at all, which is why the bar's height is the only number the bar spends.
 */
export const STICKY_BAR_HEIGHT = "h-16";

/**
 * The bottom padding a page needs when it renders a sticky bottom bar: 80px.
 *
 * 64 (the bar) + 16 (a gap) — the SAME arithmetic as the app shell's `lg:top-20`, from the other end
 * of the viewport. It is a measurement rather than a taste call because without it the last row of
 * content sits under the bar and the page has a permanently unreachable line.
 *
 * ITS ARGUMENT POSITION IS LOAD-BEARING, BECAUSE `cn` IS tailwind-merge. This is composed through
 * `cn()` at two sites, and tailwind-merge DELETES a `pb-*` that precedes a conflicting `py-*` before
 * any CSS exists. Folding the `sm:` variant in here (`"pb-20 sm:pb-20"`) does NOT remove that hazard
 * and MAKES IT WORSE — measured, the same hoist then deletes BOTH terms instead of one, because the
 * killer is `py-*` and not the sibling `pb-*` — and it changes the classes `(detail)/layout.tsx`
 * emits for a hazard that route does not have. The rule is pinned by
 * `tests/design/clearance-merge-order.test.ts`, where that counterfactual is a watched red.
 */
export const STICKY_BAR_CLEARANCE = "pb-20";

/**
 * The checkout header's hold-countdown box: 32 × 96px.
 *
 * A RESERVATION, not a design value. `14:52` and `0:09` are different character counts, so a box with
 * a width floor is what stops the header reflowing once per session — the same argument `AUTH_SLOT_BOX`
 * makes for the session slot. Its 96px width is the countdown's measured character reservation, and
 * `h-8` is the header's compact-control step restated on the child.
 */
export const HOLD_COUNTDOWN_BOX = "h-8 min-w-24";

/**
 * The listing gallery mosaic's outer box.
 *
 * The gallery renders a different INTERNAL arrangement at one, two, three and five-plus photos; this is
 * the box all of those arrangements sit inside. Declaring the outer ratio is what lets the listing
 * route's `loading.tsx` skeleton occupy the mosaic's height before any photo count is known — the same
 * mechanism as `RESULT_CARD_MEDIA`, one level up.
 */
export const MOSAIC_ASPECT = "aspect-[16/9]";

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 13 — the booking shell, declared before the phase's first rewrite touches a container
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The phase's SECOND constant, `CONFIRMATION_MOMENT_MIN_H`, is NOT here — it lives beside
// `HEADER_HEIGHT`, the constant it is derived from, for the reason its own docblock gives. Two Phase 13
// values in two places is deliberate: proximity to the source of a derivation beats proximity to a
// phase number.

/**
 * The booking routes' page container: centred, `max-w-2xl`, `px-4`, `py-8` rising to `py-12` at `sm:`.
 *
 * A LAYOUT STRING PROMOTED OUT OF ITS CALL SITES, exactly as `RESULT_GRID_GAP` was in Phase 12 — and
 * for a sharper reason, because this string had FOURTEEN copies rather than two. It was hand-typed on
 * six status branches of `(app)/bookings/[id]/page.tsx`, on both branches of `cancel/page.tsx`, on both
 * branches of `group/page.tsx`, in all three `loading.tsx` skeletons under that segment, and in
 * `pending-payment-state.tsx`, `payment-reversed-state.tsx` and `expired-approval-state.tsx`.
 *
 * WHY A CONSTANT WHEN THE OLD ARRANGEMENT ALREADY "WORKED". `page.tsx`'s own landmark header ends with
 * the sentence *"A SIXTH branch must copy the container from `loading.tsx`."* That is an INSTRUCTION,
 * and an instruction is not a mechanism: it is obeyed exactly as long as the next author reads the
 * header, and the phase that adds a seventh branch is the phase that finds out. A constant makes
 * "every booking surface is the same box" true by construction rather than by diligence — the same
 * argument this module's header makes about skeletons, applied one level up to page containers.
 *
 * NOTHING ABOUT THE RENDERING CHANGES. Every value in the string is already a declared ladder step,
 * and the string itself is byte-identical to what it replaced at all fourteen sites. That is the
 * property that made the collapse safe to do FIRST, before any Phase 13 plan rewrites a branch: a
 * zero-pixel change cannot be confused with the rewrites that follow it.
 *
 * IT IS A CONTAINER, NOT A LANDMARK. Three of the fourteen sites opened a `<main>` around this string,
 * nested inside `(app)/layout.tsx`'s — see the comment each of those three files now carries. Adopting
 * this constant does not make an element a landmark; `(app)/layout.tsx` owns the one `main` per
 * document (D-88.1).
 */
export const BOOKING_SHELL = "mx-auto w-full max-w-2xl px-4 py-8 sm:py-12";

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 14 — the two host containers and the three box exceptions, declared before the phase's first
// restyle opens a host surface
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE SAME ARGUMENT AS THE PHASE 13 BLOCK ABOVE, ONE FLOOR HIGHER. `BOOKING_SHELL` collapsed fourteen
// hand-typed copies of the booker container. The two shells below collapse six and eight on the host
// side, and they land FIRST — before any Phase 14 plan rewrites a host surface — for the reason
// `BOOKING_SHELL`'s own docblock gives: a zero-pixel collapse that ships on its own cannot be
// confused with the restyles that follow it.
//
// A PAGE AND ITS OWN `loading.tsx` ARE THE POINT. All twelve host routes already ship a loading plate,
// and today a plate agrees with its page about the container only because somebody typed the same
// string twice. Nothing checks the two against each other, so the first edit that changes one page's
// container hands that route a plate drawing a different box than the page it stands in for — which
// is the layout shift this module was created to make impossible, applied to the container instead of
// to the row.
//
// THE THREE BOX EXCEPTIONS BELOW ARE NOT SPACING STEPS. Same distinction `SLOT_CHIP_BOX`,
// `CALENDAR_CELL` and `PANEL_MIN_HEIGHT` already make: a box dimension is derived from the thing it
// has to contain, and the derivation is the comment beside it.

/**
 * The host LIST routes' page container: centred, the wide list measure, 16px of horizontal padding,
 * 40px of vertical.
 *
 * SIX HAND-TYPED COPIES OF ONE STRING, AND HALF OF THEM ARE LOADING PLATES. It is written on
 * `/host/requests`, `/host/bookings` and `/host/earnings`, and again on each of those three routes'
 * `loading.tsx`. Six copies is three chances for a page and its own plate to disagree, and the
 * disagreement is invisible in review because no single file contains both halves of it.
 *
 * NOTHING ABOUT THE RENDERING CHANGES. The string is byte-identical to what it replaces at all six
 * sites, so adopting it is a provably zero-pixel edit — the property that lets it be verified by
 * `git diff` alone rather than by a screenshot on a machine that cannot take one.
 *
 * IT IS A CONTAINER, NOT A LANDMARK. `(host)/layout.tsx` owns the one `main` per document (D-88.1);
 * adopting this constant does not make an element a landmark, exactly as `BOOKING_SHELL` records for
 * the booker side.
 */
export const HOST_LIST_SHELL = "mx-auto w-full max-w-4xl px-4 py-10";

/**
 * The host PANEL routes' page container: centred, the narrower form measure, 16px of horizontal
 * padding, 32px of vertical.
 *
 * THREE NEAR-TWINS RATHER THAN SIX TWINS, which is the harder case and the reason this docblock has
 * to say something `HOST_LIST_SHELL` does not. Across eight sites there are three spellings: the
 * dashboard and its plate use a 48px vertical rhythm; the availability route and its plate use 32px
 * plus a child-spacing utility; the wizard's `edit` and `new` routes and their plates use 32px. One
 * intent, three strings, and no two of them can be told apart by reading any single file.
 *
 * ONE SURFACE RENDERS DIFFERENTLY, AND IT IS `/host`. The dashboard moves from the 48px vertical
 * rhythm to the 32px one the other three panel routes already share. `BOOKING_SHELL` is able to claim
 * that nothing about the rendering changes; this constant cannot, so it does not claim it. Ending a
 * duplication honestly means naming which side moved, and the side that moved is the one that was
 * alone.
 *
 * THE AVAILABILITY ROUTE'S CHILD-SPACING UTILITY IS NOT FOLDED IN. Vertical rhythm BETWEEN a
 * container's children is not a measurement of the container, and folding it in would hand a rhythm
 * to four routes because one of them wanted it. It stays at that call site, beside this constant.
 */
export const HOST_PANEL_SHELL = "mx-auto w-full max-w-3xl px-4 py-8";

/**
 * The week-at-a-glance track: 160px tall, one per weekday column.
 *
 * DERIVED FROM ARITHMETIC, NOT FROM TASTE. The track carries a whole 24-hour day, so the per-hour
 * advance is 160 ÷ 24 = 6.67px, and a one-hour open window — the smallest thing the strip can be
 * asked to draw — renders as a bar 6.67px tall. The two shorter steps on the ladder fail on the same
 * arithmetic rather than on preference: a 64px track gives 2.67px per hour and a 48px track gives 2px
 * per hour, at which a one-hour window is a hairline. The strip's only job is to make a mistyped
 * window visible before the host saves it, and a hairline does not do that job.
 *
 * THE TRACK IS NEVER FULL. The hours editor's option list stops at 23:00, so no window can close at
 * midnight and the tallest bar the strip can draw is 23/24 of the track. Nothing about the height
 * depends on that; it is recorded so a reader measuring a rendered column against 160px knows why
 * the remainder is there and does not go looking for a rounding bug.
 *
 * IT IS A FIXED HEIGHT AND NOT A FLOOR, which is the one way it differs from `PANEL_MIN_HEIGHT` at
 * the same 160px. Every column has to share one scale or two weekdays' bars are not comparable, and
 * comparing them across the week is the entire reading of the strip.
 */
export const HOURS_STRIP_TRACK = "h-40";

/**
 * The wizard step rail's marker box: 24px square.
 *
 * THE SHIPPED VALUE, RETAINED — AND NOW LOAD-BEARING. The markers are inert elements inside an
 * ordered list today, so 24px was a visual choice with nothing resting on it. Phase 14 turns the
 * visited markers into real controls, at which point 24px stops being a preference and becomes the
 * WCAG 2.5.8 AA target-size bar that `e2e/overflow-320.spec.ts` asserts as its `TARGET_FLOOR_PX`. It
 * is written down here so the number cannot be tuned by somebody who does not know that a
 * conformance test now depends on it.
 *
 * THE SPACING EXCEPTION IS NOT NEEDED, WHICH IS WHY THIS VALUE AND NOT A LARGER ONE. The rail's
 * existing 8px gap puts adjacent marker centres 32px apart, so the AA bar is met directly rather than
 * through the undersized-target-with-clearance allowance. Measured at the 320px floor: nine markers
 * at 24px plus eight gaps at 8px is 280px against 288px of available content width, so the rail fits
 * on one line and the wrapping contingency does not arise.
 */
export const STEP_MARKER_BOX = "size-6";

/**
 * A request row's status column: 112px, and it is a CEILING rather than a size.
 *
 * ⚠ THE FOURTH BOX EXCEPTION, AND IT IS NOT IN 14-UI-SPEC'S LIST OF THREE — recorded here rather than
 * quietly added, exactly as `TEXT_BAR_HEIGHT` and `AUTH_SLOT_BOX` were before it. It exists because
 * plan `14-06` MEASURED the consequence deferred item `[14-03]` predicted, and the measurement was
 * worse than the prediction.
 *
 * WHAT WAS MEASURED (Chromium, 320px, court, plan 14-06 — the numbers are in
 * `e2e/host-inbox-hierarchy.spec.ts`'s own report):
 *
 *     status column  235.34px   ← driven entirely by the D-99 reason line
 *     the countdown   84.20px   ← what the column actually exists to hold
 *     space title      8.66px   ← what was left
 *
 * `row-card.tsx` renders the status/trailing column as `flex shrink-0 …`, so it keeps its max-content
 * width at every viewport and the `min-w-0 flex-1` title column beside it absorbs the whole squeeze.
 * That is unremarkable while the slot holds `Expires in` over `23h 45m`. Plan `14-03` also moved the
 * D-99 cap-shortened reason line into it — *"Session starts in 3h — respond soon."*, a full SENTENCE —
 * and a sentence in a column that cannot shrink is a sizing authority. 8.66px is not a title
 * "truncating hard": it is an ellipsis, and a row whose space cannot be identified is not a row a host
 * can triage. The venue-local window beneath it wraps in the same 8.66px, one word per line.
 *
 * THE DERIVATION. At the declared 320px floor (D-131): 320 − 32 (the list shell's horizontal padding)
 * − 32 (`CardContent`'s) = 256px of card content, − 12 (the header row's gutter) = **244px** shared by
 * the title column and this one. 112px is the smallest step on the ladder that clears the measured
 * 84.20px countdown with enough headroom for the grove theme — whose heading step is 24/700 against
 * court's 20/600, so its digits line is materially wider — and 244 − 112 = **132px** leaves the title
 * the LARGER share. That split is the rule this constant encodes: the deadline is the row's headline
 * and outranks the money and the guest name (D-146), but it does not outrank knowing WHICH space is
 * being asked for.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It does not stop the reason line wrapping — it makes it wrap, which
 * is correct: the reason is supporting text and three short lines of it cost nothing, whereas a
 * deadline broken across two lines is harder to read at a glance than the money it is supposed to
 * outrank. The countdown itself must therefore always fit, and that is asserted rather than assumed —
 * `e2e/host-inbox-hierarchy.spec.ts` case 3 fails if this value is ever tightened past the countdown's
 * own max-content width.
 *
 * WHY NOT RELAX `shrink-0` ON THE PATTERN INSTEAD. That is a change to all four `RowCard` adopters to
 * fix one of them, and the other three put a badge or an amount in that slot — content that should keep
 * its max-content width and would start truncating for no reason. `[14-03]`'s own note reaches the same
 * conclusion and asks for exactly this: the cap declared here, with its derivation, applied to the
 * status CONTENT at the one call site that needs it.
 */
export const REQUEST_STATUS_CAP = "max-w-28";

/**
 * The publish checklist's side column, from the large breakpoint up: 288px.
 *
 * DERIVED FROM THE GRID TRACK BELOW, WHICH IS THE AUTHORITY. `WIZARD_CHECKLIST_GRID` names that track
 * in root-relative units; 18rem is 288px, which is the `w-72` step on the ladder. The width and the
 * track are ONE NUMBER WRITTEN TWICE — a column that does not fill its own track leaves a gap nobody
 * chose, with no visible cause — so the two are declared beside each other here rather than in the
 * two files that render them. This is the argument `HEADER_HEIGHT` and `CONFIRMATION_MOMENT_MIN_H`
 * already make about a value a future edit has to be able to break in exactly one place.
 *
 * WHY 288 AND NOT MORE. At the large breakpoint itself the shell is 1024px wide: 1024 − 32 of
 * horizontal container padding − 288 of column − 32 of grid gap leaves 672px of form column, against
 * the 736px the wizard has today. Measured at exactly 1024px rather than estimated, because that
 * boundary is where the two-column grid engages and therefore where the form column is narrowest.
 *
 * VARIANT-PREFIXED ON PURPOSE. Below that breakpoint the checklist is not a column at all — it is a
 * collapsible summary above the form — so an unprefixed width would pin a box that does not exist at
 * that viewport.
 */
export const WIZARD_CHECKLIST_COL = "lg:w-72";

/**
 * The wizard's two-column grid template from the large breakpoint up: a form column that is free to
 * shrink, and a fixed 18rem track for the checklist column above.
 *
 * THE OWNER OF THE 288px NUMBER. `WIZARD_CHECKLIST_COL` is derived from this track and not the other
 * way round: the track is what positions the column, and a column whose width disagrees with its
 * track is a defect whose cause is nowhere on screen. It is a separate export rather than folded into
 * the width because the two strings are rendered by two DIFFERENT elements — the grid parent and the
 * side column — and a constant only one element uses is not a constant that keeps two in agreement.
 *
 * THE DISPLAY AND GAP UTILITIES ARE DELIBERATELY NOT IN HERE. Turning the container into a grid, and
 * the 32px gutter between the two columns, are ordinary ladder steps that belong at the call site.
 * Only the track carries a derived value that must not drift.
 *
 * ⚠ THIS STRING CANNOT BE ASSERTED AGAINST THE COMPILED STYLESHEET, and the reason is mechanical
 * rather than stylistic. `tests/design/helpers/compile-css.ts` validates every safelist entry against
 * a character allow-list that does not admit a comma, and the track's minimum/maximum function takes
 * its two arguments comma-separated — so `compileGlobalsCssWith` THROWS on this class instead of
 * emitting it. Verified by running the helper on it. Any gate that wants to check this value must
 * therefore assert the class string IN SOURCE — that this constant is the one imported and rendered —
 * and must not report itself as having verified the CSS. Widening that allow-list is a change to a
 * security boundary and needs the argument its own docstring demands; it is not a Phase 14 edit.
 */
export const WIZARD_CHECKLIST_GRID = "lg:grid-cols-[minmax(0,1fr)_18rem]";

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 14 · plan 14-15 — THE THREE HOST ROW HEIGHTS, MEASURED AGAINST THE RENDERED ROUTES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHY THREE CONSTANTS AND NOT ONE. `ROW_CARD_HEIGHT` above is 80px and it is CORRECT — for the shape
// it describes, which is a row whose tallest element is a 48px thumbnail. None of the three host row
// shapes is that row. Two of them have no thumbnail at all, all three carry a status column, two
// carry a description list, and two can carry an actions row. Measured on the real routes with real
// seeded data (table below), the three resting shapes are 132px, 254px and 196px at the declared
// 320px floor. One bar cannot be three boxes that differ by 122px, and a plate drawing 80px against
// a list that arrives at 254px IS the layout shift the loading-state family exists to remove — it is
// simply pointing the other way from the defect `[11-08]` recorded.
//
// ⚠ `[11-08]`'s "pure win at adoption" DOES NOT APPLY HERE, and its own closing note says so: that
// figure is scoped to the RESTING MEDIA configuration (a 48px thumbnail, no body, no actions). All
// three host rows have already adopted the shared row pattern and that pattern already zeroes the
// card's own block padding, so the 112-against-80 defect is discharged on the host side. What is
// left is the opposite mismatch, and it is much larger.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// THE MEASUREMENT, SO A LATER READER CAN REPRODUCE IT RATHER THAN TRUST IT
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// Instrument: Playwright Chromium driving the dev server; one signed-up host with an activated payout
// wallet, one published listing and five bookings (two confirmed today, one confirmed in three days,
// two pending requests). Each row's box read with `getBoundingClientRect()` after `networkidle`.
// Date: 23 August 2026. The harness was a throwaway spec; the numbers it produced are now pinned by
// `e2e/skeleton-geometry.spec.ts`, which re-seeds and re-measures them on every run.
//
//   shape                  route             320px    1280px   the bar every plate drew before this
//   ────────────────────── ───────────────── ──────── ──────── ───────────────────────────────────
//   agenda row             /host             132.00   72.00    80
//   request row            /host/requests    254.05   83.02*   80
//   host booking row       /host/bookings    196.00   37.02*   80
//
// ⚠ THE THIRD ROW WAS RE-MEASURED BY PLAN `[14-16]` AND IS NOW 176.00 / 36.52. Nothing about the
//   component changed: 196/37.02 were taken against a geometry fixture that positioned its bookings
//   relative to `now()`, so the venue-local window label — and therefore the meta line's wrap count
//   at 320px, at 20px a line — was a different string on a different day. The fixture now names
//   absolute venue-local days and the numbers are literals. See `HOST_BOOKING_ROW_HEIGHT` below for
//   the distribution that decided which of the shape's two heights the constant declares. The 14-15
//   figures are left in place rather than overwritten so the correction is visible.
//
// ⚠⚠ THE FIRST ROW MOVED ON 24 AUGUST 2026, AND FOR A PRODUCT REASON RATHER THAN A MEASUREMENT ONE
//   (quick `260824-ej2`). The PM's ruling on UAT finding F-2 — *"show the timezone only when it
//   varies"* — drops the ` ({City} time)` suffix from a host LIST row whenever the rendered rows all
//   sit on one venue clock. That is fourteen fewer characters in the one paragraph on these cards
//   that is free to wrap, so the wrap counts had to be re-measured with `[14-16]`'s own instrument
//   before any number here could be trusted. Re-measured 24 August 2026, same routes, same fixture:
//
//     shape                  route             320px            1280px   what moved
//     ────────────────────── ───────────────── ──────────────── ──────── ─────────────────────────
//     agenda row             /host             112.00 (was 132) 72.00    one meta line fewer
//     request row            /host/requests    254.05           83.02    nothing — see below
//     host booking row       /host/bookings    176.00           36.52    nothing — see below
//
//   Only the agenda row's narrow value moved, and the two that did not each did not move for a
//   REASON that is now measured rather than assumed — both arguments are in the constants' own
//   docblocks. Nothing here was widened to absorb the change.
//
//   * ABOVE THE MEDIUM BREAKPOINT THESE TWO ROUTES DO NOT RENDER A ROW CARD AT ALL. Both pages hide
//     the card stack and render a TABLE in its place. So the starred numbers are the height of the
//     visible TABLE ROW, which is what a reader at that width is actually waiting for. Measuring the
//     card there would have measured a `display:none` subtree — whose box is zero, which would have
//     made every comparison 0-against-0. That is the trap `e2e/host-inbox-hierarchy.spec.ts` recorded
//     from the other side and the reason the visible tree is the one measured.
//
// THAT IS WHY TWO OF THE THREE CONSTANTS BELOW CARRY A BREAKPOINT. `HEADER_HEIGHT` is the shipped
// precedent for a declared measurement with a variant in it; here the variant is not a taste choice
// but the exact width at which the page swaps one tree for another.
//
// WHAT NO CONSTANT HERE CLAIMS. The plate stacks its bars on a 12px rhythm and a table row has no gap
// beneath it, so making the ROW heights agree does not make the two TOTALS agree. The contract these
// constants carry — and the one the geometry spec asserts — is per-row, at 320 and at 1280, which is
// what 14-UI-SPEC's falsifiable asks for. The totals are not claimed and must not be read in.

/**
 * The host dashboard's agenda row: 112px below the small breakpoint, 72px at and above it.
 *
 * THE SLOT CONFIGURATION IT DESCRIBES: a title, a meta line and a status badge. No thumbnail, no
 * description list and no actions — the one host row in this phase whose actions slot is empty,
 * because the dashboard's agenda answers "who is coming" and offers no decision to take on the row.
 *
 * MEASURED, NOT DERIVED: 112.00px at 320 and 72.00px at 1280, on `/host` with confirmed sessions
 * seeded for today. 72 is the unwrapped floor and it is arithmetic anyone can check — the card's own
 * 16px top and bottom padding around a 20px title line and a 20px meta line. 112 is that floor plus
 * two further wrapped meta lines at 20px each.
 *
 * ⚠ THE NARROW VALUE IS CONTENT-DEPENDENT, AND THAT IS RECORDED RATHER THAN HIDDEN. The meta line is
 * the space title joined to a venue-local window label, and how many lines it wraps to at 320px is a
 * function of BOTH — how long the space's title is, and how wide the composed date happens to render.
 * One further wrapped line is 20px. Every other constant in this module describes a box that CSS
 * fixes; this one describes a box that text decides. The floor (72) is exact at every width where the
 * meta fits one line.
 *
 * ⚠⚠ THE DATE HALF OF THAT DEPENDENCE WAS UNDER-STATED UNTIL PLAN `[14-16]` MEASURED IT. With the
 * geometry spec's ORIGINAL seventeen-character title the row rendered its declared height on only
 * 554 of the 2,604 date tokens `EEE, MMM d` can ever compose and 20px less on the other 2,050 — a
 * constant that described 21% of dates. `[14-16]` replaced the title with a twenty-four-character
 * one chosen from that same sweep, at which every date token lands on ONE wrap count. That title is
 * still the fixture's, and it is still on a plateau — see below.
 *
 * ⚠⚠⚠ 132 → 112 ON 24 AUGUST 2026 (quick `260824-ej2`), AND THE CAUSE IS A PRODUCT RULING, NOT A
 * DRIFT. The PM's answer to UAT finding F-2 — *"show the timezone only when it varies"* — drops the
 * ` ({City} time)` suffix from a host list row when the rendered rows all share one venue clock. The
 * dashboard's fixture is a single-zone host, so its meta line lost fourteen characters and now wraps
 * to THREE lines where it wrapped to four. RE-MEASURED WITH `[14-16]`'s OWN INSTRUMENT rather than
 * re-declared from the one label on screen: the paragraph was swapped in place over the full cross
 * product of every date token (2,604) against five window spellings — 13,020 labels — for nine
 * candidate title lengths.
 *
 *     "Geo Courts Poblacio"      (19)   3 lines / 112px  ×13,020
 *     "Geo Courts Poblacion On"  (23)   3 lines / 112px  ×13,020
 *     "Geo Courts Poblacion One" (24)   3 lines / 112px  ×13,020   ← the fixture's title, unchanged
 *     "…Poblacion Oneswi"        (27)   3 lines / 112px  ×13,020
 *     "…Poblacion Oneswit"       (28)   3 lines / 112px  ×12,885 · 4 lines / 132px ×135
 *
 * So 112 is a property of the fixture on every date, exactly as 132 was, and the fixture's title did
 * NOT have to move to keep that true — it sits mid-plateau with at least five characters of margin
 * below and three above, which is MORE headroom than the longer label left it.
 *
 * THE BREAKPOINT IS WHERE THE MEASUREMENT SETTLES, not where somebody drew a line. Re-measured across
 * the ladder with the shorter label: 112 at 320, 360 and 375; 92 from 414 to 560; 72 at 639 and every
 * width above. The row therefore reaches its floor BELOW the small breakpoint (640px) rather than at
 * ~700 as it did with the suffix, so `sm:h-18` is now exact from 640 up instead of over-claiming
 * 20px in the 640-700 band. The narrow bar over-claims 20px from 414 to 639, where the row has
 * already shrunk to 92 — the same band-below-the-settling-width trade the longer label made, one
 * step shallower. Both directions are measured, accepted, and pinned at the two widths the geometry
 * spec asserts, so a later change to either is a visible failure rather than a silent drift.
 */
export const HOST_AGENDA_ROW_HEIGHT = "h-28 sm:h-18";

/**
 * The request inbox's row: 256px below the medium breakpoint, 84px at and above it.
 *
 * THE SLOT CONFIGURATION IT DESCRIBES, BELOW THE BREAKPOINT: a title, a meta line, a status column
 * holding the lead-emphasis countdown and its reason line, a two-term description list (guest, guest
 * pays) and a full-width actions row of touch-height approve/decline buttons. It is the tallest row
 * shape in the product.
 *
 * ABOVE THE BREAKPOINT IT DESCRIBES A TABLE ROW, because a table is what the page renders there. The
 * card stack is hidden and a six-column table takes its place; the reader is waiting for a table row,
 * so a table row is what the placeholder claims.
 *
 * MEASURED, NOT DERIVED: 254.05px at 320 — and, unusually, at every width below the breakpoint, since
 * neither the description list nor the actions row reflows as the viewport grows — and 83.02px for
 * the taller of the two table rows at 1280. The declared values are the two nearest steps on the
 * spacing ladder: 256 (a 1.95px over-claim) and 84 (a 0.98px over-claim). Both are inside the 4px
 * 14-UI-SPEC makes falsifiable.
 *
 * ⚠ THIS SHAPE DID NOT MOVE UNDER THE 24 AUGUST 2026 "SHOW THE TIMEZONE ONLY WHEN IT VARIES" RULING
 * (quick `260824-ej2`), AND THAT IS MEASURED RATHER THAN ASSUMED. The shortened label wraps to TWO
 * meta lines here where it wrapped to three — so the meta paragraph genuinely got 20px shorter — and
 * the row still measures 254.05px, because its 320px height is set by the status column, the
 * two-term description list and the touch-height actions row, none of which the label touches. That
 * is the same insensitivity `[14-16]` measured from the other side (254.05px on all 13,020 labels
 * and thirteen reason-line spellings); re-swept against the shortened label it is 254.05px on all
 * 13,020 again, one distinct value. The geometry spec's declared WRAP COUNT for this shape moved
 * from 3 to 2 with the ruling; the height did not.
 *
 * WHY THIS SHAPE MOVED UNDER THE PHASE, and why an older number would be stale: 14-03 gave the row
 * its terminal, deadline-led form, and 14-06 capped its status column and moved the desktop table
 * onto the same lead emphasis. This measurement was taken after both, and dated.
 *
 * ⚠ THIS SHAPE DID NOT MOVE UNDER THE 24 AUGUST 2026 *"WRAP THE SPACE COLUMN"* RULING EITHER
 * (quick `260824-ght`), AND IT IS THE SECOND TIME THIS ROW HAS ABSORBED A LABEL CHANGE WITHOUT
 * MOVING. That ruling was applied to this inbox as well, because it measured 227px past its
 * container at 1280px — worse than the finding that prompted it. The wrap takes that to 94px and
 * brings the Approve control inside the clip edge; the declared 84px table row is unchanged at
 * 83.02px, for the same structural reason as above: the row's height is the lead countdown and its
 * D-99 reason line, not the cells beside them.
 *
 * ⚠⚠ THE ONE PLACE IT CAN MOVE, RECORDED RATHER THAN PINNED. This table still overflows after the
 * wrap, so its Space column sits at MIN-CONTENT — the width of the longest word in any title on
 * screen. A title long enough to break into FOUR lines there exceeds the countdown's own height:
 * measured against the seeded catalogue, `QC Strength & Conditioning Gym` renders a 97px row against
 * this 84px bar while the other four titles stay at 83.02px. That outcome is deliberately NOT
 * asserted anywhere — a min-content pin is a pin on where a browser happens to break a title between
 * two words, which the type scale moves and this file's subject does not. What IS asserted is the
 * SPLIT that produced it: `e2e/skeleton-geometry.spec.ts`'s `(title)` case pins that the Space cell
 * on this route wraps and the When cell beside it does not.
 */
export const HOST_REQUEST_ROW_HEIGHT = "h-64 md:h-21";

/**
 * The host bookings list's row: 176px below the medium breakpoint, 36px at and above it.
 *
 * ⚠ CORRECTED FROM 196 BY PLAN `[14-16]`, AND THE CORRECTION IS THE INTERESTING PART. The row's card
 * is 136px of boxes CSS fixes — 16 padding + 20 title + 12 gap + 72 description list + 16 padding —
 * plus its meta line, which is a `text-sm` paragraph free to wrap at 20px a line. So at the 320px
 * floor this one shape has exactly TWO heights, and which one it takes is decided by the rendered
 * WIDTH of the venue-local window label: the weekday name, the month name, whether the day-of-month
 * is one digit or two, and how many digits the two hours spend.
 *
 *     2 meta lines → 176px          3 meta lines → 196px
 *
 * MEASURED (Chromium, 320px, 24 August 2026) over the full cross product of every date token
 * `EEE, MMM d` can compose — 7 weekdays × 12 months × 31 days = 2,604 — against five window
 * spellings covering both digit-length classes on both bounds. 13,020 labels; two outcomes, never a
 * third:
 *
 *     "8:00 AM – 9:00 AM"     176 ×2,050   196 ×554
 *     "9:00 AM – 11:00 AM"    176 ×2,072   196 ×532
 *     "10:00 AM – 12:00 PM"   176 ×1,031   196 ×1,573
 *     "11:00 AM – 1:00 PM"    176 ×1,761   196 ×843
 *     "6:00 PM – 8:00 PM"     176 ×2,103   196 ×501
 *                             ──────────   ──────────
 *                             9,017 (69%)  4,003 (31%)
 *
 * 14-15's 196 was not wrong when it was taken — it was the height of a three-line label, and the
 * geometry fixture happened to compose one that day because it seeded the booking as "today + 3
 * days". The next day it composed a two-line one and the gate went red by exactly 20px with nothing
 * in `src/` having moved. That is deferred item `[14-16]`.
 *
 * WHY 176 WAS THE RIGHT SINGLE NUMBER, given the shape then genuinely had two. It was the more
 * common outcome (69% of labels) — and, decisively, it is ALSO the height this row takes at 360, 375
 * and 414px, where the label always fits two lines whatever it says. So `h-44` was exact from 320 to
 * ~479 for most rows and over-claimed 20px from ~480 to the breakpoint, whereas `h-49` was exact only
 * at 320 and only for the minority of labels. One bar cannot be two boxes; this was the one that was
 * right across more of the ladder.
 *
 * ⚠ AND AS OF 24 AUGUST 2026 THE SHAPE HAS EXACTLY ONE HEIGHT AT 320, SO THAT ARGUMENT IS NOW MOOT
 * AND THE NUMBER IS UNCONDITIONAL (quick `260824-ej2`). The PM's F-2 ruling — *"show the timezone
 * only when it varies"* — drops the ` ({City} time)` suffix on a single-zone list, and this route's
 * card renders the window label ALONE in its meta paragraph (the space title is the card's TITLE
 * here, not part of the meta). Re-swept with the same instrument, the same 2,604 date tokens and the
 * same five window spellings — 13,020 labels — against the shortened label:
 *
 *     every one of the five window spellings, every date token   2 lines / 176px  ×13,020
 *
 * ONE outcome, never a second. So the 31% of dates that used to render 196px no longer exist, the
 * declared value did not have to move, and the calendar-coupling `[14-16]` closed by seeding
 * absolute instants is now closed a second time at the source: there is no longer a date this row
 * can be seeded on that changes its height. The two absolute-instant rows in
 * `e2e/skeleton-geometry.spec.ts`'s `(wrap)` case are retained — they now assert that ONE height
 * from two different absolute days rather than two heights from two — and the 20px step every
 * derived expectation in that block rests on is measured there in its own case.
 *
 * THE SLOT CONFIGURATION IT DESCRIBES, BELOW THE BREAKPOINT: a title, a meta line, a status badge and
 * a three-term description list (guest, guest pays, payout). NO actions and NO trailing line — and
 * that is the correction this measurement makes to 14-UI-SPEC's own sketch of case (c), which
 * described this shape as carrying both. It does not. The row's actions render only while a booking
 * is still awaiting the host's answer, and its trailing line only when a cancelled booking has a
 * refund to state. The RESTING row on the upcoming tab — a confirmed booking — has neither.
 *
 * ABOVE THE BREAKPOINT IT DESCRIBES A TABLE ROW, for the same reason the request constant does: the
 * page hides the card stack there and renders a table.
 *
 * MEASURED, NOT DERIVED: 176.00px at 320 and 36.52px for the resting table row at 1280, on
 * `/host/bookings` with the fixed-instant confirmed booking and two still-pending ones seeded. The
 * declared values are 176 (exact) and 36 (a 0.52px under-claim).
 *
 * ⚠ THE ACCEPTED, MEASURED DEVIATION. A row whose booking is still awaiting an answer carries the
 * approve/decline actions, and those cost a FLAT 56px at 320 and 25px at 1280 — so a pending row is
 * 232px or 252px at 320 (the same two-versus-three-line fork as above, plus 56) and 61px at 1280.
 * The list mixes both shapes, so no single bar can be right for every row it will hold, and drawing
 * the taller shape instead would over-claim on the confirmed rows that are the ordinary case on this
 * tab. The delta is pinned in `e2e/skeleton-geometry.spec.ts` as a DERIVATION — the actions' flat
 * cost plus that row's own observed wrap count — rather than as a band, because a band wide enough
 * to absorb a wrapped line is a band wide enough to absorb the defect the plate exists to prevent.
 * The dishonest fix that was explicitly NOT taken: reducing the plate's row COUNT until the totals
 * happen to line up while every individual row still disagrees.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 * ⚠ 24 AUGUST 2026 — THE DESKTOP VALUE IS NOW A FLOOR RATHER THAN A FLAT NUMBER (quick `260824-ght`)
 * ═══════════════════════════════════════════════════════════════════════════════════════════════
 *
 * F-2's second and final ruling — *"wrap the space column"* — lets this route's Space cell wrap so
 * the table stops running past its container. THE CONSTANT DID NOT MOVE and the reasoning for that
 * is the point of this block, because the obvious reading of the change is that it should have.
 *
 * WHAT THE WRAP DOES TO THE SHAPE. The container is a fixed 864px (`HOST_LIST_SHELL`) and every
 * other column on the route is still non-wrapping, so the Space column became the RESIDUAL:
 *
 *     Space = 864 − Guest − When − Status − Payout − Actions
 *
 * A title wraps exactly when its rendered width plus the cell's 16px of padding exceeds that. So the
 * desktop row is TWO-VALUED — 36.52px on one line, 57px on two — and which one a host sees is a
 * property of THEIR OWN space names, not of this row. Measured at 1280px against the seeded
 * catalogue's five real titles: `Sunlit Yoga Studio` renders one line, the other four render two.
 *
 * WHY 36 IS STILL THE DECLARED VALUE, and it is the same argument the 320px fork above settles with:
 *
 *   • IT IS EXACT IN MOST OF THE STATES THIS PLATE COVERS. The `Actions` column only exists while a
 *     row is still awaiting the host's answer, and it is 199px wide. Remove it — the PAST tab, or an
 *     upcoming tab with nothing pending — and the residual column grows to 271.6px, at which NONE of
 *     the catalogue's titles wrap, including the 30-character one. Measured across the desktop
 *     ladder: with no pending row the resting row is 36.52-37.02px at every width from 800 up.
 *   • IT NEVER OVER-CLAIMS. Declaring 56 would reserve a box the content does not fill on the past
 *     tab, on a short-titled catalogue, and on any list with no request in it — and a plate that
 *     draws MORE than arrives makes the page jump upwards, which is the same defect pointing the
 *     other way. `[14-15]`'s own rule for this shape was to take the value that is right across more
 *     of the ladder.
 *   • THE TALLER VALUE IS NOT A PROPERTY OF THE ROW AT ALL. It depends on the longest title in the
 *     list AND on whether some other row is pending. A single constant cannot state that; a pinned
 *     case can, and `e2e/skeleton-geometry.spec.ts`'s `(title)` case does — seeding both outcomes on
 *     two listings and asserting each, with the sweep that says neither is one date's luck.
 *
 * ⚠ THE MEASURED, ACCEPTED DEVIATION THIS ADDS, stated rather than discovered. On the upcoming tab,
 * with a pending row present and a long space name, the resting row is 57px against this 36px bar —
 * a 21px per-row under-draw. It is the same class as the pending-actions deviation already recorded
 * above, and it is pinned the same way rather than absorbed into a tolerance.
 *
 * ⚠⚠ AND ONE BAND WHERE THE WRAP IS UNAVOIDABLE. Between the `md:` breakpoint (768) and 928px the
 * shell is narrower than its 864px cap, so the residual column falls to its min-content (~101px) and
 * titles wrap two, three or four lines — 56.5px to 97px per row, against this 36px bar. Measured, not
 * modelled, and the trade is measured from both sides on the same fixture (one long title, one
 * pending row), which is what makes it a trade rather than a regression:
 *
 *     container overflow    768px    800px    864px    928px and up
 *     ──────────────────    ─────    ─────    ─────    ────────────
 *     before the ruling      193      161       97          65
 *     after                   60       28        0           0
 *
 * So the wrap strictly reduces the horizontal clip at every desktop width — it can only ever shrink
 * one column — and it converts what is left of it into vertical growth, which a page can scroll and a
 * clipped control cannot.
 */
export const HOST_BOOKING_ROW_HEIGHT = "h-44 md:h-9";

// ═════════════════════════════════════════════════════════════════════════════════════════════════
// PHASE 18 — THE FITOUT OPS CONSOLE (plan 18-12). TWO CONSTANTS, ONE ROUTE.
// ═════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The `/ops` review queue's page container: centred, the WIDE list measure, 16px of horizontal
 * padding, 40px of vertical.
 *
 * `max-w-5xl` (1024px) RATHER THAN `HOST_LIST_SHELL`'s `max-w-4xl` (896px), AND THAT DIFFERENCE IS
 * THE WHOLE DERIVATION. Every other list surface in this product puts text and a 48px thumbnail in a
 * row; this one puts a PHOTO MOSAIC in one, because OPS-04's question is "is this a real space" and
 * the only honest evidence for it is the photographs. At 896px the row's content box is 864px, and
 * `PhotoGallery`'s five-cell template spends roughly two thirds of it on the hero with the remaining
 * four cells sharing a ~280px column — small enough that a reviewer is judging thumbnails rather
 * than a space, which defeats the point of putting them on the row at all. `max-w-5xl` is the next
 * step on the declared container ladder and buys 128px, all of it to the mosaic.
 *
 * NOT WIDER THAN THAT. `max-w-6xl` is the HEADER's cap (`site-chrome.tsx`), and a page container
 * equal to the header's would put the queue's own edges exactly under the wordmark's — the one width
 * at which "the content is inside the shell" stops being visible. The evidence `<dl>` is also
 * label-left / value-right, and a description list wider than about 1000px reads as two disconnected
 * columns.
 *
 * IT IS A CONTAINER, NOT A LANDMARK — `HOST_LIST_SHELL`'s rule, unchanged. `(ops)/ops/layout.tsx`
 * owns the one `<main>` per document (D-88.1).
 */
export const OPS_QUEUE_SHELL = "mx-auto w-full max-w-5xl px-4 py-10";

/**
 * The `/ops` review queue's row: 576px below the large breakpoint, 892px at and above it.
 *
 * THE SLOT CONFIGURATION IT DESCRIBES: a title, a meta line, a status column holding the lead-scale
 * wait figure, a `PhotoGallery` mosaic, a SEVEN-term description list — six facts plus D-271's
 * contact affordance — and a full-width actions row of touch-height Approve/Reject buttons. **It is
 * the tallest row shape in the product**, and it is the only one whose height is set by a PICTURE
 * rather than by text.
 *
 * ⚠ RE-MEASURED 2026-09-02 BY PLAN 18.1-13, WHICH ADDED THE SEVENTH TERM. The values below moved
 * **528 -> 576** and **844 -> 892**, and the re-measurement was forced rather than tidy: the row grew
 * and `e2e/skeleton-geometry.spec.ts` went RED at both widths with a 48px shift, which is what that
 * spec exists to catch. Both numbers were read off the rendered route
 * (`npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium --workers=1
 * -g "18-12 — the /ops plate"`), and ⚠ THE TOLERANCE WAS NOT WIDENED — that spec's own words.
 *
 * THE GROWTH IS +50.00px AT BOTH DECLARED WIDTHS, IDENTICALLY, and the derivation is why that is not
 * a coincidence: the new `<dd>` holds a `size="touch"` control (44px, DS-09) and the `<dl>`'s
 * `space-y-1.5` adds the 6px gap above it. Neither term is width-driven, so the shift is a constant.
 *
 * MEASURED, NOT DERIVED, on the rendered route at `/ops` against the dev catalogue with two pending
 * listings and one pending host, in BOTH themes — and the two themes agree to the hundredth of a
 * pixel at every width, which is worth stating because grove's heading step is materially wider than
 * court's and this row's lead is at the heading role:
 *
 *     viewport   320      375      414      639      640      768      1024     1056     1280     1440
 *     listing    576.13   567.05*  588.98*  675.53*  676.09*  748.09*  892.09   892.09   892.09   892.09
 *     host       308.06*  288.06*  288.06*  288.06*  288.06*  288.06*  288.06*  288.06*  288.06*  288.06*
 *
 * ⚠ ONLY THE TWO UNSTARRED COLUMNS WERE RE-MEASURED, AND THE STARS ARE NOT DECORATION. 320 and 1280
 * are the two widths this constant DECLARES and the only two the spec asserts, so they were read off
 * a browser. Every starred figure is the pre-18.1-13 measurement plus the same +50.00px, which is
 * **derived** — justified by the derivation above and by the shift being identical at both measured
 * extremes, but not observed. They are labelled rather than silently shifted because this docblock's
 * own first discipline is *measured, not derived*, and a table that mixed the two without saying so
 * would be the more useful-looking and less trustworthy artifact. Nothing depends on them: the band
 * between the two breakpoints was never a declared step (see below).
 *
 * The declared values are the nearest steps on the ladder to the LISTING row at the two widths this
 * project declares at: **576** at the 320px floor (a 0.13px UNDER-claim against 576.13) and **892**
 * at the desktop width (a 0.09px under-claim against 892.09).
 *
 * ⚠ THE DIRECTION FLIPPED FROM OVER-CLAIM TO UNDER-CLAIM, AND IT IS THE RIGHT CALL RATHER THAN AN
 * OVERSIGHT. Every sibling constant in this file rounds UP, and the previous values did too (1.87px
 * and 1.91px over). The steps above the new observations are `h-145` (580) and `h-224` (896), which
 * would over-claim by **3.87px and 3.91px** — inside the 4px 14-UI-SPEC makes falsifiable by 0.13px
 * and 0.09px respectively. A pin that sits 0.13px from the tolerance it is checked against is a pin
 * that reddens on the next sub-pixel change to any font, gap or border on this row, and a gate that
 * fails for reasons unrelated to what it measures is a gate somebody eventually widens. Rounding
 * DOWN buys 3.87px and 3.91px of real headroom for a shift no reader can perceive.
 *
 * ⚠ THE BREAKPOINT IS `lg:` BECAUSE THAT IS WHERE `OPS_QUEUE_SHELL` STOPS GROWING, AND THAT IS
 * MEASURED RATHER THAN INFERRED. `max-w-5xl` is 1024px, so at a 1024px viewport the container has
 * already reached its cap — which is exactly why 1024, 1056, 1280 and 1440 all read 842.09. Above
 * `lg:` this constant is EXACT for every wider screen; below it, it is the floor's number.
 *
 * ⚠⚠ THE BAND IN BETWEEN, RECORDED RATHER THAN STEPPED — `HOST_BOOKING_ROW_HEIGHT`'s discipline, and
 * for a structurally harder version of the same problem. This row's height is a CONTINUOUS function
 * of the container width between roughly 375 and 1024, because `PhotoGallery`'s mosaic is
 * aspect-ratio-driven: every pixel the container gains, the hero gains 9/16 of. The plate therefore
 * under-draws through the middle of the range — on the pre-18.1-13 figures, 528 against 626.09 at 640
 * and against 698.09 at 768, a 98px and a 170px under-claim, and the +50px shift moves both terms so
 * the gap is unchanged — and NO ladder of declared steps can track a continuous curve. A
 * third step at `sm:` was considered and rejected: it would be exact at exactly one width inside the
 * band and wrong at every other, while adding a number this file has to keep true.
 *
 * ⚠⚠⚠ AND THE ONE THING THIS CONSTANT CANNOT SAY: THE QUEUE HAS TWO ROW SHAPES, NOT ONE. A host row
 * carries no photographs, so it measures ~288.06px at every width above the floor (derived — see the
 * stars in the table) — less than half this bar at 320 and barely a third of it at 1280. The
 * D-271 affordance is on BOTH kinds, so the +50px lands on both and the DIFFERENCE between the two
 * shapes is untouched, which is what keeps this paragraph's argument intact rather than merely
 * arithmetically adjusted. The queue interleaves both kinds oldest-first
 * (D-246), so which shape the first two rows take is a property of the catalogue on the day, not of
 * the route. The plate declares the LISTING shape deliberately: listings are the higher-volume kind
 * (one host submits many), the photo-bearing row is the one whose arrival actually moves the page,
 * and a plate that promised the host row would under-draw the common case by ~288px. `rows={2}`
 * rather than the pattern's default 4 is the other half of that decision — see
 * `(ops)/ops/loading.tsx`.
 *
 * ── THE 320px STATUS-COLUMN READING, AND WHY NO `OPS_QUEUE_STATUS_CAP` IS DECLARED ────────────────
 *
 * 18-UI-SPEC named this as a hazard to MEASURE rather than assume, so it was measured. At the 320px
 * floor the row's 244px header line splits **137.08px status / 106.92px title** — and **145.77 /
 * 98.23** on the row whose wait figure is longer. `RowCard` renders `status` `shrink-0`, so the title
 * column absorbs the whole squeeze: the status takes the LARGER share, which is the opposite of the
 * split `REQUEST_STATUS_CAP` encodes.
 *
 * A CAP WAS PROBED RATHER THAN ARGUED, and the probe is what settles it. With `max-w-28` (112px, the
 * shipped value) on the status content, re-measured at three widths in court. ⚠ THESE FIGURES PREDATE
 * PLAN 18.1-13 and are left at their measured values deliberately: they are a record of a probe of a
 * variant that was NOT shipped, and shifting them by +50px would turn an observation into an
 * arithmetic guess about a layout nobody ever rendered. What the probe settles — that the cap costs
 * +12px at every width by wrapping the lead — is unaffected by the row being 50px taller.
 *
 *     with the cap    320: title 132px, rows 506.13 / 258.06 / 526.13
 *                     375: title 187px, host row 250.06  (+12 against the uncapped 238.06)
 *                    1280: title 836px, rows 854.09 / 250.06  (+12 at both, against 842.09 / 238.06)
 *
 * The cap buys the title column 25–34px at the floor and costs **+12px at every width, including
 * every desktop width**, because it wraps `Waiting {N} days` onto two lines — at 1280, where the
 * title column already has 810px and there is no squeeze to relieve at all. That is precisely the
 * trade `REQUEST_STATUS_CAP`'s own docblock forbids: *"the countdown itself must therefore always
 * fit"*. And no cap value can avoid it, which is the decisive part: the uncapped status is 137–146px
 * wide, so any cap narrow enough to change the split is narrow enough to wrap the lead. The cap is
 * structurally the wrong instrument on this surface, and declaring `OPS_QUEUE_STATUS_CAP` at a value
 * that changes nothing would be a constant bought to look thorough.
 *
 * WHAT IS LEFT IS A REAL, RECORDED OBSERVATION AND NOT A FIX: at 320px a long listing title
 * truncates to ~98px. It is materially milder than the 8.66px that `REQUEST_STATUS_CAP` was measured
 * into existence for, and this row identifies its subject three other ways the host inbox's row does
 * not — the meta line, the full `Address` term in the `<dl>`, and the photographs themselves. The
 * honest fixes are a shorter lead string or a deliberately two-line lead, both of which are changes
 * to `src/components/ops/ops-queue-row.tsx`'s copy and a product decision rather than a measurement.
 * Logged in the phase's `deferred-items.md`.
 */
export const OPS_QUEUE_ROW_HEIGHT = "h-144 lg:h-223";
