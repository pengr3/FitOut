// The FitOut Ops shell — the SIXTH composition of the one shared header box (D-04, SHELL-01) — and
// the file where the 404 STATUS LINE is won (D-219 / D-247, 18-RESEARCH § F2b).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THIS LAYER IS **NOT THE SECURITY BOUNDARY**. SAID IN `src/middleware.ts:1`'s OWN WORDS.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// That file opens "OPTIMISTIC ONLY — NOT the security boundary … Never gate sensitive data or
// capability on this middleware alone." The same sentence is true of this layout, for a DIFFERENT
// mechanism, and it has to be written here because the two failures look nothing alike:
//
//   • The middleware is optimistic because it reads a COOKIE rather than a session row.
//   • This layout is not a boundary because NEXT SAYS A LAYOUT IS NOT ONE. From Next's own
//     authentication guide: a layout "does not control whether the rest of the route renders" — it
//     does not re-render on navigation under Partial Rendering, so a check here runs on the first
//     load of the segment and not on every navigation within it, and the page beneath it still runs
//     and still appears in the RSC Payload. Separately, Next requires Server Actions to be treated
//     "with the same security considerations as public-facing API endpoints", which no layout can
//     ever cover.
//
// So `assertStaff()` below exists for EXACTLY ONE JOB — the HTTP status line — and `requireStaff()`
// in `page.tsx` (layer 2) and in every ops server action (layer 3) is the gate (D-216). Deleting
// either of those because "the layout already checks" is the mistake this paragraph exists to stop.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A STATUS LINE NEEDS ITS OWN LAYER AT ALL — THE MECHANISM, NOT A PREFERENCE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `page.tsx` reads the database, so it is an async page, so `tests/design/loading-coverage.test.ts`
// (build-blocking) REQUIRES a `loading.tsx` beside it. A `loading.tsx` is a `<Suspense>` boundary,
// and Next states the consequence plainly: because the check runs inside the boundary, the response
// has already begun streaming as a `200` and the status cannot change once streaming has started.
// A route that does not exist answers a hard 404. So a page-level guard ALONE leaves "exists but
// forbidden" and "does not exist" telling each other apart by one number, which
// `curl -o /dev/null -w '%{http_code}'` reads in one request — D-219 violated without a byte of ops
// data leaking. Worse, per Next the not-found body "renders in place of the streamed-in content,
// even though the page shell has already been sent": the ops chrome below would frame the 404 with
// a visible "Ops" wordmark, telling a prober the console is real.
//
// A LAYOUT renders in the shell, ABOVE that boundary, so awaiting here blocks the flush while the
// status line is still open. That is the whole trick, and it is the identical fix already shipped at
// `src/app/listings/[id]/(detail)/layout.tsx:27-43` — whose header carries the production `curl`
// measurements and the two plausible repairs that were MEASURED not to work (asserting in
// `generateMetadata` is still too late; deleting `loading.tsx` works and trips a build-blocking
// gate). Do not rediscover that the hard way.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ASSERT IS BLOCKING AND IT STAYS BLOCKING. NOTHING BELOW IT MAY MOVE ABOVE IT.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(host)/host/layout.tsx:10-24`'s banner, adapted to this group's stakes. The await runs to
// completion BEFORE this function returns any JSX and it is inside no boundary of any kind. Moving
// it behind a `<Suspense>` — the ordinary-looking "stream the chrome, check later" edit — would send
// the ops shell to a non-staff account and only THEN decide to turn them away, and bytes already on
// the wire cannot be un-sent. Here that is not merely a leak of markup: it is the existence oracle
// itself, because the shell says "Ops".
//
// ⚠ THIS LAYOUT IS NOT IN `tests/design/blocking-session-gate.test.ts`'s `LAYOUTS`, and that file's
// own NOT-COVERED note says why that matters: it polices two named files, so a third gated layout is
// invisible to it. The equivalent assertion for this file lives in
// `tests/design/ops-guard-coverage.test.ts`, which clones the same AST walk.

import { assertStaff } from "@/lib/ops/staff";
import { ProfileLink, SiteChrome } from "@/components/patterns/site-chrome";
import { SiteFooter } from "@/components/patterns/site-footer";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  // LAYER 1 — the status line, and nothing else. See the header: this is not the gate.
  await assertStaff();

  return (
    <div className="flex min-h-full flex-col">
      <SiteChrome
        brand={
          <>
            FitOut <span className="text-muted-foreground">· Ops</span>
          </>
        }
        brandHref="/ops"
        // The back-office tint the host shell already uses. A working surface, not a shopfront.
        surface="muted"
        // `nav` IS OMITTED, AND THAT IS D-246 RENDERED. There is exactly one ops page, so there is
        // nothing for a primary navigation to navigate between. Inventing an `OPS_NAV_LINKS` would
        // clone `src/lib/nav.ts`'s typed-tuple → derived-union → total-`Record` shape to hold a
        // single destination that is also the wordmark's — a second inventory to keep in agreement
        // with a one-item list. `SiteChrome` renders no `<nav>` landmark when the slot is empty.
        actions={
          // ⚠ `<ProfileLink />` ONLY, AND BOTH ABSENCES BESIDE IT ARE DECISIONS.
          //
          // NO `ModeSwitch`. The switch's whole premise is that a user moves between two CONTEXTS
          // they hold capabilities for (D-04: booking and hosting). Ops is a ROLE, not a third
          // context: staff standing does not change what a person may book or host, and offering a
          // switch into it would imply an ops "mode" that has no counterpart to switch back from.
          //
          // NO notification bell. Mounting `AmbientNotifications` here would put an empty panel on
          // every ops screen and imply ops notifications exist. None do — `notification` rows are
          // addressed to bookers and hosts, and nothing in this phase writes one to a staff account.
          // An affordance for a channel that does not exist is the same defect as copy about a check
          // that never ran, one level up.
          <ProfileLink />
        }
      />
      <main className="flex flex-1 flex-col">{children}</main>
      {/* SHELL-02 — the SAME footer every other composition renders. Its links are policy and
          product-level (Terms, Privacy, Find a space, Host your space); none is ops-side, and an ops
          staffer is also a user, so there is nothing here for this shell to fork. */}
      <SiteFooter />
    </div>
  );
}
