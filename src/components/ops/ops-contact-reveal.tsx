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
// all. Focus moves onto the REVEALED VALUE, which speaks the address AND its `<dt>` context AND
// lands the caret on the thing the operator pressed to read, in one move. **No second live region is
// needed for success and none may be added** — `src/lib/design/live-regions.ts` declares exactly one
// region for this file, and says at its own site that no success region MAY be added here.
//
// ⚠ THE TARGET IS A PROGRAMMATICALLY-FOCUSABLE TEXT NODE, NOT A CONTROL (D-274). Every property the
// announcement has is carried by the target's POSITION rather than by its element type: it sits
// INSIDE the Email `<dd>`, so a screen reader speaks it with its term; its text content IS the
// address, so the value is what gets spoken; and it is where the operator was going to read anyway.
// `tabIndex={-1}` is what makes that possible without putting a non-interactive value into the tab
// order — `src/components/booking/booking-reference.tsx:143-153` is the shipped precedent for
// exactly this, a focusable value the user copies, and it records the same reason. A `0` would make
// the value an affordance it is not; nothing here suppresses the focus ring, which is the only
// visible trace a sighted operator gets that the announcement happened.
//
// The REFUSAL region below is `ops-decision-actions.tsx:330` reproduced exactly, for the reason that
// file records: the sentence is the SERVER ACTION'S OWN, verbatim, at ordinary ink, with no alarm
// colour and no retry affordance — the control itself is the retry. A client re-wording of a refusal
// is a second account of what happened, kept in agreement with the first by nothing at all.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// BOTH VALUES ARE PLAIN TEXT, AND THE TWO GATE EXEMPTIONS THAT COST ARE RETURNED (D-274)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ FIVE OF THIS FILE'S RULES ARE PHRASED WITHOUT SPELLING THE THING THEY FORBID, and that is
// deliberate rather than coy. Each is checked by a raw acceptance grep over THIS FILE, so a paragraph
// that named its own prohibition would be the thing that failed the check it was explaining — the
// rule `src/lib/ops/review-queue.ts:24-26` states for a table name and `src/lib/validation/ops.ts`
// states for React's raw-HTML escape hatch, from drizzle/0021. Same resolution, same reason: the
// token is DESCRIBED, and the one occurrence of each in this file is the call site or the constant.
// ⚠ THE FIFTH JOINED THE LIST WITH D-274 AND IS THE ONLY ONE AT ZERO OCCURRENCES rather than one:
// the URL scheme that hands an address to a mail client has no call site and no constant left here,
// so this file must be able to explain its removal without re-introducing the token that removal was
// about. That is the same trap in its sharpest form — the explanation becoming the thing that fails.
//
// EMAIL IS PLAIN TEXT, PER PM DECISION D-274 (2026-09-03). It was a compose anchor from plan 18.1-13
// to plan 18.1-16; the PM measured the shipped surface by hand and ruled that a revealed contact is a
// value an operator SELECTS AND COPIES, not a link they follow, and that pressing it must open
// nothing. Plain text is already selectable, so nothing was added to make it so: no copy control (it
// would be a third interactive descendant on a revealed row, and the ruling asked for plain text
// rather than a new affordance), no text-selection utility, no class of its own.
//
// ⚠ AND THIS IS A TIGHTENING RATHER THAN A REVERSAL, WHICH A LATER READER MUST NOT MISS: plan
// 18.1-13 had to WIDEN the Phase-18 terminal property to ship that anchor, and removing it RESTORES
// the property `tests/ops/ops-queue-row.test.tsx` says it *"knows an anchor would fail"*. Both
// exemptions the anchor cost are therefore RETURNED rather than left dangling, in the same commit:
//   • `tests/ops/ops-queue-row.test.tsx` assertion 1 is back to zero anchors of ANY scheme, with the
//     `[role="link"]` clause still at zero, on both row kinds and before and after a reveal.
//   • `tests/design/site-contacts.test.ts` has no declared exemption row at all — D-26's ban on
//     publishing an address to write TO is back to full strength across the whole of `src/`, with
//     zero exemptions, for the first time since 18.1-13.
//
// PHONE IS PLAIN TEXT AND CARRIES NO SCHEME OF ITS OWN (D-271) — no anchor, no dial handler. A
// telephone-scheme href is meaningless on a desktop console and would be a second unguarded scheme
// to argue about for nothing. An absent phone renders `PHONE_ABSENT` below, on `addressOf()`'s
// precedent (`ops-queue-row.tsx:199-201`): *"a blank cell reads as 'fine' rather than as 'there is
// nothing here to check'"*.
//
// ⚠ THAT PARAGRAPH IS UNCHANGED BY D-274, AND IT IS NOW THE THING THE EMAIL MATCHES. Half the PM's
// sentence was already true when they wrote it: the phone was never a link and this file already
// argued it should never become one. So D-274 did not change direction here either — it made the
// two values agree. Do not add a dial affordance to the phone and do not re-litigate it.
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
  const emailRef = React.useRef<HTMLSpanElement | null>(null);

  // THE ANNOUNCEMENT. See the header: the success path owes no region, and this is why — the VALUE
  // that just appeared takes focus, so the outcome is spoken with its `<dt>` context and the caret
  // lands on the thing the operator pressed to read. Keyed on `contact` rather than run once, so a
  // second reveal (a re-mounted row after a queue refresh) announces itself the same way the first
  // did; `tests/ops/ops-queue-row.test.tsx` has a case pinning exactly that, because a tidy-up to a
  // mount-once effect would delete the second announcement without failing anything else.
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
          {/* PLAIN, COPY-PASTEABLE TEXT THAT TAKES FOCUS — see the header, both sections. `user.email`
              is `notNull().unique()`, so there is no empty case and no fallback string.

              `tabIndex={-1}` and NOTHING ELSE. It goes on the value INSIDE this `<dd>` rather than
              on a wrapper, because `<dl>`'s content model permits `dl > div > (dt+, dd+)` and a
              container nesting both facts would be invalid — and because sitting where the anchor
              sat is what preserves the `<dt>` context the announcement carries. No `className` (the
              `<dd>` already carries `ROW_VALUE_CLASS` through `Fact`, and a second type-role class
              on one element reddens `typeRoleOf`), no focus-ring override, no test-only hook. */}
          <span ref={emailRef} tabIndex={-1}>
            {contact.email}
          </span>
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
