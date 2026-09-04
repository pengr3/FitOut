import "server-only";

// D-260 (F11) — WHAT A SUSPENSION IS WITHHOLDING, NAMED. The read half of ENF-02, and only the read half.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS MODULE EXISTS
// ════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 18-07's payout freeze is PRE-CLAIM: `queryDuePayouts` DROPS a suspended host's due bookings
// before `payOne` can claim them, so no `host_payout_ledger` row is ever written and `/host/earnings`
// renders NO LINE AT ALL for a session the host has already delivered. That placement is correct and
// it is not up for revision here (a claimed-then-refused row would page an operator forever). Its
// consequence on the host's side is that money stops appearing, on the one page they would look for
// it, with nothing anywhere that says which session.
//
// `HostingPausedNotice` already says the general thing — hosting is paused, payouts are on hold. This
// module supplies the SPECIFIC thing: how many delivered sessions the freeze is holding, and which one
// is earliest. It answers a question; it changes nothing.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS MODULE DELIBERATELY DOES NOT DO
// ════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • IT DOES NOT DECIDE SUSPENSION. `loadHostVerification` owns that answer and three host surfaces
//     already read it. The predicate below re-states `suspended` only so this module cannot report a
//     frozen session for a host who is not frozen — never so a caller can ask it whether a host is
//     suspended. The page branches on `loadHostVerification`, exactly as it does today.
//   • IT DOES NOT UNFREEZE ANYTHING, and it offers no route to. D-260 says the sentence names the
//     session; D-263 says nothing in the product implies a person will look at your case. This module
//     is READ-ONLY — no INSERT, no UPDATE, no side effect — and the copy it feeds ends after the fact.
//   • IT DOES NOT MOVE THE FREEZE. `payout-sweep.ts:112-114` states that Invariant 4 (ENF-02) lives
//     THERE and nowhere else. That file is untouched by this one.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DIVERGENCE RULE — WHY THE PREDICATE IS SPELLED OUT INSTEAD OF SHARED
// ════════════════════════════════════════════════════════════════════════════════════════════════════
//
// This SELECT is the deliberate INVERSE of `queryDuePayouts`: that query drops these rows, this one
// keeps exactly them. The obvious tidy move — extract one shared predicate and negate it — is the
// wrong one, because the freeze invariant is the sweep's and a shared helper would make this module a
// second author of it. So the clauses are WRITTEN OUT, twice, on purpose.
//
// ⚠ THE COST OF THAT CHOICE IS THE THING TO WATCH, AND IT IS THE POINT. If the two predicates drift,
// the host reads a sentence that disagrees with what the sweep actually withheld — a count that is too
// high is a fabricated grievance, and one that is too low is the silence this whole feature exists to
// end (T-18.1-0204). A divergence must therefore be VISIBLE as a difference between two written
// predicates that a reader can hold side by side, never hidden behind a helper that makes them look
// identical while one of them has quietly changed. The three deliberate divergences are each argued at
// their own clause below; anything NOT argued there is a bug.
//
// NON-CLIENT MODULE, guarded rather than merely conventional: it reads the money path's tables and the
// host's own verification status, so it must never be reachable from a client import graph (D-34).

import { sql } from "drizzle-orm";
import type { DbConn } from "@/lib/availability/read-model";
import { composeFrozenSessionSentence } from "@/lib/listing/review-signal";
import { PAYOUT_DELAY_HOURS } from "@/lib/payments/config";

/** The launch region's clock and locale — `src/app/(ops)/ops/page.tsx:52-58`'s idiom, and its reason. */
const HOST_CLOCK_TZ = "Asia/Manila";
const HOST_LOCALE = "en-PH";

/**
 * What the suspension is holding, in the shape the sentence needs — and nothing else.
 *
 * There is no booking id, no listing id and no amount here on purpose. The host is being told WHICH
 * session, not handed a row they could act on: there is no control at the other end of any of those
 * ids, and a money figure would invite the reading that the number is owed on a date, which is the
 * promise D-260 refuses to make.
 */
export type FrozenPayoutSummary = {
  /** How many delivered sessions produce no payout line at all because of the freeze. Always ≥ 1. */
  readonly count: number;
  /** The EARLIEST such session's space, as the host titled it. */
  readonly earliestSpaceTitle: string;
  /** That same session's `ends_at`. A `Date`, unformatted — see `formatFrozenSessionDate`. */
  readonly earliestSessionEnd: Date;
};

type FrozenRow = {
  count: number;
  spaceTitle: string | null;
  sessionEnd: Date;
};

/**
 * The delivered sessions a suspension is withholding from ONE host — owner-scoped BY ARGUMENT.
 *
 * Owner-scoped by an argument the call site fills from `session.user.id`, never from anything a client
 * can send: `/host/earnings` has no id in its path and no search param reaches this function, so one
 * host can never be told about another host's sessions (T-18.1-0201, the property
 * `verification-status.ts` records for the same reason).
 *
 * Returns `null` when there is nothing to say — because the host is not suspended, OR because nothing
 * is frozen. The caller never branches on suspension itself; it branches on `loadHostVerification` for
 * the notice and passes whatever this returns for the second sentence. A suspended host with no
 * delivered-but-unpaid session reads NOTHING extra, and that is a decision: a sentence about an
 * absence that isn't there is worse than silence.
 */
export async function loadFrozenPayoutSummary(
  dbConn: DbConn,
  hostId: string,
): Promise<FrozenPayoutSummary | null> {
  const rows = (await dbConn.execute(sql`
    -- count(*) OVER () is computed after WHERE and before ORDER BY/LIMIT, so ONE round trip yields
    -- both the total and the earliest row. Two queries could disagree with each other between them.
    SELECT (count(*) OVER ())::int AS "count",
           l.title AS "spaceTitle",
           b.ends_at AS "sessionEnd"
    FROM booking b
    JOIN listing l ON l.id = b.listing_id
    -- DIVERGENCE 1 — INNER, and "= 'suspended'", where the sweep writes LEFT and
    -- "COALESCE(hv.status::text, 'unverified') <> 'suspended'". The two joins are opposite because the
    -- two questions are opposite and BOTH fail closed in their own safe direction: the sweep asks "is
    -- this host suspended?" and a missing row must still be PAID, so it needs the LEFT join and the
    -- COALESCE. This asks "is this host frozen?" and a missing row means nothing is frozen, so an
    -- INNER join says NOTHING rather than fabricating a grievance for a host nobody has ever checked.
    -- Inverting either one into the other's shape breaks it: LEFT + COALESCE here would name frozen
    -- sessions for every unverified host in the catalogue.
    JOIN host_verification hv ON hv.user_id = l.host_id
    -- The same INNER join the sweep carries, and for the same reason it matters HERE: a host with no
    -- payout account is not swept at all, so their delivered session is missing from the table whether
    -- they are suspended or not. Attributing it to the suspension would be a lie the payout banner
    -- immediately contradicts one block further down the page.
    JOIN host_payout hp ON hp.user_id = l.host_id
    LEFT JOIN host_payout_ledger p ON p.booking_id = b.id AND p.kind = 'payout'
    WHERE l.host_id = ${hostId}
      AND hv.status = 'suspended'
      -- Byte-for-byte the sweep's payout predicate (Finding 1): a partially-refunded booking still
      -- owes the host their share of the RETAINED amount, and a HOST cancellation retains 0 and is
      -- correctly excluded by the "> 0". This is a PAYOUT predicate, not an OCCUPANCY one.
      AND (
            b.status = 'confirmed'
         OR (b.status = 'cancelled' AND COALESCE(b.retained_space_cents, 0) > 0)
          )
      -- The sweep's own due window, on the DB clock, NOT a bare "ends_at <= now()". A session that
      -- ended an hour ago has no payout line yet for a reason that has nothing to do with any
      -- suspension, and naming it here would blame the freeze for the ordinary T+24h hold.
      AND b.ends_at + make_interval(hours => ${PAYOUT_DELAY_HOURS}::int) <= now()
      -- DIVERGENCE 2 — "p.id IS NULL" ALONE, where the sweep also re-selects a "failed" row inside its
      -- retry backoff (WR-04). Deliberate: this sentence is about sessions that produce NO LINE AT ALL
      -- on /host/earnings. A "failed" ledger row is ON the page, with its own state badge, so calling
      -- it missing would contradict the table directly above the notice.
      AND p.id IS NULL
    -- DIVERGENCE 3 — no SWEEP_BATCH_SIZE. The sweep pages through work in batches; this counts a
    -- fact, so the batch cap is absent and the count is over the WHOLE frozen set. The "LIMIT 1" is
    -- not that cap: it takes the earliest row for the sentence, AFTER the window has already counted
    -- every one. Copying the sweep's batch size here would silently under-report a long freeze.
    ORDER BY b.ends_at ASC
    LIMIT 1
  `)) as unknown as FrozenRow[];

  const earliest = rows[0];
  if (!earliest || earliest.count < 1) return null;

  // A published listing cannot have a null title (`publishSchema` requires one) and a booking cannot
  // exist against an unpublished listing, so this branch is unreachable from real data. It is a guard
  // rather than a policy: every form of the sentence NAMES the space, and one that named an empty
  // string would read to the host as a rendering defect on a page about their money — the same reason
  // the ops queue row renders an explicit "Not provided" instead of an empty `<dd>`.
  const title = earliest.spaceTitle?.trim() ?? "";
  if (title.length === 0) return null;

  return {
    count: earliest.count,
    earliestSpaceTitle: title,
    // postgres.js returns `timestamptz` as a Date; re-wrapping is defensive against a driver that
    // hands back a string, and costs nothing when it already is one.
    earliestSessionEnd: new Date(earliest.sessionEnd),
  };
}

/**
 * "Aug 26, 2026" — the frozen session's date, ABSOLUTE and rendered server-side.
 *
 * `formatSubmitted`'s idiom (`src/app/(ops)/ops/page.tsx:58`), including the named zone and locale: a
 * host is not a place, so there is no per-row venue clock to inherit, and letting the SERVER's zone
 * decide would make the same session read differently on two machines.
 *
 * ⚠ ABSOLUTE, NEVER RELATIVE, AND THE REASON IS A GATE. "3 days ago" would trip banned family 3 in
 * `tests/listing/review-signal.test.ts` — the family that forbids a timeline nothing in the system
 * agrees to keep — and it would also be a moving target on a page the host reloads.
 *
 * It lives HERE rather than in the page for a second, separate reason: `tests/design/earnings-freeze
 * .test.ts` pins every string literal under `src/app/(host)/host/earnings/**` as a per-file equality
 * map. The format options are string literals, so formatting in the page would move that map. The
 * remedy for a moved map is to move the code, which is what this function is.
 */
export function formatFrozenSessionDate(at: Date): string {
  return new Intl.DateTimeFormat(HOST_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: HOST_CLOCK_TZ,
  }).format(at);
}

/**
 * The summary as ONE FINISHED SENTENCE, or `null` when there is nothing to say.
 *
 * The whole of what `/host/earnings` calls after the read: format, compose, hand down. It exists so
 * that page can pass the result through as a single expression, because the page is under
 * `tests/design/earnings-freeze.test.ts`'s per-file equality map over every string literal in the
 * earnings scope — and the format options and the sentence forms are both string literals. Splitting
 * them across the page would move a map that D-156 says must not move; the remedy for a moved map is
 * to move the CODE, and this function is where it moved to.
 *
 * The words themselves still belong to `review-signal.ts`. This only decides that the two facts it
 * holds are the ones that go in.
 */
export function frozenSessionSentence(summary: FrozenPayoutSummary | null): string | null {
  if (summary === null) return null;
  return composeFrozenSessionSentence(
    summary.count,
    summary.earliestSpaceTitle,
    formatFrozenSessionDate(summary.earliestSessionEnd),
  );
}
