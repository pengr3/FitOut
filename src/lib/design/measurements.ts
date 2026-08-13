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
 * The minimum height of a boxed panel — the price breakdown, the calendar day panel, an empty state.
 *
 * A floor rather than a fixed height: panel CONTENT varies (a breakdown has three lines or five),
 * so pinning the height would truncate. What must not vary is the panel's minimum, because that is
 * what stops a short panel and its skeleton disagreeing about how much of the page they occupy.
 */
export const PANEL_MIN_HEIGHT = "min-h-40";
