// The invite route's SHELL and its ONE inactive surface — the two things `/invite/[token]` and
// `/invite/[token]`'s not-found boundary both render (GROUP-02 / GROUP-03, 08-UI-SPEC §3).
//
// ── WHY THIS FILE EXISTS AT ALL (plan 11-19, T-11-ORACLE) ─────────────────────────────────────────
// Both of these were module-private functions inside `(public)/invite/[token]/page.tsx` until this
// plan added `(public)/invite/[token]/not-found.tsx` beside it. That second file has to render the
// SAME inactive surface — 08-06 deliberately folded "malformed token" and "unknown token" onto one
// identical response so the page could not become a probe oracle, and a not-found page that looks
// different reintroduces exactly that oracle one route over.
//
// The obvious way to do that is to write the markup twice and keep the two in step. That is a
// SECURITY PROPERTY MAINTAINED BY POLICY, and it fails silently the first time somebody restyles one
// of the two files — the failure is invisible to the person making it and visible to whoever is
// walking the token space. So there is one component with two call sites instead: the surfaces
// cannot drift, because there is only one of them.
//
// ── WHY THE COPY IS A PROP AND NOT A DEFAULT ─────────────────────────────────────────────────────
// `InviteInactive` takes `title` and `body` with no defaults, which is `patterns/empty-state.tsx`'s
// sharpest rule applied here: the sentence belongs to the surface. Both call sites pass
// `INACTIVE_TITLE` / `INACTIVE_BODY` imported from `@/lib/group/rsvp`, which is the ONE declaration
// of those two sentences in `src/` (plan 11-19's hoist). Keeping them as props rather than baking
// them in is what leaves `tests/design/invite-notfound-parity.test.ts` something to assert: it can
// see, per file, that each entrance reaches the single source rather than typing its own words.
//
// ── THE BOX IS `PanelCard` (DS-11, plan 11-13), AND ONLY ITS ADDRESS CHANGED ──────────────────────
// 11-UI-SPEC names *"`invite/[token]`'s `InviteCard`"* among the five surfaces the pattern replaces,
// and `tests/design/card-pattern-coverage.test.ts`'s inventory row for that surface moved from the
// page to this file in the same commit that moved the component — which is what that gate's own
// forward-half failure message asks for ("Either the file moved (update this inventory in the commit
// that moved it) or the walk is broken"). Nothing else about the box changed.
//
// The inner `space-y-6` is kept as an explicit wrapper rather than dropped onto the pattern:
// `PanelCard`'s content rhythm is `space-y-4`, and this shell's three blocks — wordmark, rule, state
// — are the widest spacing on the page. A pattern that took a spacing prop would be a pattern that
// had stopped deciding anything, so the surface owns its own inner rhythm and the pattern owns the
// box.
//
// A SERVER COMPONENT: no `"use client"`, no session read, no database. `not-found.tsx` at the root of
// this route's segment must stay cheap and must never dial out, and a shared surface that quietly
// imported a session would take that away from it.
//
// ── THE DESIGN-SYSTEM PASS (plan 13-08 · 13-CONTEXT D-79) ────────────────────────────────────────
// Two changes, and NEITHER touches what this file is for. The box was already `PanelCard`; the
// copy is still the caller's; both entrances still render one component.
//
//   1. THE HEADING IS THE NAMED ROLE. It was `text-xl leading-tight font-semibold`, which is the
//      exact shape `type-scale.test.ts`'s header warns about: a co-located utility BEATS a named
//      step's per-theme facet (`font-semibold` sets `--tw-font-weight`, so a role's weight is never
//      reached on a heading that also carries it). `text-heading` alone therefore travels — 20/600
//      at court, 24/700 at grove — where the old spelling was 20→22px and 600 in both. This is the
//      role 11-UI-SPEC assigns to a `PanelCard` title by name, and this heading is that title.
//   2. ⚠ THE INACTIVE STATE IS NO LONGER A LIVE REGION, AND THE REMOVAL IS THE POINT.
//      `InviteInactive` wrapped its two STATIC sentences in `role="status" aria-live="polite"` —
//      but nothing here ever CHANGES. Both entrances render this surface on the FIRST paint of a
//      fresh navigation: the page's `!group.active` branch and the segment's not-found boundary.
//      A screen reader already reads a freshly navigated page from the top, so the region announced
//      either nothing at all or the same sentences twice, and a page is not an event (GATE-03's
//      rule for this phase; `share-link-box.tsx` states the same rule from the other side, which is
//      why ITS alert stays silent until the URL actually moves).
//
//      THE PARITY IS UNAFFECTED, AND THAT IS STRUCTURAL RATHER THAN LUCKY: there is ONE component,
//      so both entrances lost the attribute in the same character. T-11-ORACLE's property is that
//      the two surfaces cannot differ, and one component with two call sites is why.
//
//      The live-region INVENTORY bookkeeping is plan 13-14's; `live-regions.ts` still lists this
//      file under `LIVE_REGION_EXCLUSIONS`, which is correct — the exclusion says Phase 13 owns the
//      audit, not that a region must exist. ⚠ That file's header quotes a MEASURED count of the
//      tree's `aria-live` sites; this commit moves it by one, and 13-14 re-measures.

import type { ReactNode } from "react";
import Link from "next/link";
import { Link2OffIcon } from "lucide-react";

import { PanelCard } from "@/components/patterns/panel-card";
import { Separator } from "@/components/ui/separator";

/**
 * The card shell every state renders inside — header-less, with a FitOut wordmark lockup at the top
 * so an invited stranger can tell what they have opened (08-UI-SPEC §3, brand trust).
 *
 * The wordmark is NOT coral. 08-UI-SPEC §Color enumerates that phase's accent exhaustively and
 * assigns the one coral on this page to `Yes, I'm coming`; a coral wordmark would put two of them on
 * a surface whose whole job is a single decision. It matches the shipped booker/host headers instead.
 */
export function InviteCard({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
      <PanelCard>
        <div className="space-y-6">
          <div className="text-center">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              FitOut
            </Link>
          </div>
          <Separator />
          {children}
        </div>
      </PanelCard>
    </main>
  );
}

/**
 * THE single calm inactive state (08-06 Open Q7) — one component, rendered by BOTH entrances to it:
 *
 *   • `(public)/invite/[token]/page.tsx`'s `!group.active` branch — unknown, malformed, regenerated,
 *     voided and cancelled-booking tokens, all folded onto one 200 response.
 *   • `(public)/invite/[token]/not-found.tsx` — the segment's not-found boundary, so that a
 *     `notFound()` raised anywhere under this route can never render a DIFFERENT page from the one
 *     an unknown token already gets.
 *
 * There is NO ACTION here, and its absence is deliberate rather than an oversight of the copywriting
 * contract's "every state names what to do next": the next step is *ask the organizer*, which the
 * body says in words, and it is not a link this app can offer. A "Back to search" button would also
 * be the difference a visitor uses to tell the two entrances apart if only one of them had it.
 */
export function InviteInactive({ title, body }: { title: string; body: string }) {
  return (
    <InviteCard>
      {/* A PLAIN `div` — see the header for why this stopped being a live region. Nothing on this
          surface changes; it is the first paint of a fresh navigation, both times. */}
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        {/* Muted, never an alarm colour: a dead link is usually an organizer who rotated it, not a
            fault of the person holding it (08-UI-SPEC §Color — that phase adds no alarm colour
            anywhere, and 11-UI-SPEC's copywriting contract says an unavailable thing is a normal
            state and is never red). */}
        <Link2OffIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <h1 className="text-heading">{title}</h1>
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
    </InviteCard>
  );
}
