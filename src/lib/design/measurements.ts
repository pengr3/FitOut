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
 * ONE MEMBER TODAY, AND THAT IS THE HONEST STATE. Exactly one row height has been derived and
 * written down, so exactly one value is legal. Widening this is a two-line edit IN THIS FILE — add
 * the constant with its derivation, add it to this union — which is the point: the set of legal row
 * heights is decided where the heights are derived, not at whichever `loading.tsx` needed a taller
 * bar that afternoon.
 *
 * THE HOLE THE TYPE CANNOT CLOSE, stated so the next reader under-trusts it. These are string
 * LITERAL types, so a hand-typed value that happens to equal a declared one still typechecks: the
 * compiler cannot tell a constant from its own text. That residual case is closed by two source
 * gates rather than by the type — `tests/design/skeleton-measurements.test.ts` inside the pattern
 * files, and `tests/design/loading-coverage.test.ts` at every route's loading plate. The type stops
 * the wrong number; the gates stop the right number written the wrong way.
 */
export type RowSkeletonHeight = typeof ROW_CARD_HEIGHT;

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
 * `h-8` is the control height it will contain; `min-w-44` is the widest resolved state (an avatar
 * plus a name) rounded up to the ladder. Its entire job is to be the same size empty as it is full,
 * so the header does not reflow when the session lands.
 */
export const AUTH_SLOT_BOX = "h-8 min-w-44";

/**
 * The auth slot's WIDE control placeholder: 32 × 96px.
 *
 * THE EIGHTH AND NINTH CONSTANTS ARE THIS ONE AND THE NEXT, AND NEITHER IS IN THE UI-SPEC'S LIST —
 * recorded here rather than quietly added, exactly as `TEXT_BAR_HEIGHT` below was. The UI-SPEC pins
 * the auth slot's fallback shape as *"one `Skeleton h-8 w-24` + one `Skeleton size-8`"* and, in the
 * same breath, AC#16 requires a `patterns/*skeleton*.tsx` file to write ZERO literal box utilities of
 * its own. `auth-slot-skeleton.tsx` matches that glob, so those two spellings cannot both be literals
 * at the call site — the choice was a pair of constants or a pair of exemptions in the source gate,
 * and the constants win for the reason `TEXT_BAR_HEIGHT` gives: an exemption for `w-24` would legalise
 * a literal WIDTH at a call site, which is the shape T-11-GEODRIFT is about.
 *
 * These two are MEASUREMENTS of real controls rather than proportions of a placeholder, which is what
 * makes them belong here at all. 11-UI-SPEC § Responsive behaviour measures the resolved booker
 * cluster as *"mode switch 96 + bell 32 + `Profile` 48 + 2 gaps 24 = 200px"*: `w-24` is 96px, the
 * mode switch, and `size-8` is 32px, the bell. The fallback is therefore the same two boxes the
 * resolved cluster puts in the same two places, which is why the slot does not reflow when the
 * session lands — and if either control's real width changes, the number that has to move is here.
 *
 * `h-8` is `AUTH_SLOT_BOX`'s height restated on the child, not a second decision: the slot is `h-8`
 * and its tallest content is `h-8`, which is what makes the height claim true of the box AND its
 * contents.
 */
export const AUTH_SLOT_CONTROL = "h-8 w-24";

/**
 * The auth slot's ICON control placeholder: 32 × 32px.
 *
 * The square controls in the header that ARE 32px: the `aria-label="Menu"` drawer trigger
 * (`site-chrome.tsx`'s `NavDrawer`, which reads this constant), and the auth slot's own second
 * placeholder. See `AUTH_SLOT_CONTROL` above for why this is a constant rather than a literal, and
 * for the measurement it comes from.
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
 * the whole slot (176px) and `AUTH_SLOT_ICON` is 32px; neither is 44, and using either would cause
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
 */
export const STICKY_BAR_CLEARANCE = "pb-20";

/**
 * The checkout header's hold-countdown box: 32 × 96px.
 *
 * A RESERVATION, not a design value. `14:52` and `0:09` are different character counts, so a box with
 * a width floor is what stops the header reflowing once per session — the same argument `AUTH_SLOT_BOX`
 * makes for the session slot. The 96px reuses `AUTH_SLOT_CONTROL`'s width rather than inventing a
 * second reservation, and `h-8` is the header's control step restated on the child.
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
 * quietly added, exactly as `TEXT_BAR_HEIGHT` and `AUTH_SLOT_CONTROL` were before it. It exists because
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
