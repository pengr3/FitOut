// `/host/verify` — the surface a host uses to ASK to be checked (HVER-06 / HVER-08).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THIS PAGE READS ZERO SEARCH PARAMS, AND THAT IS THE SECURITY PROPERTY RATHER THAN A SIMPLIFICATION
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The checking partner's hosted flow returns the host here through a `callback` redirect. THAT RETURN
// CARRIES NO AUTHORITY. It is a browser navigation the host fully controls: they can edit it, replay
// it, or type this route with any query string they like. So the default export below declares NO
// parameter for the query, this file contains ZERO occurrences of that identifier, and
// `tests/host/verification-surface.test.ts` asserts both structurally rather than trusting a reading.
//
// What renders instead is what the ROW says — re-read here, owner-scoped, on every request. For almost
// every real return that is the `pending` panel, because a verdict arrives on a channel this page is
// not on: the signed webhook, or the reconciliation sweep. There is deliberately no screen that
// congratulates a host because a redirect said so.
//
// This is PROJECT D-57's lesson one domain over — the webhook is the confirm authority, not the
// forgeable browser return — and it is the identical shape `src/components/booking/
// pending-payment-state.tsx` exists for on the money path. `src/app/api/didit/webhook/route.ts` states
// the same rule from the other side.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE FIFTH READER OF ONE HELPER, AND WHY THERE IS NO SECOND QUERY HERE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `loadHostVerification` is the owner-scoped read `/host`, `/host/listings` and `/host/earnings`
// already share, and this page is its fifth caller. It returns `updated_at` — added by plan 18.1-04
// for exactly this surface — so the instant a rejected host READS is derived from the SAME column the
// submission action's `WHERE` clause reads. A second query in this file would be cheaper to write and
// would be the wrong shape: it would make the display a second authority on a rule the server already
// owns, which is the two-authorities defect PROJECT D-130 / GATE-05 is named for.
//
// THE SAME ARGUMENT PICKS THE CLOCK. The elapsed test below is made against the DATABASE's clock, not
// this process's, because the clause that actually refuses is `now() - make_interval(...)` inside
// Postgres. A page comparing against a drifting Node clock could draw the retry control on a press the
// database is about to refuse, or hide it on one it would have allowed.
//
// ⚠ THE COMPARISON IS DELIBERATELY THE CONSERVATIVE DIRECTION. This page reads its clock at paint and
// the action reads its own at press, which is strictly later — so a host who loads the page moments
// before eligibility reads the instant, and by the time they could act the server agrees. The reverse
// error (a control offered on a press that will be refused) cannot happen from this ordering.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// SECURITY, AND WHERE THE GATE IS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The `(host)` layout already gates `canHost`; this page re-checks the session and the capability
// anyway, because a route group is not an authorization gate for DATA (T-05-29 / Security V4). The
// verification row is owner-scoped BY ARGUMENT from `session.user.id` — never from anything a client
// can send, and there is no id parameter on this route to tamper with.
//
// BOTH FORM GATES BELOW ARE HINTS. `requestHostVerification` re-reads the server's own copy of
// `emailVerified` and re-parses the phone with its own bound, and a `"use server"` export is reachable
// by POST whatever this page renders. The email flag and the address are passed in so the FORM can be
// honest, never so it can decide.
//
// NOT IN `HOST_NAV`, AND THAT IS A RECORDED DECISION. Every nav link carries a mandatory reason
// because primary nav is the scarcest surface in the app, and no honest one can be written for a
// once-ever destination that is dead weight the moment it succeeds. The way in is a conditional
// advisory row on the dashboard — see `src/components/host/host-signals.tsx`.

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { HostingPausedNotice } from "@/components/host/hosting-paused-notice";
import { VerificationPanel } from "@/components/host/verification-panel";
import { PageHeader } from "@/components/patterns/page-header";
import { auth } from "@/lib/auth";
import { readDbNow } from "@/lib/booking/bookings-query";
import { db } from "@/lib/db";
import { HOST_PANEL_SHELL } from "@/lib/design/measurements";
import { COOLDOWN_HOURS } from "@/lib/host/verification-cooldown";
import {
  VERIFICATION_LEDE,
  VERIFICATION_PAGE_TITLE,
  composeRetryAfterSentence,
  retryAllowedAt,
} from "@/lib/host/verification-signal";
import { loadHostVerification } from "@/lib/host/verification-status";

export default async function HostVerifyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & {
    canHost?: boolean;
    email?: string | null;
    emailVerified?: boolean;
  };
  if (!u.canHost) {
    redirect("/");
  }

  const verification = await loadHostVerification(db, session.user.id);

  // D-264 — THE RETRY INSTANT, COMPOSED HERE AND ARRIVING AT THE COMPONENT FINISHED.
  //
  // `null` means the panel may draw the control; a string means it may not, and the string is the whole
  // of what it draws instead. The two inputs are the row's own `updated_at` and the ONE interval
  // constant the action's `WHERE` binds — so the sentence and the clause cannot say different things.
  // `retryAllowedAt` is the composer's own helper rather than a second piece of arithmetic here, which
  // is what makes the boundary this page tests the boundary the sentence names.
  const now = await readDbNow(db);
  const retryAfterSentence =
    verification.status === "rejected" &&
    verification.updatedAt !== null &&
    retryAllowedAt(verification.updatedAt, COOLDOWN_HOURS).getTime() >= now.getTime()
      ? composeRetryAfterSentence(verification.updatedAt, COOLDOWN_HOURS)
      : null;

  return (
    // The DECLARED single-panel host shell — the same constant `/host` and the availability editor
    // take, and the same one this route's own plate imports, so the fallback cannot draw a different
    // box than the page it stands in for.
    <div className={HOST_PANEL_SHELL}>
      <PageHeader title={VERIFICATION_PAGE_TITLE} lede={VERIFICATION_LEDE} />

      {/* `mt-8` is the host tree's data-region offset, and the plate copies it. The suspension fork
          sits HERE as well as inside the panel: this page short-circuits to the shipped notice, and
          the panel keeps its own branch so the component stays total over the state enum rather than
          depending on a caller to have checked. Two agreeing statements of one absence, neither of
          which is the other's guard. */}
      <div className="mt-8">
        {verification.suspended ? (
          <HostingPausedNotice reason={verification.reason} />
        ) : (
          <VerificationPanel
            status={verification.status}
            reason={verification.reason}
            retryAfterSentence={retryAfterSentence}
            hostEmail={u.email ?? session.user.email ?? ""}
            emailVerified={Boolean(u.emailVerified ?? session.user.emailVerified)}
          />
        )}
      </div>
    </div>
  );
}
