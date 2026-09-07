// Minimal centered layout for the logged-out auth surface (signup / login /
// forgot-password / reset-password). A single card container keeps these pages
// visually consistent and isolated from the (future) logged-in app chrome.
//
// NOTE: this layout is purely presentational. The real auth gate is per-page
// `auth.api.getSession()` and the optimistic redirect in src/proxy.ts — NOT
// this layout (RESEARCH Anti-Patterns: Proxy/layout are not the security boundary).
//
// COLOUR (DS-13 / D-15 / THEME-05): the shell surface reads a semantic token, so it follows a theme
// switch. It used to be a numbered neutral paired with a dark-mode variant — a frozen value no theme
// could reach, plus a half-built second colour scheme nothing in the app ever activates (D-129: the
// app tree carries no variant at all; the dormant block in globals.css and the vendored primitives
// keep theirs). `foreground` on `muted` is a declared pairing in src/lib/design/contrast-pairs.ts,
// measured 18.16 court / 16.89 grove. The muted-surface token below is UNCHANGED by plan 15-06, and
// it is now doing a second job: it is the figure the transactional email's outer ground quotes, so
// the surface a person sees while creating an account and the surface the resulting email arrives on
// are one value.
//
// ⚠ FOUR THINGS ARE NAMED DESCRIPTIVELY IN THE PROSE BELOW RATHER THAN QUOTED AS CODE — the public
// header component, the wordmark class constant, the surface token, and the test-id attribute. This
// is `booking-row.tsx:112`'s precedent ("Named descriptively rather than quoted, because the DS-03
// gate counts that string") applied to plan 15-06's own acceptance greps: each of those four is
// asserted here by a source scan with an exact expected count, and a comment that quotes the token
// it explains is a comment that fails the gate it is documenting. The identifiers appear in the
// import list and the render below, which is where a reader should be reading them anyway.
//
// ── PLAN 11-10's RECORD, KEPT VERBATIM BECAUSE PLAN 15-06 IS THE DECISION IT INVITED ──────────────
//
// ── THE CENTRED WORDMARK IS GONE, AND ITS REMOVAL IS THE POINT (SHELL-01, plan 11-10) ─────────────
// This layout used to render its own `text-2xl` FitOut wordmark linking home, above the card. The
// shell now supplies one, and two wordmarks on one screen — at two different type sizes, linking to
// the same place — is exactly the duplication this phase exists to end. Nothing else about these
// screens changes here: Phase 15 owns the auth surfaces.
//
// The `(auth)` composition is the PUBLIC one, unmodified. A `Log in` / `Sign up` pair in the header
// of the login page is mildly redundant and is deliberately not special-cased: a fourth composition
// whose only difference is a suppressed button is a fork, and the drift it invites costs more than
// the redundancy. Phase 15 may decide otherwise with the whole surface in front of it.
//
// ── PHASE 15 DID DECIDE OTHERWISE, WITH THE WHOLE SURFACE IN FRONT OF IT (D-162, plan 15-06) ──────
//
// That last sentence has now been acted on, and SHELL-01's argument is the reason rather than the
// casualty. D-162 chose one composition for all four auth documents: a wordmark above ONE card on a
// quiet ground. The public header component is therefore deleted from this file — not because the
// header is unwanted, but because keeping it would put a header wordmark and a card-column wordmark
// on one screen, which is byte-for-byte the duplication SHELL-01 removed. The wordmark moves back, and
// the header goes; exactly one of the two survives, which was 11-10's rule all along.
//
// TWO THINGS THE MOVE BUYS THAT THE HEADER COULD NOT. The wordmark now lives in the LAYOUT, so it is
// present in EVERY state including `(auth)/error.tsx` — and so is the landmark opened below, which
// is the caveat that boundary's own header records ("a landmark that appears only when a page fails
// is a landmark whose presence encodes an error state"). Putting the landmark here dissolves it
// instead of arguing around it. And the wordmark's type is not re-typed: it reads the wordmark class
// constant the chrome exports, so "one identity, two surfaces" is a fact about the tree rather than
// an instruction to whoever edits one of them next.
//
// THE ACCEPTED TRADEOFF, WRITTEN DOWN RATHER THAN DISCOVERED LATER. `src/proxy.ts` matches only
// `/login` and `/signup`, so a SIGNED-IN visitor can intentionally reach `/forgot-password` and
// `/reset-password` — the verified-but-stale-device path. On those two routes that visitor loses the
// header's mode switch, notification bell and profile link for the duration of the reset. The route
// out is the wordmark, which links `/`; from there the full chrome and all three affordances return.
// No route is orphaned, and nothing is reachable ONLY from the header these two documents drop.
//
// NO TEST-ID ATTRIBUTE ON THE WORDMARK, deliberately. `site-brand` is declared in
// `src/lib/design/selector-contract.ts` as the CHROME's id, and 15-UI-SPEC pins `SELECTOR_IDS` at
// +0 for this phase. Copying the id here would put one hook on two unrelated elements and make every
// container query that scopes through it resolve on whichever the page happens to render.
//
// The wordmark is the first tabbable element on these documents and keeps the BROWSER-DEFAULT focus
// indicator. The DS-05 ring recipe is for controls that override their own outline (it lives on
// `Button` and is copied by the controls that suppress theirs); this link overrides nothing, so
// adding a ring here would be a new inconsistency dressed as a fix — `site-chrome.tsx`'s
// `NAV_LINK_CLASS` note, followed rather than re-derived.

import Link from "next/link";

import { BRAND_CLASS } from "@/components/patterns/site-chrome";
import { SiteFooter } from "@/components/patterns/site-footer";
import { cn } from "@/lib/utils";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* THE ONE `main` PER DOCUMENT (D-88.1), for the `(auth)` group. It is this element and not a
          wrapper inside each page: four pages plus one error boundary is five places to forget it,
          and the boundary is the place forgetting it is least visible. The class list is byte-
          identical to the `<div>` it replaces — this is a landmark promotion, not a re-layout. */}
      <main className="flex flex-1 flex-col items-center justify-center bg-muted px-4 py-12">
        {/* `space-y-6` sets the 24px gap between the wordmark and the card. The column keeps
            `max-w-sm`: the wordmark is centred within the card's own width, not the viewport's, so
            the two edges agree at every breakpoint. */}
        <div className="w-full max-w-sm space-y-6">
          <Link href="/" className={cn(BRAND_CLASS, "block text-center")}>
            FitOut
          </Link>
          {children}
        </div>
      </main>
      {/* SHELL-02. The auth surface shares the PUBLIC composition unmodified (see above), and that
          includes the footer: `/terms` and `/privacy` are reachable from the page where someone is
          being asked to create an account, which is the page where they most want to read them.

          Kept verbatim by plan 15-06, with one correction it is owed: as of D-162 it is the FOOTER
          half of the public composition that is shared, not the whole of it. The argument above is
          untouched by that — `/terms` and `/privacy` are reachable from the signup page for exactly
          the reason given, and this is the only element left that reaches them. */}
      <SiteFooter />
    </div>
  );
}
