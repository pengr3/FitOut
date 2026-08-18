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
 */
export const CALENDAR_CELL = "[--cell-size:--spacing(11)]";

/**
 * A slot chip's box: 44 × 80px.
 *
 * 44px is the WCAG 2.5.5 target-size figure, already this app's declared `size="touch"` (D-22) and
 * already `NOTIFICATION_BELL_BOX`. 80px is the width the shipped slot skeleton
 * (`availability-calendar.tsx`) reserves for a chip.
 *
 * HAZARD — THIS IS THE SHIMMER'S BOX TODAY, NOT YET THE SINGLE SOURCE OF BOTH. The UI-SPEC derives
 * `w-20` from "the real chip's minimum", and the real chip does NOT have that minimum: `slot-picker`'s
 * chips carry `min-h-11` and no `min-w-20` (RESEARCH Pitfall 9). So the two boxes agree in height and
 * are free to disagree in width right now. Whichever plan makes this constant the single source of
 * both MUST add `min-w-20` to the real chip in the SAME commit — otherwise it has declared a shared
 * measurement that only one side obeys, which is the exact defect this module exists to remove.
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
