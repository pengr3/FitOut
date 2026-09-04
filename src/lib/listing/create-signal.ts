// D-03 / HSURF-02 — THE WORDS A HOST READS WHEN CREATING A LISTING FAILED.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE DEFECT THIS CLOSES, AND WHY IT NEEDED A MODULE RATHER THAN A LINE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(host)/host/listings/new/page.tsx`'s `!res.ok || !res.id` branch bounced the host back to their
// grid carrying NO MESSAGE AT ALL — a blind spot recorded by name in `18.1-UI-SPEC § NOT COVERED`.
// They press *Create listing*, land back where they started, and are told nothing.
//
// The sentence cannot live at the origin: that page RENDERS NOTHING — every branch of it ends in a
// `redirect()` — and it cannot be client state, because a server redirect discards it. So it travels
// in the URL and is rendered by the DESTINATION, which is why this module exports a query token
// alongside the words: two files, one string, no drift.
//
// This is the third file in the shipped signal idiom, after `src/lib/host/requests-signal.ts` and
// `src/lib/listing/review-signal.ts`, and it obeys the rule the first of those states at `:56` —
// A SIGNAL NAMES THE STATE, THE REASON AND THE WAY OUT (rule O7). The three are separately named
// exports rather than one sentence so that neither this module's callers nor a future second surface
// can render two of the three and call it a signal.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THIS COPY MUST NOT MENTION VERIFICATION, AND THE REASON IS AT THE CALL SITE, NOT ONLY HERE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The four refusing verification states — `unverified | pending | rejected | suspended` — are routed
// to `/host/verify` at `new/page.tsx:66-78`, BEFORE the action is ever called. So by the time control
// reaches the branch these words are for, verification has already passed. What this branch now
// catches is GENUINE INFRASTRUCTURE FAILURE ONLY: an insert that did not land.
//
// A sentence here that said "we couldn't verify your account" would therefore be COPY ABOUT A CHECK
// THAT NEVER FAILED. The host would go to `/host/verify`, find nothing wrong, and lose trust in both
// surfaces — the exact defect D-265 exists to prevent, one route over. `tests/listing/
// create-signal.test.ts` asserts the ban against the composed constant AND against the rendered
// output, because a ban that holds only in this module is a ban a page file can walk around.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE OTHER THREE THINGS THIS COPY MUST NOT SAY, each with its evidence
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   - "your listing was deleted" / "we removed it" — NOTHING WAS CREATED, so nothing was removed.
//     The insert is the last thing `createDraftListing` does (`src/app/actions/listing.ts`); a
//     failure there leaves no row to remove and no work to mourn. Saying otherwise would send a host
//     hunting through their grid for something that never existed.
//
//   - A BARE "Something went wrong." — a state with no reason and no way out is the defect being
//     closed, differently spelled. It fails rule O7 (`requests-signal.ts:53-61`). The reason below
//     carries two facts the host actually needs: it was OUR side, and NOTHING WAS SAVED — so there
//     is no half-made listing to find and no reason to hesitate before pressing the button again.
//
//   - ⚠ ANY SUPPORT, GET-IN-TOUCH OR CONTACT CLAUSE. `SUPPORT_EMAIL` is `null` (`src/lib/site.ts:70`)
//     and D-64/D-250 forbid a placeholder; `tests/design/site-contacts.test.ts` asserts that ZERO
//     support affordances render anywhere under `src/` while it is. Every sentence here therefore
//     STANDS ALONE, so that no half-sentence can ever render. If a real monitored inbox ever exists,
//     the affordance goes through `src/components/booking/support-path.tsx`'s guard shape — never a
//     trailing clause appended here.
//
//   - NO EXCLAMATION MARK AND NO ALARM VARIANT. Calm, sentence case. Something went wrong on the
//     platform's side; the host did nothing wrong, and this surface's own rule for host information
//     is calm muted text, never red and never `variant="destructive"`
//     (`src/components/listing/listing-card.tsx:387-391`).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// PURE COPY — ZERO IMPORTS, AND THAT IS LOAD-BEARING RATHER THAN TIDY
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This file imports nothing, and a test asserts it. That is what makes it STRUCTURALLY IMPOSSIBLE for
// a runtime value — a support address, an error string, a database message, a stack — to reach a
// sentence the host reads (T-19-32). The sentence is three fixed constants and nothing else.
//
// It is also a NON-CLIENT MODULE with no directive prologue, for the reason
// `src/components/host/payout-status.ts` records at length: a `"use client"` module's exports become
// client references when a Server Component imports them. Both sites that read these strings —
// `new/page.tsx` and `(host)/host/listings/page.tsx` — are Server Components.

/**
 * THE STATE, in the host's words.
 *
 * "start your new listing" rather than "create" — creation here is the beginning of the wizard, not
 * the end of it, and a host who read "we couldn't create your listing" would reasonably wonder which
 * of the details they had not yet typed went missing. Nothing had been typed. Nothing was lost.
 */
export const LISTING_CREATE_FAILED_STATE = "We couldn't start your new listing.";

/**
 * THE REASON, and the two facts that make it act like a reason rather than an apology.
 *
 * "on our side" places the fault where it is: the host did nothing wrong, and there is nothing about
 * their account, their details or their standing to go and fix. "nothing was saved" is the half that
 * makes the way out safe to take — no half-made draft is sitting in their grid, so pressing the
 * button again cannot produce a duplicate they will later have to clean up. (`createDraftListing`'s
 * own reuse-then-mint branch, D-02, guarantees the same thing from the other side.)
 *
 * ⚠ IT NAMES NO MECHANISM AND NO SYSTEM. "our side" is deliberately the whole of the detail: an
 * error string, a component name or a status code in this sentence would leak infrastructure shape
 * onto a surface the host controls nothing about (T-19-32), and would tell them nothing they could
 * act on.
 */
export const LISTING_CREATE_FAILED_REASON =
  "Something went wrong on our side, and nothing was saved.";

/**
 * THE WAY OUT — the link label back into the creation route.
 *
 * A LABEL, and rendered as a TEXT LINK rather than a button. `tests/design/brand-recipe.test.ts` pins
 * the brand call sites (20 overall, 5 under `(host)`), and a filled brand button here would redden a
 * build-blocking gate for a control that is not the page's primary action. The grid's own
 * *Create listing* button is still exactly where it was; this is a second, quieter door to the same
 * room, offered at the moment the host was already trying to walk through it.
 */
export const LISTING_CREATE_FAILED_CTA = "Try again";

/**
 * THE ONE QUERY TOKEN BOTH ENDS READ — the whole `key=value` pair, not half of it.
 *
 * The origin appends it to its UNCHANGED destination literal; the destination compares against it.
 * Exporting the PAIR rather than just a value is what stops the two sites drifting on the KEY as
 * well as on the value: there is one string in the repository that decides both halves, and a change
 * to it moves both ends in the same commit or moves neither.
 *
 * ⚠ THE DESTINATION MUST TREAT THE INCOMING VALUE AS UNTRUSTED (T-19-31). The contract is ONE
 * equality check against this constant, after which the page renders THIS MODULE'S OWN STRING. The
 * query value is never interpolated into the page — not to make the message more specific, not to
 * name an id, not to echo the token back. `tests/listing/create-signal.test.ts` proves a hostile
 * value produces no notice and appears nowhere in the rendered output.
 */
export const LISTING_CREATE_FAILED_PARAM = "create=failed";

/**
 * The state and the reason as ONE string.
 *
 * ⚠ ASSEMBLED HERE, IN JAVASCRIPT, rather than interleaved as JSX text. SWC's whitespace transform
 * drops the leading space of text that follows an expression container — the defect
 * `(host)/host/page.tsx:75` records by name, which once shipped "₱300.00in cancellation fees", and
 * which `requests-signal.ts:66-77` composes around for exactly this reason. Doing it once here also
 * means a second surface cannot render the two clauses in the wrong order or with the wrong
 * separator.
 */
export function composeListingCreateFailedSentence(): string {
  return `${LISTING_CREATE_FAILED_STATE} ${LISTING_CREATE_FAILED_REASON}`;
}
