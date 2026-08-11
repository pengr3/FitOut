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

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { cn } from "@/lib/utils";
import { THEME_NAMES, THEME_TOKENS } from "@/lib/design/tokens.generated";
import { SpotsLeftChip } from "@/components/availability/spots-left-chip";
import { BookingStatusBadge } from "@/components/booking/booking-status-badge";
import { PayoutStateBadge } from "@/components/host/payout-state-badge";
import { SearchResultCard } from "@/components/search/search-result-card";
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

import { SlotPickerPreview } from "./slot-picker-preview";
import {
  BOOKING_STATUS_FIXTURES,
  BUTTON_HIERARCHY,
  BUTTON_SIZES,
  FORM_ROW,
  PAYOUT_STATE_FIXTURES,
  RESULT_CARD,
  RESULT_CARD_WINDOW,
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
        note="The booker's search tile: photo placeholder, title, all-in price and the soft-accent scarcity chip."
      >
        <div className="max-w-xs">
          <SearchResultCard listing={RESULT_CARD} searchedWindow={RESULT_CARD_WINDOW} />
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
