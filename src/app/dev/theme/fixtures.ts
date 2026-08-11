// Static fixture props for the `/dev/theme` preview (D-10 · 10-UI-SPEC § The /dev/theme Surface).
//
// EVERY EXPORT IS TYPED AGAINST THE COMPONENT IT FEEDS, with `ComponentProps<typeof X>`, so a prop
// that is renamed, retyped or removed upstream breaks THIS file at compile time instead of leaving
// the preview rendering a shape the product no longer has. A design-review surface that lies about
// what the components do is worse than no surface at all, and "we updated the component and forgot
// the preview" is the ordinary way that happens.
//
// EVERY IMPORT HERE IS `import type`. Nothing in this module is reachable at runtime from the
// component tree it describes, so the preview cannot pull a client bundle in through its fixtures,
// and the fixture module stays pure data.
//
// NO DATABASE, NO NETWORK, NO SEED DEPENDENCY (D-10). Phase 11 and Phase 17 screenshot this page,
// and both must work on a fresh clone with no Docker, no `npm run db:seed` and no origin reachable.
// Every value below is a literal. The dates are frozen literals rather than `new Date()` for the
// same reason: a preview whose Completed badge depends on when it is opened is a preview that
// renders differently in CI than on the machine that wrote it.
//
// THE COPY IS BORROWED FROM SHIPPED SURFACES, NEVER INVENTED. The whole point of section 1 is that
// the two themes are judged on real product strings at real lengths — a lorem-ipsum ladder tells you
// nothing about whether grove's 34px display fits a page title. Every sample below is a string this
// app already renders somewhere, or the shortest honest paraphrase of one.

import type { ComponentProps } from "react";

import type { SlotPicker } from "@/components/availability/slot-picker";
import type { SpotsLeftChip } from "@/components/availability/spots-left-chip";
import type { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import type { PayoutStateBadge } from "@/components/host/payout-state-badge";
import type { Button } from "@/components/ui/button";

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 1. Type ladder
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The four declared semantic roles (DS-02 / D-01), each labelled with its role and rendered with
 * real product copy so the per-theme weight and tracking difference is visible rather than asserted.
 *
 * The `className` is the BARE named step. Never the slash-modifier form: `text-display/tight`
 * compiles to font-size and line-height only, and the per-theme letter-spacing and weight vanish
 * with no warning — which would make this ladder show two themes that differ in size alone.
 */
export const TYPE_LADDER: readonly { readonly role: string; readonly step: string; readonly sample: string }[] = [
  {
    role: "Display — page titles and money figures",
    step: "text-display",
    sample: "Find a space to play",
  },
  {
    role: "Heading — section headings and card titles",
    step: "text-heading",
    sample: "Kingsley Court — Indoor Pickleball",
  },
  {
    role: "Body — prose and descriptions",
    step: "text-body",
    sample: "Search fitness and recreational spaces you can book by the hour or the day.",
  },
  {
    role: "Label — dense UI text, table cells, chips, buttons",
    step: "text-label",
    sample: "Confirm & pay",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 2. Button hierarchy
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** The CVA's own variant union, with `null | undefined` stripped. Not restated — derived. */
type ButtonVariant = NonNullable<ComponentProps<typeof Button>["variant"]>;
/** The CVA's own size union, same derivation. */
type ButtonSize = NonNullable<ComponentProps<typeof Button>["size"]>;

/**
 * Every declared variant, in the hierarchy order the UI-SPEC states, each with the shipped label it
 * actually carries somewhere in the app.
 *
 * THIS IS A TOTAL `Record`, and that is the load-bearing part (the same shape DS-10 uses for the
 * status tones). A variant added to `ui/button.tsx` without a row here is a COMPILE ERROR, so the
 * preview cannot silently stop covering the hierarchy it exists to show. A plain array would just
 * render one column fewer and look fine.
 *
 * WHY THE PREVIEW ENUMERATES INSTEAD OF WRITING THE VARIANT NAMES AT THE CALL SITE, stated plainly
 * rather than quietly enjoyed: `tests/design/brand-recipe.test.ts` pins the repo-wide accent
 * adoption at exactly 20 `<Button>` call sites that asked for coral, per file. That number is a
 * statement about PRODUCT CTAs. A dev-only preview that demonstrates all seven variants is not a
 * twenty-first CTA, and inflating the pin to 21 would blunt the assertion for every future plan.
 * Enumerating the union is also simply the better implementation — see the totality note above.
 */
const BUTTON_LABELS: Record<ButtonVariant, string> = {
  brand: "Book this space",
  default: "Save changes",
  outline: "Edit",
  secondary: "Unlist space",
  ghost: "Cancel",
  destructive: "Delete listing",
  link: "See all bookings",
};

/**
 * The render order, DERIVED from the total record above rather than restated beside it, so the two
 * can never disagree. `Object.entries` widens the key to `string`; the annotation restores exactly
 * what the `Record` already guarantees, and nothing more.
 */
export const BUTTON_HIERARCHY = Object.entries(BUTTON_LABELS) as readonly (readonly [
  ButtonVariant,
  string,
])[];

/** Both sizes every variant is shown at — the dense default and DS-09's 44px opt-in. */
export const BUTTON_SIZES: readonly ButtonSize[] = ["default", "touch"];

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 3. Status vocabulary
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The frozen clock every booking fixture is read against.
 *
 * `completed` is DERIVED at read time (D-102), never stored, so the only way to show it is a
 * `confirmed` booking whose `endsAt` is already behind `now`. Both dates are literals so that row
 * reads Completed on every machine and in every month.
 */
const FIXTURE_NOW = new Date("2026-03-14T09:00:00.000Z");
const FIXTURE_UPCOMING_END = new Date("2026-03-20T11:00:00.000Z");
const FIXTURE_PAST_END = new Date("2026-03-07T11:00:00.000Z");

/**
 * Every DISPLAY status the booking badge can render — all seven, including the derived one.
 *
 * `id` is a separate field rather than a key spread through the props, so the props object stays
 * exactly `ComponentProps<typeof BookingStatusBadge>` and React never receives a `key` in a spread.
 */
export const BOOKING_STATUS_FIXTURES: readonly {
  readonly id: string;
  readonly props: ComponentProps<typeof BookingStatusBadge>;
}[] = [
  {
    id: "pending",
    props: { status: "pending", endsAt: FIXTURE_UPCOMING_END, now: FIXTURE_NOW, side: "booker" },
  },
  {
    id: "requested",
    props: { status: "requested", endsAt: FIXTURE_UPCOMING_END, now: FIXTURE_NOW, side: "booker" },
  },
  {
    id: "approved",
    props: { status: "approved", endsAt: FIXTURE_UPCOMING_END, now: FIXTURE_NOW, side: "booker" },
  },
  {
    id: "confirmed",
    props: { status: "confirmed", endsAt: FIXTURE_UPCOMING_END, now: FIXTURE_NOW, side: "booker" },
  },
  {
    // The derived one: confirmed, but the session already ended.
    id: "completed",
    props: { status: "confirmed", endsAt: FIXTURE_PAST_END, now: FIXTURE_NOW, side: "booker" },
  },
  {
    id: "declined",
    props: { status: "declined", endsAt: FIXTURE_UPCOMING_END, now: FIXTURE_NOW, side: "booker" },
  },
  {
    id: "cancelled",
    props: { status: "cancelled", endsAt: FIXTURE_UPCOMING_END, now: FIXTURE_NOW, side: "booker" },
  },
];

/**
 * Every payout-ledger state, including `failed` — which is deliberately NOT a badge at all but the
 * destructive Alert pattern, and is therefore the only place the `attention` tone is visible.
 */
export const PAYOUT_STATE_FIXTURES: readonly ComponentProps<typeof PayoutStateBadge>["state"][] = [
  "held",
  "processing",
  "paid",
  "refunded",
  "failed",
];

/**
 * The fourth tone.
 *
 * `soft-accent` has no home in either status badge — the booking and payout vocabularies only reach
 * neutral, positive and attention. Its one real adopter is the spots-left chip, so the tone is shown
 * through that rather than hand-composed from its class recipe, which would make this page a second
 * declaration of the vocabulary instead of a view onto it.
 */
export const SPOTS_FIXTURES: readonly ComponentProps<typeof SpotsLeftChip>[] = [
  { state: "open", remaining: 12 },
  { state: "low", remaining: 3 },
  { state: "full", remaining: 0 },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// 4. Availability surface
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** Venue-local 09:00 on the fixture day is 01:00Z — the launch market runs at UTC+8. */
const HOUR_MS = 60 * 60 * 1000;
const FIRST_HOUR_UTC = Date.parse("2026-03-14T01:00:00.000Z");

/** One on-the-hour slot, `n` hours after the fixture day's opening hour. */
function slotAt(index: number, state: "available" | "unavailable") {
  const start = FIRST_HOUR_UTC + index * HOUR_MS;
  return {
    startUtc: new Date(start).toISOString(),
    endUtc: new Date(start + HOUR_MS).toISOString(),
    state,
    freeUnits: state === "available" ? 1 : 0,
    unitCount: 1,
  } as const;
}

/**
 * One venue-local day: eight on-the-hour slots, 9 AM through 4 PM, with a two-hour occupied run in
 * the middle.
 *
 * The occupied run is what makes this the canonical accent-carries-meaning surface. Unavailable
 * hours render muted and struck-through and are NEVER red — occupancy is a normal state, not an
 * error — so the only accent on the whole pane is the run the booker has chosen. Judging a brand
 * direction on this one surface tells you more than every swatch below it put together.
 *
 * `onSelectionChange` is deliberately absent: it is a function, and a Server Component cannot hand a
 * function to a client component. It is supplied by `./slot-picker-preview`, which also drives the
 * selected run — see that file's header for why the run cannot be a prop.
 */
export const SLOT_DAY: Omit<ComponentProps<typeof SlotPicker>, "onSelectionChange"> = {
  slots: [
    slotAt(0, "available"),
    slotAt(1, "available"),
    slotAt(2, "available"),
    slotAt(3, "unavailable"),
    slotAt(4, "unavailable"),
    slotAt(5, "available"),
    slotAt(6, "available"),
    slotAt(7, "available"),
  ],
  timezone: "Asia/Manila",
  // One unit, so the chips carry no "N of M free" sub-label. The open-capacity variant is a
  // different surface (the date-pass picker) and inventing it here would be Phase-9 scope.
  unitCount: 1,
  mode: "instant",
  disabled: false,
};
