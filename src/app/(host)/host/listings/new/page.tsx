// New-listing entry (D-01 draft-first). Reaching (host)/** already means canHost (the layout gates),
// but we re-check at page level (defense in depth — the project's belt-and-suspenders). We create an
// empty DRAFT owned by the caller and immediately redirect into the wizard at [id]/edit, so the
// listing exists as a draft the moment creation begins (autosave then fills it in).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THE VERIFICATION READ BELOW IS A COURTESY, NEVER THE GATE (D-255 / PM-C, FINDING F-2)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `createDraftListing` refuses `unverified | pending | rejected | suspended` server-side, and THAT is
// the gate — it is `src/app/actions/listing.ts`'s own words for the wizard's checklist, applied one
// route up. Nothing on this page can be relied on for authorization: a client that skips it, replays
// the POST or calls the action's endpoint directly meets the action's clause instead.
//
// WHAT THIS PAGE ADDS IS LEGIBILITY, AND WITHOUT IT THIS FEATURE WOULD SHIP A DEFECT. Until plan
// 18.1-12 this file's only failure branch was a bare bounce back to the listings grid — the one
// still below — carrying no message at all (18.1-RESEARCH FINDING F-2, measured). ⚠ THE LITERAL IS
// DELIBERATELY NOT SPELLED IN THIS PARAGRAPH: 18.1-12's acceptance criteria count that redirect's
// occurrences in this file and expect the count UNCHANGED, and prose quoting the token is how five
// gates in this phase went falsely red. A refusal added to the action alone would therefore have
// reached the host as a SILENT BOUNCE to the grid: they press *Create listing*, land back where they
// started, and are told nothing. That is a direct violation of this phase's SC5 — "the refusal names
// the state, the reason and the way out" — and the copy-about-a-check-that-never-ran defect D-265
// exists to prevent, one level up.
//
// So the four refusing states are routed to `/host/verify` BEFORE the action is called. That one
// destination answers all four: its lede is "FitOut checks who a host is before their first listing
// goes up." — the sentence that explains the bounce, on the destination, in the first thing the host
// reads — and its panel names the state, the reason and the way out for each. `suspended` included:
// the page short-circuits that branch to `HostingPausedNotice`.
//
// ⚠ THE `!res.ok` BRANCH BELOW NO LONGER BOUNCES SILENTLY (D-03 / plan 19-07), AND SINCE PLAN 19-10 IT
// IS A THREE-WAY SPLIT RATHER THAN ONE DESTINATION. 18.1-12 left it as a bounce with no sentence and
// recorded it as a known blind spot in 18.1-UI-SPEC § NOT COVERED; 19-07 wrote the words; 19-10 made
// the failure that was supposed to reach them able to reach them. The split is:
//
//   • the FOUR REFUSING STATES are still routed to the account check BEFORE the action is called —
//     unchanged, and still what `tests/host/verification-surface.test.ts` CLAIM 4 asserts;
//   • the TWO RACE WINDOWS are routed AFTER it, each to its own destination: a session lapsing
//     between this page's `getSession` and the action's goes to sign-in, and an ops suspension
//     landing between this page's `loadHostVerification` and the action's goes to the account check
//     (the action's refusal is `HOST_VERIFICATION_LISTING_REFUSED`, in
//     `src/lib/host/verification-refusals.ts`);
//   • which leaves the grid bounce for GENUINE INFRASTRUCTURE FAILURE ALONE — the action's
//     `LISTING_CREATE_FAILED_STATE`, in `src/lib/listing/create-signal.ts`.
//
// ⚠ THAT LAST PROPERTY IS THE ONE THE D-03 COPY DEPENDS ON, AND UNTIL 19-10 IT WAS A HOPE. The
// sentence must not imply a verification problem, because it would be copy about a check that never
// failed — but while every refusal bounced to the grid, a suspension landing mid-click produced
// exactly that copy. Routing the race windows to their own destinations is what makes the ban hold by
// CONSTRUCTION rather than by the branch being unreachable. See the branch's own comment,
// `create-signal.ts`'s header, and `tests/listing/create-routing.test.ts`.
//
// ⚠ AND THE FOUR `Create listing` LINKS ARE LEFT ENABLED (D-255): `(host)/host/listings/page.tsx` and
// `(host)/host/page.tsx` keep their href, label and variant and gain no `disabled`, `aria-disabled`,
// tooltip or badge. A disabled link is a hint, not a gate, and the gate is server-side regardless —
// so a disabled control would buy nothing and cost the host the explanation. A host who presses the
// button and lands on *Account check* has learned the product; a host who cannot find the button
// concludes it is broken.

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadHostVerification } from "@/lib/host/verification-status";
import { createDraftListing } from "@/app/actions/listing";
import { LISTING_CREATE_FAILED_PARAM, LISTING_CREATE_FAILED_STATE } from "@/lib/listing/create-signal";
// The DISCRIMINANT for the suspension race below — the same constant the action returns, so the two
// ends cannot drift. Comparing against it is not a second authority on verification: the action
// already decided, and this only reads back which decision it made.
import { HOST_VERIFICATION_LISTING_REFUSED } from "@/lib/host/verification-refusals";

export default async function NewListingPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/"); // defense in depth — never render/act on hosting content without canHost.
  }

  // The same owner-scoped read the action makes, from the same session id, so the page and the gate
  // cannot disagree about what this host's standing is. NO ROW READS AS `unverified`
  // (`verification-status.ts`'s header rule), which is the ordinary state of a host nobody has
  // checked — and the state that most needs the explanation `/host/verify` gives.
  const verification = await loadHostVerification(db, session.user.id);
  if (
    verification.status === "unverified" ||
    verification.status === "pending" ||
    verification.status === "rejected" ||
    verification.status === "suspended"
  ) {
    // ⚠ THE SAME FOUR AS THE ACTION, SPELLED THE SAME POSITIVE WAY, AND `grandfathered` IS ABSENT
    // FROM BOTH ON PURPOSE (FINDING F-7 — the argument is written at the action). A `!== "approved"`
    // here would send a grandfathered host to a panel telling them there is nothing to do, from a
    // button that then works — two surfaces disagreeing about one host, which is exactly what
    // reading the one shared helper is supposed to make impossible.
    redirect("/host/verify");
  }

  const res = await createDraftListing();
  // ⚠ THE CONDITION TESTS `res.ok` ALONE, AND THE `!res.id` HALF WAS NOT DELETED — IT BECAME
  // UNREPRESENTABLE. Those are different acts and only the second is safe. `createDraftListing` now
  // returns `CreateDraftListingResult`, whose success arm carries a REQUIRED `id: string`, so a
  // success without an id no longer type-checks AT THE ORIGIN. Deleting a branch because it looks
  // unreachable is a judgement a later edit can silently falsify; deleting one `tsc` proves cannot
  // occur is not. If the action ever needs to succeed without an id again, it stops compiling there
  // rather than arriving here unchecked.
  if (!res.ok) {
    // ── THE THREE-WAY SPLIT (D-03 / HSURF-02, plan 19-10) ─────────────────────────────────────────
    //
    // The four refusing verification states are still routed to the account check ABOVE, BEFORE the
    // action is called — that is unchanged, and it is the property `tests/host/verification-surface.
    // test.ts` CLAIM 4 asserts. What changed is what happens to the refusals that survive it.
    //
    // Until plan 19-10 this branch sent every `!res.ok` to the grid, and its own comment claimed it
    // caught "genuine infrastructure failure only". That claim was a HOPE rather than a property, and
    // it was false in both directions at once: infrastructure failure could not reach it (the action
    // had no try/catch and threw straight past the page into Next's error boundary — 19-REVIEW
    // CR-01), while the two RACE windows that could reach it were being answered with copy written
    // for something else:
    //
    //   • a SESSION LAPSING between this page's `getSession` and the action's `requireUserId`;
    //   • an OPS SUSPENSION LANDING between this page's `loadHostVerification` and the action's.
    //
    // Both now go to their own destination, which is what leaves the grid bounce for genuine
    // infrastructure failure ALONE — and that is precisely the property the D-03 copy depends on.
    // `LISTING_CREATE_FAILED_STATE`'s own docblock bans any wording implying a verification problem,
    // on the grounds that verification has already passed by the time these words are read. With the
    // suspension race routed here rather than there, that ban is now true BY CONSTRUCTION.
    if (res.error === HOST_VERIFICATION_LISTING_REFUSED) {
      // The suspension race. The refusal IS a verification refusal, so it gets the one destination
      // that explains all four refusing states — never the infrastructure sentence, which would tell
      // a host whose standing just changed that the platform broke and send them nowhere.
      redirect("/host/verify");
    }
    if (res.error === LISTING_CREATE_FAILED_STATE) {
      // Genuine infrastructure failure — the ONE case this bounce was written for, and (until 19-10)
      // the one case that could not reach it. The blind spot is recorded by name in
      // `18.1-UI-SPEC § NOT COVERED`; plan 19-07 wrote the words and this plan made them reachable.
      //
      // ⚠ THE DESTINATION LITERAL IS BYTE-UNCHANGED, WHICH IS WHY THIS IS A CONCATENATION RATHER THAN
      // A TEMPLATE. Three standing assertions count and shape this statement — CLAIM 4's
      // exactly-once count, its append-form check, and this plan's census — and folding the literal
      // into a template string would delete the token they count while changing nothing about the
      // behaviour: a correct tree read as a broken one. This statement was MOVED, not rewritten.
      redirect("/host/listings" + "?" + LISTING_CREATE_FAILED_PARAM);
    }
    // THE ENUMERATED REMAINDER: the action's THIRD and only other refusal, no session. It is written
    // last because it is what is left once the two above are taken, NOT because it is a catch-all for
    // whatever arrives — a host whose session lapsed mid-click is offered sign-in, which is the only
    // thing that can help them; the grid's apology would invite them to press a button that must fail
    // identically forever.
    //
    // ⚠ IF YOU ARE ADDING A FOURTH REFUSAL TO `createDraftListing`, THE DECISION BELONGS HERE, and
    // `tests/design/listing-create-refusal-routing.test.ts` is what stops it being skipped: that
    // census derives the action's refusal set from source and reddens BY NAME, build-blocking, when
    // the set and this router stop agreeing. Do not let a new refusal fall through to sign-in.
    redirect("/login");
  }

  redirect(`/host/listings/${res.id}/edit`);
}
