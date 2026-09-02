"use client";

// OPS-06 / D-257 (PM-E) / D-271 — THE CONTACT REVEAL. One press, two values, and a row in the trail.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THE REVEALED VALUES LIVE IN THIS ISLAND'S REACT STATE, AND NOWHERE ELSE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// They arrive as the RETURN VALUE of `revealHostContact` and they are NEVER props from the RSC. That
// is not an implementation preference — it is the whole mechanism. D-271's own warning: shipping the
// values in the initial payload behind a `hidden` attribute or a CSS toggle "is a reveal with no
// audit, and the payload is readable". A press that fetches is a press the server sees, so the record
// and the reveal are the same call and there is no shape in which one happens without the other.
//
// `src/lib/ops/review-queue.ts` is therefore BYTE-UNCHANGED by this feature (FINDING F-6), and the
// consequence is structural rather than documentary: the queue item TYPE has no field for a contact
// column, so there is no consumer anywhere that could read an email off one and `tsc` is the thing
// that says so.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE VALUES ARE TWO FACTS AND NOT ONE LINE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `row-card.tsx`'s own docblock records that the `<dl>` slot exists so *"the label↔value association
// survives linearisation on a narrow screen"*. Two values crammed into one `<dd>` throws that away at
// exactly the width where it matters, so the `Contact` fact is REPLACED by `Email` and `Phone` rather
// than expanded in place. Authoring the pairs is why the island reads `Fact` from
// `ops-row-fact.tsx`: a component cannot replace the pair it is rendered inside.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// FOCUS MOVING **IS** THE SUCCESS ANNOUNCEMENT, AND THERE IS NO SECOND REGION
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// GATE-03 rule 6 says one live region announces one outcome; rule 7's stated mechanism for an event
// that must be noticed is *polite region + moved focus*. Here the success is CONTENT APPEARING
// ELSEWHERE IN THE LIST — a screen-reader operator would otherwise press a button and hear nothing at
// all. Moving focus to the `mailto:` anchor announces the anchor AND its `<dt>` context AND puts the
// caret on the operator's next action, in one move. **No second live region is needed for success and
// none may be added** — `src/lib/design/live-regions.ts` declares exactly one region for this file.
//
// The REFUSAL region below is `ops-decision-actions.tsx:330` reproduced exactly, for the reason that
// file records: the sentence is the SERVER ACTION'S OWN, verbatim, at ordinary ink, with no alarm
// colour and no retry affordance — the control itself is the retry. A client re-wording of a refusal
// is a second account of what happened, kept in agreement with the first by nothing at all.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE ANCHOR, THE PHONE, AND THE TWO GATE EXEMPTIONS THE ANCHOR COSTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ FOUR OF THIS FILE'S RULES ARE PHRASED WITHOUT SPELLING THE THING THEY FORBID, and that is
// deliberate rather than coy. Each is checked by a raw acceptance grep over THIS FILE, so a paragraph
// that named its own prohibition would be the thing that failed the check it was explaining — the
// rule `src/lib/ops/review-queue.ts:24-26` states for a table name and `src/lib/validation/ops.ts`
// states for React's raw-HTML escape hatch, from drizzle/0021. Same resolution, same reason: the
// token is DESCRIBED, and the one occurrence of each in this file is the call site or the constant.
//
// EMAIL is a `mailto:` anchor, and that is a COMPOSE ACTION rather than navigation — the row still
// browses nowhere, which is what keeps OPS-04 / D-246's terminal decision intact. It costs two
// declared exemptions, each narrow and each carrying its reason at the assertion:
//   • `tests/ops/ops-queue-row.test.tsx` assertion 1 — zero anchors EXCEPT one whose href begins
//     with that scheme, at most one per revealed row. The `[role="link"]` clause stays at zero.
//   • `tests/design/site-contacts.test.ts` — one `EXCLUDED_MAILTO` row. That gate's subject is
//     FitOut PUBLISHING an address to write TO while `SUPPORT_EMAIL` is null; this is the inverse
//     direction, an authenticated staff member composing TO a host whose address FitOut already
//     holds. `unguardedMailto` itself is NOT relaxed.
//
// PHONE IS PLAIN TEXT AND CARRIES NO SCHEME OF ITS OWN (D-271) — no anchor, no dial handler. A
// telephone-scheme href is meaningless on a desktop console and would be a second unguarded scheme
// to argue about for nothing. An absent phone renders `PHONE_ABSENT` below, on `addressOf()`'s
// precedent (`ops-queue-row.tsx:199-201`): *"a blank cell reads as 'fine' rather than as 'there is
// nothing here to check'"*.
//
// ⚠ AND IT GETS THE ORDINARY VALUE CLASS, NEVER THE FIGURE TREATMENT. `ops-row-fact.tsx`'s money
// constant is for money and counts; giving a phone number monospaced digits is the first step toward
// reading it as something to compare down a column. Nothing on the row is promoted by the reveal —
// the loudest thing is still the wait figure.
//
// ⚠ NO NEW GLYPH, NO TEST-ONLY DOM HOOK, NO VIEWPORT READ, NO CORAL, NO DESTRUCTIVE INK, NO DIALOG.
// A reveal is a read: all responsiveness here is CSS and every selector a spec needs is a role or a
// label (`src/lib/design/selector-contract.ts` is unchanged by this plan and its scope rule says an
// id is added only where a role or label query cannot express the target).

import * as React from "react";

import { revealHostContact, type OpsHostContact } from "@/app/actions/ops-contact";
import { Fact, ROW_VALUE_CLASS } from "@/components/ops/ops-row-fact";
import { Button } from "@/components/ui/button";

/**
 * The refusal region's NAME. Three words that say WHICH region this is.
 *
 * Exported so the specs and `src/lib/design/live-regions.ts` read the string instead of retyping it —
 * `OPS_REFUSAL_REGION_NAME`'s idiom, one file over. A LABEL and never a copy or a paraphrase of the
 * sentence inside it: on the VoiceOver/Safari pairing a named live region can be announced BY ITS
 * NAME INSTEAD OF ITS CONTENT, so a name duplicating the sentence would read it twice and a name
 * paraphrasing it would replace it with a worse version.
 */
export const OPS_CONTACT_REGION_NAME = "Contact not shown";

/**
 * What an absent phone reads as. `user.phone` is nullable and self-declared at submission (D-268), so
 * this is a REAL state an operator should see as such rather than an empty `<dd>` — which reads as a
 * rendering bug at best and as "fine" at worst.
 */
const PHONE_ABSENT = "Not provided";

/**
 * The reveal, on ONE queue row.
 *
 * `userId` is the HOST's user id — `hv.user_id` on a host row, `l.host_id` on a listing row. Both
 * branches of `loadReviewQueue` already carry it, which is FINDING F-6's whole point.
 *
 * ⚠ 18.1-UI-SPEC's interaction sketch spells the argument `hostId`. The shipped spelling is `userId`,
 * because that is what all five ops decision actions take (`approveHostSchema = z.object({ userId:
 * id() })`) and what the audit `meta` records — one column, one name, rather than a third spelling
 * introduced at the one call site that hands the value to an action.
 */
export function OpsContactReveal({
  userId,
  hostLabel,
}: {
  userId: string;
  hostLabel: string;
}) {
  const [contact, setContact] = React.useState<OpsHostContact | null>(null);
  const [showing, setShowing] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);
  const emailRef = React.useRef<HTMLAnchorElement | null>(null);

  // THE ANNOUNCEMENT. See the header: the success path owes no region, and this is why — the anchor
  // that just appeared takes focus, so the outcome is spoken with its `<dt>` context and the caret
  // lands on the operator's next action. Keyed on `contact` rather than run once, so a second reveal
  // (a re-mounted row after a queue refresh) announces itself the same way the first did.
  React.useEffect(() => {
    if (contact !== null) emailRef.current?.focus();
  }, [contact]);

  async function handleReveal() {
    if (showing) return;
    setShowing(true);
    setRefusal(null);
    try {
      const result = await revealHostContact({ userId });
      if (result.ok) {
        setContact(result.contact);
      } else {
        setRefusal(result.error);
      }
      // Reset on BOTH branches. On success the control is unmounted a render later and the flag is
      // dead — but a latched in-flight flag left behind for whoever next renders this control is the
      // trap, not the extra render.
      setShowing(false);
    } catch (e) {
      // `ops-decision-actions.tsx:266-269`'s shape: return the control to idle and RETHROW. A thrown
      // action has no server sentence, so writing one here would be the client-authored refusal this
      // file's header forbids; the route's error boundary owns that case.
      setShowing(false);
      throw e;
    }
  }

  if (contact !== null) {
    return (
      <>
        <Fact term="Email">
          {/* A COMPOSE ACTION, NOT A DESTINATION — see the header. `user.email` is
              `notNull().unique()`, so there is no empty case and no fallback string. */}
          <a ref={emailRef} href={"mailto:" + contact.email}>
            {contact.email}
          </a>
        </Fact>
        <Fact term="Phone">{contact.phone ?? PHONE_ABSENT}</Fact>
      </>
    );
  }

  return (
    <Fact term="Contact">
      {/* `space-y-2` — `ops-decision-actions.tsx:274`'s rhythm, so the sentence lands directly under
          the control that produced it rather than somewhere else on the row. A `<div>` inside the
          `<dd>` rather than a sibling of it, because a `<p>` is not a permitted child of a `<dl>`. */}
      <div className="space-y-2 text-right">
        <Button
          variant="outline"
          size="touch"
          onClick={handleReveal}
          disabled={showing}
          aria-disabled={showing}
          aria-label={`Show contact for ${hostLabel}`}
        >
          {showing ? "Showing…" : "Show contact"}
        </Button>

        {/* THE ONE REGION. Mounted only while a refusal exists — the shipped shape, because the
            success path owes zero regions (the focus move is its announcement). Its name is a LABEL;
            its content is the server's sentence, verbatim. */}
        {refusal ? (
          <p role="status" aria-label={OPS_CONTACT_REGION_NAME} className={ROW_VALUE_CLASS}>
            {refusal}
          </p>
        ) : null}
      </div>
    </Fact>
  );
}
