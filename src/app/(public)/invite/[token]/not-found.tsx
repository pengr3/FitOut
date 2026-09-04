// The invite route's not-found boundary — and the ONLY not-found surface in this app whose job is to
// be INDISTINGUISHABLE from another page rather than to explain itself (T-11-ORACLE).
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE IS A COPY OF THE INACTIVE STATE AND NOT A 404 PAGE
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// 08-06 deliberately folded "malformed token" and "unknown token" onto ONE identical response so the
// invite page could not become a probe oracle: the token is a shared, guessable-LENGTH bearer
// credential sitting in a URL, and any difference between "no such token" and "that token exists but
// is not yours to see" is what lets somebody walking the token space learn which tokens name a real
// group. `getGroupByToken` returns one frozen `GROUP_INACTIVE`; `submitRsvp` returns one sentence;
// this page renders one surface.
//
// A not-found page under this segment that said "404" — or said anything at all that the inactive
// state does not say — would reintroduce exactly that oracle one route over. So this file renders
// `<InviteInactive>`: literally the same component the page's `!group.active` branch renders, with
// the same two sentences imported from the same declaration. The two entrances cannot look different,
// because there is only one of them.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// MEASURED, AND THE MEASUREMENT IS WHY THE REAL CONTROL IS THAT NOTHING HERE CALLS `notFound()`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Identical MARKUP is not identical RESPONSE. Next serves a not-found boundary with HTTP 404 and the
// invite page's inactive branch with HTTP 200, and this file cannot change that — a `not-found.tsx`
// has no way to set a status. A human cannot tell the two apart; a script reading status codes tells
// them apart instantly, and a script is the only thing that enumerates a 20-symbol token space.
//
// So the load-bearing control is that this boundary is UNREACHABLE: no module under
// `src/app/(public)/invite/**` calls `notFound()`, on any path, and `tests/design/
// invite-notfound-parity.test.ts` asserts that by parsing the segment rather than by trusting this
// comment. The route matches any token string, so a 404 here could only ever come from an explicit
// call. This file is the belt behind that braces — if a future edit ever does add one, what a person
// sees is still the calm inactive state rather than a page shaped like an answer.
//
// DO NOT give this surface an action, a different icon, a different heading level, or its own copy.
// Every one of those is a bit of information about which of two pages you landed on.

import { INACTIVE_BODY, INACTIVE_TITLE } from "@/lib/group/rsvp";
import { InviteInactive } from "@/components/group/invite-card";

export default function InviteNotFound() {
  return <InviteInactive title={INACTIVE_TITLE} body={INACTIVE_BODY} />;
}
