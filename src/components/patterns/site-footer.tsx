// SHELL-02 — the app's ONE footer. Presentational, domain-ignorant, and the same on every route it
// renders on (11-UI-SPEC § The Footer).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHERE IT RENDERS, AND THE TWO ROUTES IT DELIBERATELY DOES NOT
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every route EXCEPT two, and both exceptions are contracts rather than oversights:
//
//   • `/listings/[id]/book` — SHELL-03 forbids navigation that can silently lose an active hold, and
//     a footer is a grid of links. `src/app/listings/[id]/book/layout.tsx` carries the same note at
//     the point where someone would "fix" the inconsistency by adding one.
//   • `global-error.tsx` — it renders its own `<html>`/`<body>` and receives no stylesheet at all, so
//     every class below would be inert. Its own contract already says "Footer / header: none".
//
// The SEVEN mount sites are the six group layouts — `(public)`, `(auth)`, `(app)`, `(host)/host`,
// `listings/[id]/(detail)`, `(legal)` — plus `src/app/not-found.tsx`. The root not-found is the one
// that is easy to miss: it sits directly inside `src/app/layout.tsx`, ABOVE all six groups, so
// nothing wraps it and it composes its own shell. `(legal)` is the seventh, added by plan 11-15.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THERE IS NO `<nav>` ELEMENT HERE, AND THAT IS A CRITERION RATHER THAN A PREFERENCE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `11-UI-SPEC.md` AC#4 is falsifiable and app-wide: *`getByRole("navigation")` resolves to exactly 1
// at 320px and at 1280px.* The one landmark is the header's, and `site-chrome.tsx` went to real
// trouble to keep it at one across both of `SiteNav`'s placements. Wrapping these links in a second
// landmark would take that count to two on every route in the app and break AC#4 everywhere, to buy
// a landmark that WAI-ARIA does not ask for: `<footer>` is already a `contentinfo` landmark, and a
// list of links inside it is reachable as exactly that.
//
// `selector-contract.ts:287-291` reasons about "the footer's nav" when it explains why `site-nav`
// needs a test id. That argument survives this file unchanged — it is about a role query being unable
// to carry an ABSENCE assertion on the checkout route — and AC#4 is the harder constraint of the two.
// Recorded here rather than by editing that row, because the row's conclusion is still correct.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NO RAISED SURFACE. A FOOTER IS NOT A CARD.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Elevation: none, per the UI-SPEC's own row. The boundary between the page and this block is
// `border-t` over `bg-muted`, the same mechanism `site-chrome.tsx` uses at the other end of the page.
// The named elevation steps are referred to descriptively and never spelled, following
// `booking-row.tsx:112`'s precedent: `elevation-z.test.ts` pins per-file call-site inventories, and a
// comment naming a utility is textually indistinguishable from a call site using it — this plan's own
// acceptance criterion is a zero-count grep over this file for that prefix.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE SUPPORT ENTRY IS ABSENT, NOT DISABLED (D-26)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// FitOut has no support inbox, so `SUPPORT_EMAIL` is `null` and the third column renders TWO entries
// instead of three. Nothing about support appears in the DOM: no greyed link, no `disabled` control,
// no tooltip, no "coming soon", no link to a placeholder address. The guard below has NO ELSE-BRANCH,
// and that is the whole design — an affordance that looks present and does nothing is a worse lie
// than an absence, and a fabricated address is banned outright by `11-UI-SPEC.md` § Anti-Patterns.
//
// DO NOT "IMPROVE" THIS INTO A DISABLED AFFORDANCE. The one legitimate change is to give
// `src/lib/site.ts` a real, monitored address; the entry then appears by itself and
// `tests/design/site-contacts.test.ts` switches to the branch that demands it. Read that file's
// header and `src/lib/site.ts`'s D-26 block before touching the conditional.
//
// This file is a SERVER COMPONENT: NO CLIENT-BOUNDARY DIRECTIVE PROLOGUE, no state, no effect, no
// event handler, and no domain import — the `patterns/` membership rule 11-07 established. It reads
// two constants and `next/link`, which is what keeps it safe to mount in `src/app/not-found.tsx`, the
// last prerendered route in the build, whose static status depends on nothing in its subtree reaching
// the database.
//
// The directive is named DESCRIPTIVELY rather than quoted, and that is a measured choice rather than
// a stylistic one. `empty-state.tsx:17-21` quotes it and records the consequence: a raw grep for the
// directive on that file returns a NON-ZERO count against a correct file, because the only way to say
// "this file does not carry it" is to write it. This plan's own acceptance criterion IS that grep —
// and the first draft of this very paragraph tripped it twice, once by quoting the directive and once
// by quoting the grep command that looks for it. So this file follows `booking-row.tsx:112`'s
// precedent instead and keeps the criterion checkable in the form it was written.

import Link from "next/link";

import { absoluteOpsUrl, absolutePublicUrl } from "@/lib/app-origins";
import { SITE_TAGLINE, SUPPORT_EMAIL } from "@/lib/site";

/**
 * A column heading. `text-sm font-medium text-foreground` from the UI-SPEC's table, verbatim.
 *
 * `foreground on muted` is a DECLARED pairing (`contrast-pairs.ts`, 18.16 court / 16.89 grove), so
 * this file adds zero rows to the contrast inventory. The same is true of the link/body colour below
 * (`muted-foreground on muted`, 4.82 / 5.28) — the tightest neutral pairing in the system and
 * already measured, which is why the footer is allowed a muted surface at all.
 */
const HEADING_CLASS = "text-sm font-medium text-foreground";

/**
 * A footer link, and the body copy that sits beside it. One constant for both, because the UI-SPEC
 * gives them one row: the tagline and the links are the same size and the same ink, and the links
 * add only their hover treatment.
 */
const BODY_CLASS = "text-sm text-muted-foreground";

/**
 * The link's hover treatment, appended to `BODY_CLASS`.
 *
 * `underline-offset-4 hover:underline hover:text-foreground` — deliberately NOT given the DS-05 focus
 * recipe, for the reason `site-chrome.tsx:99-104` records for the header links: that recipe lives on
 * controls that override their own outline, and these override nothing, so they keep the browser's
 * own focus indicator exactly as every other text link in this app does.
 */
const LINK_CLASS = `${BODY_CLASS} underline-offset-4 hover:underline hover:text-foreground`;

/**
 * The two columns of destinations, authored as data so the markup below cannot drift between them.
 *
 * `/terms` and `/privacy` EXIST — plan 11-15 created them (`src/app/(legal)/terms/page.tsx` and
 * `src/app/(legal)/privacy/page.tsx`). The links were authored here first, one plan ahead of the
 * routes, because the footer is the reason those routes exist at all; both resolve to a real page
 * today. Their COPY is still a declared placeholder — the real Terms and Privacy Policy are a
 * `human_needed` item blocked on six business facts, and `tests/design/legal-copy.test.ts` holds
 * the placeholder admission in place until they arrive. That is a gap in the writing, not in the
 * routing: nothing in this footer is a dead link.
 */
const PRODUCT_LINKS = [
  { href: absolutePublicUrl("/"), label: "Find a space" },
  { href: absolutePublicUrl("/host"), label: "Host your space" },
  { href: absoluteOpsUrl("/login"), label: "FitOut Ops" },
] as const;

const LEGAL_LINKS = [
  { href: absolutePublicUrl("/terms"), label: "Terms" },
  { href: absolutePublicUrl("/privacy"), label: "Privacy" },
] as const;

const PUBLIC_HOME = absolutePublicUrl("/");

export function SiteFooter() {
  return (
    <footer
      data-testid="site-footer"
      // `mt-auto` is the whole reason every layout wraps its children in `min-h-dvh flex flex-col`
      // (plan 11-10) — it pushes this block to the bottom of a SHORT page instead of leaving it
      // floating under two paragraphs of content.
      // `print:hidden` (13-12 / D-74): the same rule the header carries, and for a sharper reason here.
      // This block is `bg-muted` with a link column on it; print drops backgrounds by default, so on
      // paper it becomes a page of legal and navigation links in ink the reader cannot use. Nothing in
      // it belongs on a printed booking record. `print:` compiles only inside `@media print`, so screen
      // rendering is unchanged.
      className="mt-auto border-t bg-muted print:hidden"
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:grid-cols-3 sm:px-6 sm:py-12">
        {/* ── Column 1: the wordmark and the app's one sentence ─────────────────────────────────
            The wordmark LINKS home. `selector-contract.ts:279-283` records that this is the second
            link home with the accessible name "FitOut", which is precisely why the header's brand
            carries a `site-brand` test id instead of being reached by its name.

            The sentence is `SITE_TAGLINE`, imported. It is the same string `src/app/layout.tsx`'s
            `metadata.description` reads, from the same constant — one sentence, one owner. Retyping
            it here would be the second literal that the UI-SPEC's "one owner" clause forbids. */}
        <div className="space-y-3">
          <Link href={PUBLIC_HOME} className={`${HEADING_CLASS} underline-offset-4 hover:underline`}>
            FitOut
          </Link>
          <p className={BODY_CLASS}>{SITE_TAGLINE}</p>
        </div>

        {/* ── Column 2: Product ─────────────────────────────────────────────────────────────────
            `<h2>` rather than a styled `<div>`: a screen-reader user navigates a footer by its
            headings, and a group of links with no accessible group name is a list of destinations
            with no context. The TYPE is the UI-SPEC's, not one of the four named roles — a footer
            column label is chrome, and the roles are for content. */}
        <div className="space-y-3">
          <h2 className={HEADING_CLASS}>Product</h2>
          <ul className="space-y-2">
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK_CLASS}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* ── Column 3: Legal & support ─────────────────────────────────────────────────────────
            Two entries today, three when FitOut has an inbox. See the D-26 block at the top of this
            file before adding a third by hand. */}
        <div className="space-y-3">
          <h2 className={HEADING_CLASS}>Legal &amp; support</h2>
          <ul className="space-y-2">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={LINK_CLASS}>
                  {link.label}
                </Link>
              </li>
            ))}
            {/* THE GUARD, AND IT HAS NO ELSE-BRANCH ON PURPOSE (D-26). While `SUPPORT_EMAIL` is
                `null` this renders nothing at all — not a placeholder, not a disabled link. The
                address is INTERPOLATED from the constant and never retyped, which is the half
                `tests/design/site-contacts.test.ts` checks structurally the moment the constant is
                set: exactly one such link, and it must read the constant rather than a literal. */}
            {SUPPORT_EMAIL !== null ? (
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className={LINK_CLASS}>
                  Support
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </footer>
  );
}
