// The `/dev/theme` preview (THEME-04 · D-09 / D-10 · 10-UI-SPEC § The /dev/theme Surface).
//
// This is the one real screen Phase 10 ships. Success criterion 3 is that a brand direction can be
// judged ON REAL COMPONENTS rather than on swatches, so the section order below puts the booking
// surfaces first and the colour chips dead last — a design-system page that opens with a palette is
// a page that gets read as a palette.
//
// ── WHY IT LIVES AT THE APP ROOT, OUTSIDE (app)/(auth)/(host) ─────────────────────────────────────
// `(app)/layout.tsx` calls the session API and REDIRECTS to /login whenever there is none. A preview
// page placed inside that group would therefore be unreachable to a signed-out reviewer, and — the
// half that actually bites — unreachable to Phase 11's theme-swap screenshots and Phase 17's
// two-theme axe pass, both of which drive this route with no account at all. The redirect is a
// layout concern, so nothing at page level would have shown it. This file sits beside
// `invite/[token]/page.tsx`, the app's other deliberately root-level route, for the same reason and
// with the same prohibition: DO NOT move this route under a route group, and DO NOT add a session
// redirect to it.
//
// It is also a single ROUTE, not a `(dev)` route group (D-09). A group would be scaffolding for a
// family of dev surfaces that does not exist and is not planned.
//
// ── IT MUST NOT EXIST IN PRODUCTION (T-10-01) ─────────────────────────────────────────────────────
// The first line of the component body compares the BUILD-TIME environment constant and hands off to
// Next's built-in not-found. Two properties follow, and both are the reason it is written that way:
// the bundler can prune the branch, and there is no operator-settable variable anywhere in the path,
// so no deploy, no dashboard toggle and no leaked `.env` can turn this route back on. The metadata
// export carries a noindex on top of that, mirroring the invite page's precedent.
//
// Even bypassed, this page discloses nothing (T-10-32): every value it renders is a static literal
// from `./fixtures`. There is no database query, no network call and no dependence on the local UAT
// seed, so it cannot leak a real booking, a real host or a real payout — and it renders identically
// on a fresh clone, which is what Phase 11 and Phase 17 need from it.
//
// ── WHAT THE TWO NESTED SUBTREES PROVE (THEME-04) ─────────────────────────────────────────────────
// The body is two sibling panes, each carrying its own theme attribute, each `bg-background
// text-foreground`, both rendering the IDENTICAL ordered section sequence from the IDENTICAL fixture
// props so a horizontal scan compares like with like. They re-skin because `@theme inline` makes
// every utility emit `var(--background)` rather than `var(--color-background)`, which defers
// resolution to the element. Drop the word `inline` and the app-wide switcher keeps working while
// every nested subtree silently renders the root theme — which is exactly why that failure is easy to
// miss, and exactly why this page exists. `tests/design/theme-nesting.test.ts` is the executable half.
//
// ── WHAT THIS PAGE DELIBERATELY DOES NOT HAVE ─────────────────────────────────────────────────────
// No loading, empty or error states, by construction: it is static, and its only failure path is the
// production guard. The STATE-* families are Phase 11 and must not be invented here. No
// visual-regression baseline is captured anywhere in this phase either — GATE-01 is Phase 11 and
// DS-01 invalidates anything shot before it.

import type { ComponentProps } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BellIcon, CalendarSearchIcon, MenuIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { THEME_NAMES, THEME_TOKENS } from "@/lib/design/tokens.generated";
import {
  AUTH_SLOT_BOX,
  AUTH_SLOT_ICON,
  NOTIFICATION_BELL_BOX,
  RESULT_GRID_GAP,
} from "@/lib/design/measurements";
import { SpotsLeftChip } from "@/components/availability/spots-left-chip";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { PayoutStateBadge } from "@/components/host/payout-state-badge";
import { SearchResultCard } from "@/components/search/search-result-card";
import { AuthSlotSkeleton } from "@/components/patterns/auth-slot-skeleton";
import { CardGridSkeleton } from "@/components/patterns/card-grid-skeleton";
import { EmptyState } from "@/components/patterns/empty-state";
import { PanelCard } from "@/components/patterns/panel-card";
import { PanelSkeleton } from "@/components/patterns/panel-skeleton";
import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { ResultCard } from "@/components/patterns/result-card";
import { RowCard } from "@/components/patterns/row-card";
import { RowListSkeleton } from "@/components/patterns/row-list-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ErrorStatePreview } from "./error-state-preview";
import { SlotPickerPreview } from "./slot-picker-preview";
import {
  BOOKING_STATUS_FIXTURES,
  BUTTON_HIERARCHY,
  BUTTON_SIZES,
  FORM_ROW,
  PAYOUT_STATE_FIXTURES,
  RESULT_CARD,
  SPOTS_FIXTURES,
  TYPE_LADDER,
} from "./fixtures";

/**
 * Noindex, following `invite/[token]/page.tsx`'s precedent. The production guard already makes this
 * route unreachable on a deployed build; this covers the preview and staging origins where it is
 * reachable on purpose, so a design surface can never turn up in a search result for the product.
 */
export const metadata: Metadata = {
  title: "Theme preview",
  robots: { index: false, follow: false },
};

/** The pane shell: each theme paints its OWN background, not a tint over the root theme's. */
const PANE = "min-w-0 space-y-10 rounded-xl border border-border bg-background p-4 text-foreground";

/**
 * The three named elevation steps (DS-03), which are the only shadows this app is allowed to use.
 *
 * Tailwind's defaults compile to LITERAL values rather than var() references, so a theme block
 * redeclaring them does nothing at all and any surface left on one is frozen against every theme.
 * The third step has no product call site yet — it is reserved for bottom-anchored bars, and this
 * ladder is its declared exerciser, which is why `tests/design/elevation-z.test.ts` pins it here.
 */
const ELEVATION_LADDER = [
  { step: "raised", surface: "shadow-raised", role: "cards, toolbars, an active tab" },
  { step: "overlay", surface: "shadow-overlay", role: "menus, popovers, dialogs" },
  { step: "sticky", surface: "shadow-sticky", role: "bottom-anchored bars — casts upward" },
] as const;

/**
 * The seven radius steps, every one derived by `calc()` from the theme's SINGLE `--radius`.
 *
 * This is the section that makes grove's shape difference legible: one number moves from 10px to
 * 20px and the whole ladder doubles with no other edit anywhere.
 */
const RADIUS_LADDER = [
  "rounded-sm",
  "rounded-md",
  "rounded-lg",
  "rounded-xl",
  "rounded-2xl",
  "rounded-3xl",
  "rounded-4xl",
] as const;

/**
 * The surfaces, each labelled with its role — DELIBERATELY LAST.
 *
 * Swatches are the least useful comparison on this page. Putting them first is how a design-system
 * page ends up being read as a palette instead of as a product, and the whole ordering above exists
 * to prevent exactly that.
 */
const SURFACE_SWATCHES = [
  { fill: "bg-background", role: "background — the page itself" },
  { fill: "bg-card", role: "card — content lifted off the page" },
  { fill: "bg-muted", role: "muted — status tints and hover fills" },
  { fill: "bg-border", role: "border — decorative divider, never a sole boundary" },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SECTIONS 10–14 — PHASE 11'S PATTERN LAYER, AND ITS FIXTURES (plan 11-21)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// EVERYTHING BELOW IS A FIXTURE, NOT PRODUCT COPY. None of these strings is rendered by the product;
// they are borrowed from shipped surfaces or are the shortest honest paraphrase of one, following
// `./fixtures.ts`'s rule, so the two themes are judged on real string LENGTHS. A reader who mistakes
// one of these for a product sentence will go looking for the surface that renders it and find none.
//
// WHY THEY LIVE HERE RATHER THAN IN `./fixtures.ts`. That module is `import type` only by design — it
// is pure data that cannot pull a client bundle in through a fixture. Sections 10–14 need NODES
// (a media fallback, an actions cluster, a `routeOut` button), which are JSX and therefore cannot go
// in a type-only module without changing its rule. They are typed against the components they feed
// with `ComponentProps<typeof X>` all the same, which is the property that module's header is
// actually protecting: a prop renamed upstream breaks this file at compile time.
//
// NO DATABASE, NO NETWORK, NO SEED. Same as every other section — three e2e specs drive this page
// precisely because it has none of those, and plan 11-21 adds three more.

/** The marketplace tile. `mediaFallback` is the no-broken-image path, copied from the shipped tile. */
const PATTERN_RESULT_CARDS: readonly ComponentProps<typeof ResultCard>[] = [
  {
    href: "/",
    mediaFallback: (
      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
        No photos yet
      </div>
    ),
    title: "Kingsley Court — Indoor Pickleball",
    meta: ["Court · Makati", "Mon–Fri, 6:00 AM – 10:00 PM"],
    price: "₱1,400 total for 2 hours",
    badges: <Badge variant="secondary">Open capacity</Badge>,
  },
  {
    href: "/",
    mediaFallback: (
      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
        No photos yet
      </div>
    ),
    title: "Studio Nine — Yoga & Movement",
    meta: ["Studio · Poblacion", "Daily, 7:00 AM – 9:00 PM"],
    price: "₱900 total for 1 hour",
  },
  {
    href: "/",
    mediaFallback: (
      <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
        No photos yet
      </div>
    ),
    title: "The Barn — Private Home Gym",
    meta: ["Gym · Mandaluyong", "By request"],
    price: "₱650 total for 1 hour",
  },
];

/**
 * A status badge from the ALREADY-FROZEN fixture set, by id.
 *
 * The badge takes `endsAt` and `now`, and this page must render identically on every machine on every
 * day — plan 11-22 shoots visual-regression baselines against it, and a badge that derives its label
 * from the clock is a baseline that rots overnight. `BOOKING_STATUS_FIXTURES` already pins both dates
 * as frozen literals for exactly that reason, so section 10 reads them rather than passing a second
 * pair of its own.
 *
 * THE THROW IS THE POINT, not defensive padding — `result-card.tsx:50-62`'s precedent. If an id is
 * renamed upstream the honest outcomes are "rename it here too" or "pick another state"; silently
 * rendering nothing would leave a row with an empty status slot and no signal that anything moved.
 */
function statusFixture(id: string): ComponentProps<typeof BookingStatusBadge> {
  const found = BOOKING_STATUS_FIXTURES.find((fixture) => fixture.id === id);
  if (!found) {
    throw new Error(
      `/dev/theme section 10: BOOKING_STATUS_FIXTURES has no entry with id \`${id}\`. The row-card ` +
        "fixtures read the frozen booking-status set rather than passing their own `now`/`endsAt`, " +
        "so this page renders identically on every machine. Rename the lookup or pick another state.",
    );
  }
  return found.props;
}

/** The 48px thumbnail's contents on a row with no photo — copied from the shipped `booking-row`. */
const ROW_MEDIA_FALLBACK = (
  <span className="flex size-full items-center justify-center text-xs leading-tight text-muted-foreground">
    No photos yet
  </span>
);

/**
 * The list row, in the 48px-media configuration — the ONE configuration `ROW_CARD_HEIGHT`'s 80px is
 * scoped to (`row-card.tsx`'s header says so). No `children` body and no `actions`, because both make
 * the row legitimately taller and would turn section 14's height comparison into a measurement of
 * this fixture rather than of the constant.
 */
const PATTERN_ROW_CARDS: readonly ComponentProps<typeof RowCard>[] = [
  {
    href: "/",
    media: ROW_MEDIA_FALLBACK,
    title: "Kingsley Court — Indoor Pickleball",
    meta: "Sat 14 Mar, 9:00 – 11:00 AM",
    status: <BookingStatusBadge {...statusFixture("confirmed")} />,
    trailing: "₱1,400",
  },
  {
    href: "/",
    media: ROW_MEDIA_FALLBACK,
    title: "Studio Nine — Yoga & Movement",
    meta: "Sun 15 Mar, 7:00 – 8:00 AM",
    status: <BookingStatusBadge {...statusFixture("pending")} />,
    trailing: "₱900",
  },
  {
    href: "/",
    media: ROW_MEDIA_FALLBACK,
    title: "The Barn — Private Home Gym",
    meta: "Tue 17 Mar, 6:00 – 7:00 PM",
    status: <BookingStatusBadge {...statusFixture("cancelled")} />,
    trailing: "₱650",
  },
];

/** The boxed panel. `sticky` is deliberately NOT exercised — a pinned rail inside a preview column. */
const PATTERN_PANEL: Omit<ComponentProps<typeof PanelCard>, "children" | "footer"> = {
  title: "Price breakdown",
  description: "What the booker pays, frozen at quote time.",
};

// THE TWO EMPTY TONES ARE AUTHORED INLINE IN THE JSX BELOW, NOT AS SPREAD CONSTANTS, AND THAT IS A
// MEASURED CHOICE RATHER THAN A STYLISTIC ONE. `tests/design/empty-state-adoption.test.ts` reads
// `tone`, `title` and `titleAs` off JSX ATTRIBUTES; a spread attribute is not a `JsxAttribute`, so
// every prop delivered through one reads as `null` there. Authored as spreads, this page's
// `tone="positive"` panel would have been INVISIBLE to that gate's "exactly one positive empty state
// in the whole tree" assertion — the gate would have stayed green by not seeing the thing it counts,
// which is the rubber-stamp shape this phase exists to remove. Inline, the gate sees both panels, and
// its inventory names this file. (The extractor's spread-blindness in general is a live hole in that
// gate and is recorded in the phase's `deferred-items.md`; it is not created here and is not this
// plan's to close.)

/** The error panel, twice: once with a `digest` and once without. */
const PATTERN_ERROR_BASE = {
  title: "We couldn't load this",
  body: "Nothing was charged. Try again, or head back and pick another time.",
  routeOut: (
    <Button variant="outline" asChild>
      <Link href="/">Back to search</Link>
    </Button>
  ),
} as const;

/** A frozen literal, never generated — a preview whose reference changes per load is not a preview. */
const PATTERN_ERROR_DIGEST = "3f9a1c72";

/** One section inside a pane. The heading renders in the PANE's theme, so headings compare too. */
function Section({
  index,
  title,
  note,
  children,
}: {
  index: number;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-heading">
          {index}. {title}
        </h2>
        {note ? <p className={cn("text-label", "text-muted-foreground")}>{note}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * The section sequence, rendered identically in both panes.
 *
 * ONE function called twice, rather than two copies — a preview whose panes can drift is a preview
 * that will eventually attribute a difference to the theme that actually came from the markup.
 */
function ThemePane({ name }: { name: string }) {
  return (
    <>
      <p className={cn("text-label", "text-muted-foreground")}>{name}</p>

      <Section
        index={1}
        title="Type ladder"
        note="Four declared roles, real product copy. Weight, tracking and leading travel per theme."
      >
        <div className="space-y-4">
          {TYPE_LADDER.map((row) => (
            <div key={row.step} className="space-y-1">
              <p className={cn("text-label", "text-muted-foreground")}>{row.role}</p>
              <p className={row.step}>{row.sample}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        index={2}
        title="Button hierarchy"
        note="Every variant at the dense default and the 44px touch size. An un-varianted button stays neutral — the accent is opt-in."
      >
        <div className="space-y-4">
          {BUTTON_HIERARCHY.map(([variant, label]) => (
            <div key={variant} className="space-y-1.5">
              <p className={cn("text-label", "text-muted-foreground")}>{variant}</p>
              <div className="flex flex-wrap items-center gap-2">
                {BUTTON_SIZES.map((size) => (
                  <Button key={size} variant={variant} size={size}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <p className={cn("text-label", "text-muted-foreground")}>
              disabled · focus (forced, so the recipe is visible without tabbing)
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" disabled>
                Unavailable
              </Button>
              {/* The DS-05 recipe with its `focus-visible:` prefixes removed, so the ring and its
                  background-coloured offset band paint at rest. Identical declarations, no alpha —
                  a half-alpha ring composites to 2.32:1 over white and no token value fixes it. */}
              <Button
                variant="outline"
                className="ring-2 ring-ring ring-offset-2 ring-offset-background"
              >
                Focused
              </Button>
            </div>
          </div>
        </div>
      </Section>

      <Section
        index={3}
        title="Status vocabulary"
        note="Four tones, every one icon-plus-text and never colour-only. Occupancy and closed lifecycles are normal states — nothing here is red except a genuine failure."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {BOOKING_STATUS_FIXTURES.map((fixture) => (
              <BookingStatusBadge key={fixture.id} {...fixture.props} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PAYOUT_STATE_FIXTURES.map((state) => (
              <PayoutStateBadge key={state} state={state} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {SPOTS_FIXTURES.map((chip) => (
              <SpotsLeftChip key={chip.state} {...chip} />
            ))}
          </div>
        </div>
      </Section>

      <Section
        index={4}
        title="Availability surface"
        note="The canonical accent-carries-meaning surface. Occupied hours are muted and struck through, never red; the only accent on the pane is the run the booker picked."
      >
        <SlotPickerPreview />
      </Section>

      <Section
        index={5}
        title="Result card"
        note="A capacity-honest submitted result: photo placeholder, title, all-in price and the soft-accent scarcity chip."
      >
        <div className="max-w-xs">
          <SearchResultCard listing={RESULT_CARD} />
        </div>
      </Section>

      <Section
        index={6}
        title="Form row"
        note="Real controls, one of them invalid — the focus recipe and the destructive border treatment on something a reviewer can actually tab into."
      >
        {/* IDS ARE THEME-PREFIXED. Both panes render this section, so an unprefixed id would put a
            duplicate on the page and break every label association in the second pane — which is
            also what Phase 17's axe pass would report, on a route it is meant to be auditing. */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${name}-space-name`}>{FORM_ROW.nameLabel}</Label>
            <Input
              id={`${name}-space-name`}
              defaultValue={FORM_ROW.nameValue}
              placeholder={FORM_ROW.namePlaceholder}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${name}-space-type`}>{FORM_ROW.typeLabel}</Label>
            <Select defaultValue={FORM_ROW.typeValue}>
              <SelectTrigger id={`${name}-space-type`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORM_ROW.typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`${name}-rate`}>{FORM_ROW.rateLabel}</Label>
            <Input
              id={`${name}-rate`}
              defaultValue={FORM_ROW.rateValue}
              aria-invalid
              aria-describedby={`${name}-rate-error`}
            />
            <p id={`${name}-rate-error`} className={cn("text-label", "text-destructive")}>
              {FORM_ROW.rateError}
            </p>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id={`${name}-exact-address`} defaultChecked className="mt-0.5" />
            <Label htmlFor={`${name}-exact-address`} className="leading-snug">
              {FORM_ROW.checkboxLabel}
            </Label>
          </div>
        </div>
      </Section>

      <Section
        index={7}
        title="Elevation ladder"
        note="Three steps and no fourth. Court is shallow and neutral; grove roughly doubles every blur and tints the cast to its own ink hue."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {ELEVATION_LADDER.map((entry) => (
            <div
              key={entry.step}
              className={cn("space-y-1 rounded-lg bg-card p-4", entry.surface)}
            >
              <p className="text-label">{entry.step}</p>
              <p className={cn("text-label", "text-muted-foreground")}>{entry.role}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        index={8}
        title="Radius ladder"
        note="Seven steps, all derived from one number. Court starts at 10px, grove at 20px — the shape difference, not just the colour one."
      >
        <div className="flex flex-wrap items-end gap-3">
          {RADIUS_LADDER.map((step) => (
            <div key={step} className="space-y-1">
              <div className={cn("size-12 border border-border bg-muted", step)} />
              <p className={cn("text-label", "text-muted-foreground")}>
                {step.replace("rounded-", "")}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        index={9}
        title="Surface swatches"
        note="Last on purpose — the least useful comparison on this page, and the one a design-system page usually leads with."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {SURFACE_SWATCHES.map((swatch) => (
            <div key={swatch.fill} className="flex items-center gap-3">
              <div className={cn("size-10 shrink-0 rounded-lg border border-border", swatch.fill)} />
              <p className={cn("text-label", "text-muted-foreground")}>{swatch.role}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── SECTIONS 10–14, PLAN 11-21 ────────────────────────────────────────────────────────────
          Phase 11's pattern layer, exercised on the one page in this app that needs no database, no
          network and no seed. Everything below is inside `ThemePane`, so both panes render the
          identical sequence from the identical fixtures and a difference between the columns can
          only have come from the theme — see this function's docblock. */}

      <Section
        index={10}
        title="Card patterns"
        note="Three named containers and no fourth (DS-11). The tile's media box is the geometry a grid's skeleton has to match; the row is shown in the 48px-media configuration its 80px height is scoped to."
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className={cn("text-label", "text-muted-foreground")}>
              ResultCard — with mediaFallback, so the no-broken-image path is visible
            </p>
            <div className="max-w-xs">
              <ResultCard {...PATTERN_RESULT_CARDS[0]} />
            </div>
          </div>

          <div className="space-y-2">
            <p className={cn("text-label", "text-muted-foreground")}>
              RowCard — thumbnail, title, when-line, status and a trailing amount
            </p>
            <RowCard {...PATTERN_ROW_CARDS[0]} />
          </div>

          <div className="space-y-2">
            <p className={cn("text-label", "text-muted-foreground")}>
              PanelCard — flat by contract; the footer is the vendored treatment, not a restatement
            </p>
            <PanelCard
              {...PATTERN_PANEL}
              footer={<p className="text-sm tabular-nums">₱1,400 total</p>}
            >
              <dl className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">2 hours × ₱600</dt>
                  <dd className="tabular-nums">₱1,200</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Service fee</dt>
                  <dd className="tabular-nums">₱200</dd>
                </div>
              </dl>
            </PanelCard>
          </div>
        </div>
      </Section>

      <Section
        index={11}
        title="Empty states — both tones"
        note="Side by side so D-14 is comparable across themes: green retreats to the GLYPH. The title and body are the same ink in both tones, and there is no green fill and no green text anywhere in either panel."
      >
        {/* FIXTURE COPY, not product copy — see the fixtures block above. `titleAs="h3"` on both:
            each sits under the `Section` helper's own `<h2>`, and a skipped level here would be the
            a11y defect this pattern's `titleAs` prop exists to make impossible. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <EmptyState
            tone="neutral"
            icon={CalendarSearchIcon}
            titleAs="h3"
            title="No spaces match those answers"
            body="Edit an answer above to try a different search."
            actions={null}
          />
          <EmptyState
            tone="positive"
            titleAs="h3"
            title="You're all caught up"
            body="Every request has an answer. New ones land here."
            actions={null}
          />
        </div>
      </Section>

      <Section
        index={12}
        title="Error state — reference present and absent"
        note="The panel takes a digest STRING and nothing else off the error (T-11-ERRLEAK). Both instances are rendered through a client wrapper, because the pattern needs an onRetry function and this page is a Server Component; the two buttons are inert here — nothing threw, so there is nothing to reset."
      >
        <div className="space-y-4">
          <ErrorStatePreview {...PATTERN_ERROR_BASE} digest={PATTERN_ERROR_DIGEST} />
          <ErrorStatePreview {...PATTERN_ERROR_BASE} />
        </div>
      </Section>

      <Section
        index={13}
        title="Responsive dialog — one primitive, two presentations"
        note="LIMITATION, STATED RATHER THAN FAKED: one dialog cannot be open at both breakpoints in one screenshot, and no statically-open instance is rendered here. Radix portals a modal to the document body, marks the rest of the document hidden from assistive technology and traps focus — which on THIS page would break the two-theme audit pass it exists for, and would put an overlay over every other section's geometry. The trigger below opens the real thing; narrow the window under 640px to see the sheet presentation and widen it to see the centred one."
      >
        <ResponsiveDialog
          title="Filter spaces"
          description="Below 640px this opens anchored to the bottom edge, capped at 85% of the dynamic viewport. From 640px up it is the vendored centred dialog, byte-unchanged."
          trigger={<Button variant="outline">Open the overlay</Button>}
          footer={<Button variant="secondary">Apply</Button>}
        >
          <p className="text-sm text-muted-foreground">
            One overlay mechanism, one focus trap and one escape behaviour — the same portal and the
            same content node at every width.
          </p>
        </ResponsiveDialog>
      </Section>

      <Section
        index={14}
        title="Loading shapes beside their resolved twins"
        note="The reserved auth slot and the three canonical skeletons, each above the real content it stands in for AT THE SAME WIDTH. Stacked rather than literally side by side: a two-column pair inside this column would put a three-column grid into ~280px and make the media box a measurement of that accident instead of of the constant. This is the pair `e2e/skeleton-geometry.spec.ts` measures."
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <p className={cn("text-label", "text-muted-foreground")}>
              Auth slot — the fallback, then a resolved cluster in the same reserved box
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="rounded-lg border border-border p-2">
                <AuthSlotSkeleton />
              </div>
              <div className="rounded-lg border border-border p-2">
                {/* The shell's menu-and-bell cluster at the same shared reservation. This is a
                    measurement illustration, not a second menu implementation. */}
                <div className={cn(AUTH_SLOT_BOX, "flex items-center justify-end gap-3")}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={AUTH_SLOT_ICON}
                    aria-label="Navigation menu"
                  >
                    <MenuIcon aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={NOTIFICATION_BELL_BOX}
                    aria-label="Notifications"
                  >
                    <BellIcon aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className={cn("text-label", "text-muted-foreground")}>
              Card grid — skeleton, then the resolved grid in the identical grid classes
            </p>
            <CardGridSkeleton label="Loading spaces" count={3} />
            {/* The grid's own classes are duplicated from `card-grid-skeleton.tsx` on purpose and
                only here: the two containers must lay out at the SAME column width or the ±2px media
                comparison is measuring the wrapper rather than the constant. How many columns fit is
                a window question, which is why this line is viewport breakpoints and the card's own
                internals are container queries.

                THE GUTTER IS NO LONGER ONE OF THE DUPLICATED CLASSES — it is `RESULT_GRID_GAP`,
                imported (D-57, plan 12-01). Worth recording why that had to change HERE too: this
                preview was a THIRD copy of the number, so moving the skeleton onto the constant made
                the preview's two containers disagree and turned the shipped ±2px media comparison in
                `e2e/skeleton-geometry.spec.ts` red at Δwidth 2.67px, in both themes. A duplicated
                measurement does not announce itself until something moves. */}
            <div className={cn(RESULT_GRID_GAP, "grid sm:grid-cols-2 lg:grid-cols-3")}>
              {PATTERN_RESULT_CARDS.map((card) => (
                <ResultCard key={card.title} {...card} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className={cn("text-label", "text-muted-foreground")}>
              Row list — skeleton, then three rows in the 48px-media configuration
            </p>
            <RowListSkeleton label="Loading bookings" rows={3} />
            <div className="space-y-3">
              {PATTERN_ROW_CARDS.map((row) => (
                <RowCard key={row.title} {...row} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className={cn("text-label", "text-muted-foreground")}>
              Panel — skeleton, then the resolved panel. The constant is a FLOOR, not a height.
            </p>
            <PanelSkeleton label="Loading the price breakdown" />
            <PanelCard {...PATTERN_PANEL}>
              <dl className="space-y-1 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">2 hours × ₱600</dt>
                  <dd className="tabular-nums">₱1,200</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Service fee</dt>
                  <dd className="tabular-nums">₱200</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="tabular-nums">₱1,400</dd>
                </div>
              </dl>
            </PanelCard>
          </div>
        </div>
      </Section>
    </>
  );
}

export default function DevThemePage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      {/* The header strip renders OUTSIDE both panes, in the root theme, so it is the one fixed
          reference the two columns are read against. */}
      <header className="space-y-3">
        <h1 className="text-display">Theme preview — court vs grove</h1>
        <p className={cn("max-w-prose", "text-body", "text-muted-foreground")}>
          Two placeholder brand directions on the same real components. This route is not part of the
          product and returns 404 in production.
        </p>
        <dl className={cn("flex flex-wrap gap-x-6 gap-y-2", "text-label")}>
          <div className="flex items-center gap-2">
            <dt className="text-muted-foreground">AA bars</dt>
            <dd className="tabular-nums">4.5 text · 3.0 non-text · +0.05 epsilon</dd>
          </div>
          {/* Read from the generated token module, which is byte-compared against globals.css on
              every test run — so this page cannot misreport the colour it is showing. */}
          {THEME_NAMES.map((theme) => (
            <div key={theme} className="flex items-center gap-2">
              <dt className="text-muted-foreground">{theme} --brand</dt>
              <dd className="tabular-nums">{THEME_TOKENS[theme]["--brand"].hex}</dd>
            </div>
          ))}
        </dl>
      </header>

      {/* Two equal columns at 1024px and above; below that they stack with court first, which is the
          reading order a reviewer expects and keeps the 320px floor a single column. */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div data-theme="court" className={PANE}>
          <ThemePane name="court" />
        </div>
        <div data-theme="grove" className={PANE}>
          <ThemePane name="grove" />
        </div>
      </div>
    </main>
  );
}
