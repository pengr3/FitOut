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
// ⚠ THE `!res.ok` BRANCH BELOW NO LONGER BOUNCES SILENTLY (D-03 / plan 19-07). With the verification
// redirect in front of it, that branch catches genuine infrastructure failure ONLY — an insert that
// did not land. 18.1-12 left it as a bounce with no sentence and recorded it as a known blind spot in
// 18.1-UI-SPEC § NOT COVERED; this plan closed it. The bounce is unchanged and still goes to the
// grid; it now carries one query token, and the grid renders the sentence. ⚠ THAT SENTENCE MUST NOT
// IMPLY A VERIFICATION PROBLEM — see the branch's own comment and `src/lib/listing/create-signal.ts`.
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
import { LISTING_CREATE_FAILED_PARAM } from "@/lib/listing/create-signal";

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
  if (!res.ok || !res.id) {
    // Creation failed — send them back to the grid rather than a broken wizard, AND TELL THEM
    // (D-03 / HSURF-02). Until this plan this was a bare bounce carrying no message at all: the host
    // pressed *Create listing*, landed back where they started, and was told nothing. That blind
    // spot is recorded by name in `18.1-UI-SPEC § NOT COVERED`; this closes it.
    //
    // ⚠ WHAT THIS BRANCH NOW CATCHES IS GENUINE INFRASTRUCTURE FAILURE ONLY — an insert that did not
    // land. The four refusing verification states are routed to the account check ABOVE, before the
    // action is ever called, so verification has already PASSED by the time control reaches here.
    // THE SENTENCE MUST THEREFORE NOT IMPLY A VERIFICATION PROBLEM: it would be copy about a check
    // that never failed, sending the host to a page where nothing is wrong — the D-265 defect one
    // route over. The words, and that ban with its evidence, live in `create-signal.ts`.
    //
    // ⚠ AND THE DESTINATION LITERAL IS UNCHANGED, WHICH IS WHY THIS IS A CONCATENATION RATHER THAN A
    // TEMPLATE. Two gates count that literal's occurrences in this file and expect the count
    // unchanged at 1 (18.1-12's acceptance criteria; this plan's). Folding it into a template string
    // would delete the token they count while changing nothing about the behaviour — a correct tree
    // read as a broken one. Only a query string is appended, and its one token is imported so the
    // origin and the destination cannot drift.
    redirect("/host/listings" + "?" + LISTING_CREATE_FAILED_PARAM);
  }

  redirect(`/host/listings/${res.id}/edit`);
}
