// The ROOT not-found — every URL in this app that matches no route at all (11-UI-SPEC § Not-found).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// IT COMPOSES ITS OWN CHROME, AND THAT IS A CONSEQUENCE OF THE TREE RATHER THAN AN INCONSISTENCY
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This file renders inside `src/app/layout.tsx` and NOTHING ELSE. Plan 11-10 deliberately kept the
// root layout free of chrome — it owns `<html>`, `<body>`, the theme provider, the favicon owner and
// the metadata, and nothing more — because a header there would sit above the two shipped ones in
// `(app)` and `(host)`. The five compositions live in the five GROUP layouts, and a root not-found is
// above all five of them. So a page that wants the shell here has to say so itself.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// IT REACHES NO DATABASE, AND THE HEADER IT RENDERS IS ANONYMOUS *BECAUSE* OF THAT
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// MEASURED at HEAD before this file existed: `/_not-found` is one of exactly two `○ Static` routes in
// the build (`/dev/theme` is the other); every other route is `ƒ Dynamic`. Next PRERENDERS it, which
// means it is rendered by `next build` — on a machine, and in a CI job, with no database. A shell
// component that reached the database module on this path would make the build try to connect, which
// is CI job 1's DB-free property gone: the job that exists to prove the app builds without
// infrastructure. (The import specifier for that module is deliberately not spelled out anywhere in
// this file, comments included, so that this plan's zero-count acceptance criterion over it is a
// statement about the imports and not about the prose — the same trap `empty-state.tsx` records for
// its own `"use client"` mention.)
//
// `PublicHeader` is therefore NOT what this page renders, even though it is the composition every
// other public surface uses. It is an async component that calls `auth.api.getSession`, which reaches
// the auth module and, through it, the database client. What this page renders instead is
// `SiteChrome` — the presentational shell, which imports nothing but geometry — with
// `AnonymousAuthActions`, the same signed-out cluster the public header renders, extracted to a leaf
// module for exactly this reason.
//
// THE COUNTERFACTUAL WAS BUILT, NOT ASSUMED (plan 11-19, and it is worse than predicted). Swapping the
// two lines below for a single `<PublicHeader />` and running `npx next build`:
//
//     ├ ƒ /_not-found          (was ○)
//     ├ ƒ /dev/theme           (was ○ — and this file does not appear in that route)
//
// The route table came back with ZERO static routes. A dynamic root not-found is part of every
// route's tree, so its `await headers()` bailout is not confined to this page — it takes the whole
// build's prerendering with it. Reverted; both routes are `○` again at HEAD.
//
// THE COST IS REAL AND IS ACCEPTED: a SIGNED-IN person who hits a bad URL sees `Log in` / `Sign up`
// in the header of this one page. That is a wrong-looking header on a dead end, and the alternative
// is every route in the app losing its prerender plus a database connection attempt during
// `next build`. Falsified in the other direction too: the build with `DATABASE_URL` pointed at
// `127.0.0.1:59999` exits 0 with this file in the tree, and `/_not-found` stays `○`.
//
// ── THE FOOTER IS HERE NOW, AND THIS FILE IS THE SITE EVERY INVENTORY MISSES ──────────────────────
// RESOLVED BY PLAN 11-14. This paragraph used to record an absence: 11-19's spec said this file
// composes `SiteChrome` AND `SiteFooter`, and `src/components/patterns/site-footer.tsx` did not exist
// yet — 11-14 is wave 7 and `autonomous: false`, this plan was wave 9, and inventing a second footer
// here would have forked the component 11-14 owns along with its SUPPORT_EMAIL / D-26 inverted gate.
// The handoff was carried in `deferred-items.md` instead, and 11-14 has now taken it.
//
// It is worth saying WHY this file needed the handoff at all, because the same trap is still open for
// the next person: 11-14's own `files_modified` lists FIVE layouts, and this file is the SIXTH site.
// The root not-found is ABOVE all five groups — nothing wraps it but `src/app/layout.tsx`, which
// 11-10 deliberately left chrome-free — so a plan that enumerates group layouts cannot see it. The
// inventory that found it was an AST scan for `SiteChrome` / `PublicHeader` call sites under
// `src/app/**`, which returns seven: the six that get a footer, and `listings/[id]/book/layout.tsx`,
// which must not have one.
//
// `SiteFooter` is safe on this prerendered path for the same reason `SiteChrome` is: it imports
// `next/link` and two constants from `src/lib/site.ts` and reaches nothing else. Measured, not
// assumed — the route table before and after this edit is byte-identical and this route is still
// prerendered, with the build run against an unreachable database both times.

import type { Metadata } from "next";
import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";
import { SiteChrome } from "@/components/patterns/site-chrome";
import { SiteFooter } from "@/components/patterns/site-footer";
import { AnonymousAuthActions } from "@/components/site/anonymous-auth-actions";
import { Button } from "@/components/ui/button";

/**
 * A missing page is not a page anybody should arrive at from a search engine. The root layout's
 * `title.template` supplies the `· FitOut` suffix.
 */
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* The public composition's geometry and wordmark, minus the session read. `brandHref="/"`
          because a dead end is exactly where a way home matters. */}
      <SiteChrome brand="FitOut" brandHref="/" actions={<AnonymousAuthActions />} />

      <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:py-24">
        {/* NEVER "404", never "error" (11-UI-SPEC § Copywriting Contract). A mistyped or stale URL is
            a normal thing that happens to people, not a fault they committed and not a failure of the
            system — the copy says what happened and what to do, in that order, and the tone is the
            same neutral one every other empty surface in this app uses.

            ONE action, and it is the app's core value rather than a generic "go home": someone who
            landed nowhere is someone who was trying to find a space. */}
        <EmptyState
          icon={SearchXIcon}
          title="We couldn't find that page"
          body="The link may be old, or the page may have moved."
          actions={
            <Button asChild>
              <Link href="/">Back to search</Link>
            </Button>
          }
        />
      </main>

      {/* SHELL-02. `mt-auto` is what puts it at the bottom of the viewport rather than directly
          under a short empty state — this wrapper is the `min-h-dvh flex flex-col` the footer needs,
          and it is already here for the header's sake. */}
      <SiteFooter />
    </div>
  );
}
