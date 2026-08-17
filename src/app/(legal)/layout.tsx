// SHELL-02 — the `(legal)` group: the app's FIRST long-form prose surface (11-UI-SPEC § `/terms`
// and `/privacy`). This layout's only contribution is a measure; everything else is the shell.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// THE MEASURE IS `max-w-prose`, AND THE PLUGIN IS DELIBERATELY NOT INSTALLED
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `max-w-prose` resolves to **65ch** (Tailwind's own `maxWidth` scale, `tailwindcss@4.3.0`), which
// sits inside the 45–75 character measure the UI-SPEC asks for. Verified against the emitted
// stylesheet rather than assumed: `.max-w-prose{max-width:65ch}` is in the production CSS bundle.
//
// `@tailwindcss/typography` is NOT installed and must not be. It ships its own complete type scale —
// sizes, leadings, weights and vertical rhythm for every element it touches — which is a SECOND,
// UN-GATED type system standing beside the four named roles. DS-02 exists to stop exactly that, and
// `tests/design/type-scale.test.ts` polices the roles it would silently override. The four roles are
// therefore composed BY HAND on the two pages below (11-UI-SPEC § Anti-Patterns names the plugin).
// `git diff --stat package.json` for this plan's commits is empty; zero packages were added.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// THE HEADER HERE IS THE ANONYMOUS ONE, AND THAT IS A MEASURED TRADE RATHER THAN AN OVERSIGHT
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/components/site/public-header.tsx` is the composition `(public)`, `(auth)` and
// `listings/[id]/(detail)` all render. It resolves its actions cluster from the request, using the
// dynamic request API that Next treats as a prerender bailout — which is why `/login`, `/signup` and
// every route under those three layouts is `ƒ Dynamic`. This group must be `○ Static`: the UI-SPEC
// says so (§ Routing and layout: *"Fully static. No DB, no session → no `loading.tsx`"*), and it is
// T-11-STATICLEAK's whole mitigation — two routes that reach no request state and no data store
// cannot leak anything and cannot reopen the DB-free-build question.
//
// So this layout renders `SiteChrome` — the presentational shell, which imports nothing but geometry
// — with `AnonymousAuthActions`, exactly as `src/app/not-found.tsx` does and for exactly the same
// reason. Read that file's header for the counterfactual it measured.
//
// MEASURED, BOTH WAYS, ON THIS TREE (`npm run build`, unreachable data store):
//
//     this file as written             ○ /terms   ○ /privacy   — 5 static routes, 3 unchanged
//     the same file with PublicHeader  ƒ /terms   ƒ /privacy   — 3 static routes, both lost
//
// The blast radius of the dynamic form is confined to these two routes (unlike the root not-found,
// where 11-19 measured a single dynamic composition taking the WHOLE build's prerendering with it,
// because that page is part of every route's tree). So the trade is genuinely local, and it is:
//
//   COST, STATED PLAINLY — a SIGNED-IN person who opens `/terms` or `/privacy` from the footer sees
//   `Log in` / `Sign up` in the header. That is the identity drift `public-header.tsx:82-85` calls
//   the problem this phase exists to end, and it is real here on two routes.
//
//   WHY IT IS STILL THE RIGHT WAY ROUND — the reader these pages exist for is anonymous. The footer
//   link that matters most is the one on `/signup`, where somebody is being asked to agree to
//   something before they have an account. There is no third option: a client-side session fetch is
//   banned outright by T-11-SESSION, and a request-time read is the bailout itself.
//
// Recorded in `deferred-items.md` so a later phase can flip it deliberately rather than discover it.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// NO `loading.tsx` IN THIS GROUP, AND THAT IS A CONSEQUENCE OF THE ABOVE
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The UI-SPEC's rule: *a route needs a `loading.tsx` if its `page.tsx` waits on anything.* Neither
// page here waits on anything at all — no data store, no request state, no asynchronous work of any
// kind — so a skeleton would be markup that can never render. `src/app/(legal)/error.tsx` is a
// different question and belongs to plan 11-18: STATE-02 wants one boundary per group even where it
// should never fire.
//
// This is a SERVER COMPONENT and so is everything it renders. It reaches `next/link` (through the
// shell), three presentational modules and nothing else.

import { SiteChrome } from "@/components/patterns/site-chrome";
import { SiteFooter } from "@/components/patterns/site-footer";
import { AnonymousAuthActions } from "@/components/site/anonymous-auth-actions";

export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* The public composition's geometry and wordmark, minus the request-time read — see above.
          `src/app/not-found.tsx` renders the byte-identical three props; it is the only other site,
          and the extraction is logged rather than done because that file is outside this plan. */}
      <SiteChrome brand="FitOut" brandHref="/" actions={<AnonymousAuthActions />} />

      {/* THE ONE THING THIS LAYOUT CONTRIBUTES. 65ch, and the vertical rhythm the UI-SPEC's table
          gives this surface verbatim. The pages inside compose the four named roles by hand. */}
      <main className="mx-auto w-full max-w-prose px-4 py-12 sm:py-16">{children}</main>

      {/* SHELL-02, and the SEVENTH mount site — `site-footer.tsx:19` predicted this one by name.
          `mt-auto` inside the wrapper above is what keeps it at the bottom of a short page. */}
      <SiteFooter />
    </div>
  );
}
