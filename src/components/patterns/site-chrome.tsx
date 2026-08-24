// SHELL-01 — ONE header geometry, THREE compositions. Presentational, domain-ignorant, geometry only.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IS SHARED IS THE BOX, NOT THE CONTENT — WHICH IS WHY D-04 SURVIVES THIS FILE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(app)/layout.tsx:38-45` and `(host)/host/layout.tsx:56-63` each carry an explicit written
// instruction: *"There IS no shared header component… D-04 deliberately made the host shell
// distinct… Do NOT refactor the two headers into one here."* That instruction is HONOURED, not
// contradicted, and the distinction is exact:
//
//   • MERGED here: height, padding, container width, the bottom boundary, stickiness, and three
//     named slots. Every composition produces an identical `boundingBox().height`.
//   • NOT MERGED: the wordmark text, the surface, the link set, the actions cluster. The host keeps
//     `FitOut · Hosting`, its own neutral-tint surface and its own destinations; the booker keeps its
//     own; the public composition has neither's.
//
// What ends is three independently-drifting BOXES. Nothing about what those boxes contain is decided
// here, which is what makes this file safe to share between surfaces D-04 requires to look different.
//
// The two in-file instructions are AMENDED BY PLAN 11-12, when it converts those two layouts onto
// this shell — not by this plan, which adds a header to the four public routes that have none and
// touches neither group layout.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE HEIGHT COMES FROM A TOKEN, NEVER FROM THE TYPE INSIDE IT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `HEADER_HEIGHT` is read from `@/lib/design/measurements`; the literals live only there. A header
// sized by padding around a `text-lg` wordmark measures DIFFERENTLY IN EACH THEME, because grove's
// type is one step larger throughout — so every visual-regression baseline would differ between the
// two themes in its GEOMETRY rather than only in its colour, and a real geometry regression would be
// indistinguishable from the theme swap that is supposed to be the only variable. Fixing the height
// to a token makes the header the one thing in the app that is provably identical in both themes.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE BOTTOM BOUNDARY IS A BORDER. DO NOT PUT THE NAMED STICKY ELEVATION ON THIS HEADER.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `--elevation-sticky` has a NEGATIVE y-offset — an UPWARD cast, authored in Phase 10 explicitly
// "for bottom-anchored bars". On a header pinned to the top of the viewport it casts its shadow
// above the viewport edge, i.e. it renders nothing at all while looking, in source, exactly like a
// styled boundary. The boundary is `border-b`, and `--border` is a declared decorative divider.
//
// The named step is referred to DESCRIPTIVELY above rather than quoted as a class, following
// `booking-row.tsx:112`'s precedent (*"Named descriptively rather than quoted, because the DS-03 gate
// counts that string"*) — `elevation-z.test.ts` pins that utility's call sites as an exact per-file
// map, and a comment warning against it is textually indistinguishable from a call site using it. It
// keeps its ZERO call-site inventory until Phase 12's mobile CTA bar, which is bottom-anchored and is
// the surface it was authored for.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ACTIONS SLOT IS A RESERVATION, AND THAT IS THE WHOLE NO-LAYOUT-SHIFT CONTRACT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The actions cluster is session-derived on pages that are otherwise fully public, so it resolves
// after the rest of the header. `AUTH_SLOT_BOX` (`h-8 min-w-44`) is the box it occupies whether it is
// pending or resolved, and `ml-auto … justify-end` anchors it RIGHT so resolution moves only the
// cluster's own left edge — the brand, the header box and every element on the page are outside it.
// `min-w-44` (176px = 4 × 44) is the widest resolved state and is what stops the fallback collapsing
// to zero. `patterns/auth-slot-skeleton.tsx` is the fallback and reads the same constant.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// EXACTLY ONE NAVIGATION LANDMARK AT ANY VIEWPORT (T-11-NAVDUP)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `<SiteNav>` renders the SAME `<NavLinks>` in two DOM placements — an inline bar above `md:` and a
// drawer below it — because the host cluster measures 352px against 226px of available width at
// 320px in grove. Both placements live INSIDE the one `<nav data-testid="site-nav">` element, so the
// landmark count is one at every width rather than one-above-`md:`-and-none-below. The inactive
// placement is hidden with `hidden` — NOT `sr-only`, NOT `opacity-0` — because `display: none`
// removes the subtree from the accessibility tree, and the other two do not: with `sr-only` a screen
// reader would announce the site's navigation twice at every viewport.
//
// This file is a SERVER COMPONENT and every export in it is too. `ResponsiveDialog` (the drawer) is a
// client component and rendering one from a server component moves the boundary for that overlay
// only — no state, no effect and no event handler is declared here.

import Link from "next/link";
import type { ReactNode } from "react";
import { MenuIcon, UserIcon } from "lucide-react";

import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AUTH_SLOT_BOX, AUTH_SLOT_ICON, HEADER_HEIGHT } from "@/lib/design/measurements";
import type { HostNavId, NavLink } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * The wordmark's type, byte-identical to the three shipped wordmarks
 * (`(app)/layout.tsx:73`, `(host)/host/layout.tsx:88`, and the centred one this plan removes from
 * `(auth)/layout.tsx`). Its colour is inherited `--foreground`; there is no logo asset (D-127).
 *
 * EXPORTED SINCE PLAN 15-06, and the export is the mechanism behind a claim rather than a
 * convenience — the same register `measurements.ts`'s `BOOKING_SHELL` is written in. D-162 put the
 * wordmark back above the auth card, on a surface this file does not render: `(auth)/layout.tsx` is
 * outside the chrome, so it cannot reach the constant by composing `SiteChrome`. Left unexported it
 * would have hand-typed the three classes, and "one identity, two surfaces" would have been an
 * instruction to the next author instead of a fact about the tree. It is falsifiable only because
 * both surfaces read THIS binding: change the value here and the auth wordmark moves with the
 * header's, by construction rather than by diligence.
 */
export const BRAND_CLASS = "text-lg font-semibold tracking-tight";

/**
 * A header link's type, byte-identical to the four shipped header links.
 *
 * Deliberately NOT given the DS-05 focus recipe here. That recipe lives on `Button` and is copied by
 * the controls that override their own outline; these links override nothing, so they keep the
 * browser's own focus indicator exactly as the shipped header links do. Adding a ring to four links
 * in this file and not to the fifty elsewhere would be a new inconsistency dressed as a fix.
 */
const NAV_LINK_CLASS = "text-sm font-medium underline-offset-4 hover:underline";

export type SiteChromeProps = {
  /**
   * The wordmark's CONTENT — passed in, never written here.
   *
   * This is the prop that lets one geometry serve three compositions without merging them: the host
   * passes `FitOut · Hosting` with its muted second half, the booker and the public pass `FitOut`,
   * and this file renders no product copy of its own.
   */
  brand: ReactNode;
  /**
   * Where the wordmark navigates, or `null` for no navigation at all.
   *
   * `null` renders the brand as a `<span>` rather than a `<Link>`, and it is a REQUIRED prop rather
   * than an optional one so that "this composition has no link home" is a decision the caller had to
   * make. `/listings/[id]/book` passes `null`: SHELL-03 forbids navigation that can silently lose an
   * active hold, and a wordmark link home is the single most likely way to lose one.
   */
  brandHref: string | null;
  /**
   * The primary navigation, wrapped by this file in the one `<nav>` landmark. Omit for the public and
   * booker compositions, which have no primary nav at all.
   */
  nav?: ReactNode;
  /**
   * The right-hand cluster, rendered inside the reserved auth slot. Omit for the minimal composition.
   */
  actions?: ReactNode;
  /**
   * The header's surface. `background` for the public and booker compositions; `muted` for the host,
   * which D-04 made distinct and which this file preserves rather than normalises.
   */
  surface?: "background" | "muted";
};

export function SiteChrome({
  brand,
  brandHref,
  nav,
  actions,
  surface = "background",
}: SiteChromeProps) {
  return (
    <header
      data-testid="site-header"
      // Opaque is mandatory, not cosmetic: page content scrolls BENEATH a sticky header, and a
      // translucent one renders the content through it.
      className={cn(
        HEADER_HEIGHT,
        "sticky top-0 z-(--z-sticky) border-b",
        surface === "muted" ? "bg-muted" : "bg-background",
        // ── THE PRINT CONTRACT (13-12 / D-74). App chrome is not part of any document a person prints.
        // A sticky navigation bar on paper is a band of ink that navigates nowhere, and here it is
        // actively harmful: this element is `border-b` over a painted surface, and print drops
        // backgrounds by default — so it would reproduce as a stray rule across the top of the sheet
        // with the fill it was meant to sit on missing.
        //
        // A Tailwind `print:` utility compiles to `@media print` and NOTHING else, so every screen
        // rendering is byte-identical after this line and all 52 GATE-VRT baselines are unmoved
        // (13-RESEARCH Assumption A4 — worth one baseline run, which is plan 13-15's).
        "print:hidden",
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        {/* THE ID IS WRITTEN TWICE HERE ON PURPOSE, AND IT MUST BE A LITERAL ATTRIBUTE IN BOTH
            BRANCHES. The two branches are mutually exclusive, so the DOM always holds exactly one
            `site-brand` — measured in jsdom, both branches, one node each. The tidier shapes are both
            wrong for the same mechanical reason: `selector-contract.test.ts`'s collector is an AST
            walk over JSX ATTRIBUTES whose value is a string LITERAL (its own fixtures assert that
            `data-testid={id}` yields nothing), so hoisting the id into a spread object or into a
            named constant would make this declared id INVISIBLE to the gate — and to plan 11-22's
            forward direction, which is the half that checks every declared id actually shipped. A
            source-level tidy that blinds the gate is a worse trade than a repeated literal.

            What genuinely must not drift is the TYPE, and that is shared: both branches read
            `BRAND_CLASS`, so the wordmark cannot be styled differently depending on whether it links. */}
        {brandHref === null ? (
          <span data-testid="site-brand" className={BRAND_CLASS}>
            {brand}
          </span>
        ) : (
          <Link data-testid="site-brand" href={brandHref} className={BRAND_CLASS}>
            {brand}
          </Link>
        )}

        {/* The landmark is rendered only when there IS navigation. `selector-contract.ts`'s row for
            this id says the load-bearing assertion is an ABSENCE — the checkout composition renders
            no primary nav at all — so an always-present empty `<nav>` would make that assertion green
            for the wrong reason on the one route it exists to check. */}
        {nav ? (
          <nav data-testid="site-nav" className="flex items-center gap-3">
            {nav}
          </nav>
        ) : null}

        {/* Same argument for the slot: it is a RESERVATION for content that resolves late, and the
            minimal composition has no such content. `ml-auto` is what anchors it right, so the only
            thing that moves when the session lands is the cluster's own left edge. */}
        {actions ? (
          <div
            data-testid="site-auth-slot"
            className={cn(AUTH_SLOT_BOX, "ml-auto flex items-center justify-end gap-3")}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/**
 * The leaf renderer for a nav inventory. ONE component, TWO placements — see the landmark note above.
 *
 * `orientation` changes the flow direction and nothing else: the links, their classes, their order
 * and their badges are identical in both placements by construction, because there is one component
 * and one data source (`src/lib/nav.ts`).
 */
export function NavLinks({
  links,
  badges,
  orientation = "inline",
}: {
  links: readonly NavLink[];
  /**
   * Per-row counts, keyed by the inventory's own id union. A row whose `badge` flag is set and whose
   * count is absent or zero renders NO badge — "hidden at zero" is D-65's rule and it is applied here
   * rather than at each call site.
   */
  badges?: Partial<Record<HostNavId, number>>;
  orientation?: "inline" | "stacked";
}) {
  return (
    <div
      className={cn(
        "flex gap-3",
        orientation === "stacked" ? "flex-col items-start gap-4" : "items-center",
      )}
    >
      {links.map((link) => {
        const count = badges?.[navIdOf(link)] ?? 0;
        const showBadge = link.badge === true && count > 0;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(NAV_LINK_CLASS, showBadge && "inline-flex items-center gap-1.5")}
          >
            {link.label}
            {showBadge ? (
              <Badge variant="secondary" aria-label={`${count} ${link.label.toLowerCase()} to review`}>
                {count}
              </Badge>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Recover a row's id from the row itself.
 *
 * The alternative is threading the id through `NavLinks`' props alongside the row, which is two
 * spellings of one identity and the exact drift `nav.ts` exists to remove. The href is unique by
 * construction — it is the destination — so the last path segment is a total function of the row.
 */
function navIdOf(link: NavLink): HostNavId {
  return link.href.split("/").pop() as HostNavId;
}

/**
 * The below-`md:` placement: the same `NavLinks`, inside the app's ONE overlay primitive.
 *
 * `ResponsiveDialog` rather than a second mechanism — `ui/sheet.tsx` is asserted absent by
 * `tests/design/sheet-absent.test.ts`, and adding one here would give the app two focus traps and two
 * escape behaviours for one concept. `hideTitle` because a visible "Menu" line above a list of two
 * links is redundant chrome; the accessible name still reaches assistive technology, which is why the
 * title is hidden rather than omitted (a dialog with no accessible name is a WCAG 4.1.2 failure).
 *
 * The trigger carries `aria-label="Menu"` and its glyph `aria-hidden`, for the same reason the
 * profile control below does: an icon-only control has no accessible name otherwise.
 */
export function NavDrawer({
  links,
  badges,
}: {
  links: readonly NavLink[];
  badges?: Partial<Record<HostNavId, number>>;
}) {
  return (
    <ResponsiveDialog
      title="Menu"
      hideTitle
      trigger={
        <Button variant="ghost" size="icon" aria-label="Menu" className={AUTH_SLOT_ICON}>
          <MenuIcon aria-hidden="true" />
        </Button>
      }
    >
      <NavLinks links={links} badges={badges} orientation="stacked" />
    </ResponsiveDialog>
  );
}

/**
 * The nav slot's contents: one inventory, both placements, one landmark.
 *
 * Callers pass this to `SiteChrome`'s `nav` prop; `SiteChrome` supplies the `<nav>` element around
 * it. Splitting it that way keeps the landmark (a geometry/semantics decision) in the shell and the
 * placement rule (a responsive decision about a specific link set) here.
 */
export function SiteNav({
  links,
  badges,
}: {
  links: readonly NavLink[];
  badges?: Partial<Record<HostNavId, number>>;
}) {
  return (
    <>
      <div className="hidden md:flex">
        <NavLinks links={links} badges={badges} />
      </div>
      <div className="md:hidden">
        <NavDrawer links={links} badges={badges} />
      </div>
    </>
  );
}

/**
 * The `Profile` control: an icon below `sm:`, an icon plus its label from `sm:` up.
 *
 * TWO MECHANISMS, TWO DIFFERENT REASONS, AND THE COMMENT HAS TO SAY BOTH — because applying either
 * one for the other's reason produces a real accessibility failure:
 *
 *   • `hidden sm:inline` on the label, on ONE instance, never a conditional render. `display: none`
 *     removes the label from the accessibility tree below 640px, which is what the responsive budget
 *     needs (the signed-in cluster measures 200px against 226px available, and dropping the label
 *     takes it to ~176px). A conditional render would be two elements that can drift; `sr-only` would
 *     keep the text in the tree and defeat the purpose.
 *   • `aria-label="Profile"` on the WRAPPER, and `aria-hidden="true"` on the glyph. This is the half
 *     that is easy to omit and is not optional: with the label display-none'd and the icon the only
 *     remaining content, an unlabelled control has NO ACCESSIBLE NAME AT ALL below 640px — a WCAG
 *     4.1.2 failure on the control that reaches a user's own account. `NotificationBell` in the same
 *     cluster already carries an `aria-label` for exactly this reason.
 *
 * The `aria-label` is deliberately the same string as the visible label, so the accessible name does
 * not change across the breakpoint and voice control keeps working at both widths.
 */
export function ProfileLink({ href = "/profile" }: { href?: string } = {}) {
  return (
    <Link
      href={href}
      aria-label="Profile"
      className={cn(NAV_LINK_CLASS, "inline-flex items-center gap-1.5")}
    >
      <UserIcon aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Profile</span>
    </Link>
  );
}
