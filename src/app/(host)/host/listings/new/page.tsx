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
// ⚠ THE `!res.ok` BRANCH BELOW KEEPS ITS SILENT BOUNCE, AND THAT IS SCOPE RATHER THAN AGREEMENT.
// With the redirect in front of it, that branch now only catches genuine infrastructure failure — an
// insert that did not land. It is still a bounce with no sentence, it is recorded as a known blind
// spot in 18.1-UI-SPEC § NOT COVERED, and this plan deliberately does not widen into fixing it.
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
    // Creation failed — send them back to the grid rather than a broken wizard.
    redirect("/host/listings");
  }

  redirect(`/host/listings/${res.id}/edit`);
}
