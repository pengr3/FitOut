"use client";

// THE HOST VERIFICATION PANEL (HVER-06 / HVER-08) — six states, two gates, one control, one region.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT ONE SENTENCE IS AUTHORED IN THIS FILE, AND THAT IS THE RULE RATHER THAN A HABIT
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every host-visible string here is imported from `src/lib/host/verification-signal.ts` or returned by
// `requestHostVerification`. `hosting-paused-notice.tsx:7-11` states the argument for the surface one
// domain over: a sentence typed into a page file is a sentence only that page agrees with. This phase
// has four readers of these words — this panel, the page's header, its loading plate and the
// banned-language corpus that scans them — so a literal at this call site would be a literal three of
// the four have never seen.
//
// The consequence, stated so nobody adds a helpful line: a NEW thing to tell a host is a change to the
// copy module and to 18.1-UI-SPEC, not an edit here. This file decides PRESENTATION and nothing else,
// which is the same division `hosting-paused-notice.tsx` draws for the suspension.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE SIX STATES, AND WHAT EACH ONE MAY DRAW
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   unverified     the panel + THE FORM. The ordinary state of a host nobody has checked.
//   pending        the panel and NOTHING ELSE. FitOut stores the session id and not the hosted-flow
//                  URL (`src/lib/verification/port.ts:76-98` carries four fields and says do not add a
//                  fifth), so a continue affordance cannot be reconstructed and drawing one would be a
//                  control that acts on nothing.
//   approved       terminal, plus an inline link to the listings grid.
//   rejected       the panel, plus EITHER the retry control and the form (cooldown elapsed) OR one
//                  sentence naming the instant (cooldown running). Never both, never neither.
//   suspended      the SHIPPED notice, rendered unchanged, and NO submit control — D-266 made visual.
//   grandfathered  terminal, plus the same inline link.
//
// ⚠ THE `suspended` BRANCH DRAWS NO BUTTON, AND ITS ABSENCE IS THE DECISION (D-266). A suspension is a
// named staff member's deliberate act; the machine does not draw the control that would try to reverse
// it. The server refuses structurally anyway — that state is simply absent from the guarded UPDATE's
// own WHERE — so the surface and the action agree without either one depending on the other.
//
// ⚠ THE COOLDOWN ARRIVES AS A FINISHED SENTENCE AND THIS FILE PERFORMS NO ARITHMETIC (PROJECT D-130 /
// GATE-05). The instant is composed server-side by the copy module from the SAME column and the SAME
// interval the action's WHERE reads. A countdown computed here would be a second authority on a rule
// the database already owns, which is precisely the defect that gate is named for.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// FOUR THINGS THIS FILE MAY NOT DO
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. NAME THE CHECKING PARTNER. The hand-off line names the partner's EXISTENCE and no partner — no
//      brand, no logo, no link. Naming the vendor would put a third party's mark on FitOut's trust
//      surface and turn a vendor swap into a copy change, which is the outcome the port in
//      `src/lib/verification/port.ts` exists to prevent (D-258 / HVER-01). An acceptance grep counts
//      the vendor's name in this file and expects zero, in prose as well as in code.
//   2. RE-AUTHOR A REFUSAL. The action's sentence is rendered VERBATIM into one named region. A second
//      wording of a refusal is a second thing to keep in agreement with the code that refused, and the
//      0-row sentence is one calm sentence for five conditions ON PURPOSE — it is also a privacy
//      property, so a client branch that split it apart would leak the distinction it collapses.
//   3. REACH FOR THE ELEVATED TONE OR THE SUCCESS HUE. A host waiting on a partner, and a host the
//      partner did not pass, are NORMAL LIFECYCLE STATES (DS-10). The panel is muted in all six.
//      `tests/design/host-tone-census.test.ts` declares this file at exactly zero, and the approved
//      panel draws no hue and no glyph — a host who has just been checked is being told a fact.
//   4. BRANCH ON THE VIEWPORT. ONE component tree at every width; no media query, no viewport-
//      conditional markup. At the narrow floor the form stacks and both controls stay 44px.
//
// ⚠ THE TWO GATES BELOW ARE HINTS AND THE ACTION IS THE GATE. `requestHostVerification` re-reads
// `user.emailVerified` server-side and re-parses the phone with its own bound, and it is reachable by
// POST whatever this component renders. A client that skipped both gates would change nothing that
// decides anything.

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";

import { HostingPausedNotice } from "@/components/host/hosting-paused-notice";
import { PanelCard } from "@/components/patterns/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestHostVerification } from "@/app/actions/host-verification";
import type { HostVerificationStatus } from "@/lib/db/schema";
import { resendVerificationEmail } from "@/lib/host/resend-verification";
import {
  HOST_VERIFICATION_REGION_NAME,
  VERIFICATION_EMAIL_GATE_LABEL,
  VERIFICATION_EMAIL_RESEND_LABEL,
  VERIFICATION_HANDOFF_LINE,
  VERIFICATION_MOBILE_ONLY_LINE,
  VERIFICATION_PHONE_HELPER,
  VERIFICATION_PHONE_LABEL,
  VERIFICATION_SIGNAL,
  VERIFICATION_SUBMIT_PENDING_LABEL,
  composeEmailGateLine,
  composeVerificationRejectionReason,
} from "@/lib/host/verification-signal";
import { cn } from "@/lib/utils";

/**
 * Where the confirmation link comes back to, and where the terminal panels point.
 *
 * PATHS, NOT PROSE. The copy module owns the LABELS and says so at its own type: the routes are built
 * by the surfaces that own them, and a second spelling in a copy module would be a second place for a
 * route to be wrong. This is that surface, so the two destinations live here.
 */
const VERIFY_PATH = "/host/verify";
const LISTINGS_PATH = "/host/listings";

/** The reason paragraph's type role — `hosting-paused-notice.tsx`'s shipped pairing, reused literally. */
const REASON_CLASS = "text-body text-muted-foreground";

/** Every supporting line under the control, and the refusal region. One role, one ink, no exceptions. */
const SUPPORTING_CLASS = "text-label text-muted-foreground";

export type VerificationPanelProps = {
  /** The host's own row, or `unverified` when there is none. The map below is total over this union. */
  readonly status: HostVerificationStatus;
  /**
   * `host_verification.reason` — the checking partner's bounded sentence, or an operator's own, or
   * null. It crosses a trust boundary here and stays TEXT all the way to a React text node: nothing in
   * this file sanitises it and nothing may interpolate it into markup (T-18-1301).
   */
  readonly reason: string | null;
  /**
   * D-264 — the FINISHED retry sentence when the cooldown is still running, or null when it is not.
   *
   * ⚠ NULL IS THE PERMISSION AND THE STRING IS THE REFUSAL, and the page is what decides which. It
   * holds the row's `updated_at` and the one interval constant the action's WHERE binds; this
   * component holds neither, on purpose, so it cannot compute a second answer.
   */
  readonly retryAfterSentence: string | null;
  /** The host's OWN address, read from their session by the page — echoed back, never published. */
  readonly hostEmail: string;
  /** D-269's gate, as a HINT. The action re-reads the server's own copy and refuses independently. */
  readonly emailVerified: boolean;
};

export function VerificationPanel({
  status,
  reason,
  retryAfterSentence,
  hostEmail,
  emailVerified,
}: VerificationPanelProps) {
  // THE SHIPPED COMPONENT, NOT NEW WORDS. A suspended host reads the same notice here that they read
  // on the dashboard, the listings grid and the earnings page, because what a suspended host is told
  // must be identical on all four. This branch is also the one that draws no control at all.
  if (status === "suspended") {
    return <HostingPausedNotice reason={reason} />;
  }

  const signal = VERIFICATION_SIGNAL[status];

  // Terminal, and terminal is the whole content of these two. `approved` states a fact and does not
  // congratulate; `grandfathered` says what is TRUE for that host and stops. Neither draws a control
  // that ACTS, so neither is touch-sized: the way out is a destination, and the inline underlined link
  // is `host-signals.tsx`'s shipped grammar for exactly that.
  if (status === "approved" || status === "grandfathered") {
    return (
      <PanelCard tone="muted" title={signal.state}>
        <p className={REASON_CLASS}>{signal.reason}</p>
        <p className={cn(SUPPORTING_CLASS, "mt-3")}>
          <Link href={LISTINGS_PATH} className="underline underline-offset-4">
            {signal.wayOut}
          </Link>
        </p>
      </PanelCard>
    );
  }

  // A session is out and no answer has landed. NO WAY OUT, and the absence is structural rather than
  // stylistic — see the header. This copy is honest only because an expired or abandoned session
  // returns the row to `unverified`; if that mapping is ever removed, this branch becomes a permanent
  // dead end dressed as patience and the two must move in the same commit.
  if (status === "pending") {
    return (
      <PanelCard tone="muted" title={signal.state}>
        <p className={REASON_CLASS}>{signal.reason}</p>
      </PanelCard>
    );
  }

  if (status === "rejected") {
    return (
      <PanelCard tone="muted" title={signal.state}>
        {/* The STORED sentence, or the canned one. The composer decides; this file renders. */}
        <p className={REASON_CLASS}>{composeVerificationRejectionReason(reason)}</p>
        {retryAfterSentence === null ? (
          // The cooldown has elapsed: the retry control and the form, exactly as the first panel
          // renders them. Secondary weight for a second ask — the shipped decision-actions grammar.
          <div className="mt-4">
            <VerificationForm
              // Indexed by the CONCRETE key rather than through the narrowed `signal`, and that is
              // what makes the label non-nullable at compile time rather than at a runtime fallback:
              // the map's `as const` keeps each state's way-out a literal, and `pending` and
              // `suspended` are the two whose way-out is genuinely null. There is no third spelling
              // of this string anywhere.
              idleLabel={VERIFICATION_SIGNAL.rejected.wayOut}
              controlVariant="outline"
              hostEmail={hostEmail}
              emailVerified={emailVerified}
            />
          </div>
        ) : (
          // Still running: NO control at all, and one sentence carrying the instant. An instant rather
          // than an interval because the database keeps the instant — see the composer's own docblock,
          // and banned family 3 for why a duration would be the wrong shape even if it were true.
          <p className={cn(SUPPORTING_CLASS, "mt-3")}>{retryAfterSentence}</p>
        )}
      </PanelCard>
    );
  }

  return (
    <PanelCard tone="muted" title={signal.state}>
      <p className={REASON_CLASS}>{signal.reason}</p>
      <div className="mt-4">
        <VerificationForm
          idleLabel={VERIFICATION_SIGNAL.unverified.wayOut}
          controlVariant="default"
          hostEmail={hostEmail}
          emailVerified={emailVerified}
        />
      </div>
    </PanelCard>
  );
}

/**
 * ONE `<form>`, TWO GATES, ONE CONTROL — and ONE region for every refusal it can meet.
 *
 * WRITTEN ONCE AND RENDERED FROM TWO BRANCHES, which is what keeps the region singular. The first
 * panel and the cooled-down rejection ask for the identical thing; two copies of this markup would be
 * two live regions in one file, and the count is a claim about the DOM rather than about what is
 * visible.
 */
function VerificationForm({
  idleLabel,
  controlVariant,
  hostEmail,
  emailVerified,
}: {
  /** The idle label — the state's own way-out, never a third spelling of it. */
  readonly idleLabel: string;
  /**
   * NEUTRAL SOLID on the first ask, secondary weight on the second, and never the conversion colour.
   *
   * Two reasons, either sufficient. The panel has exactly ONE control, so it needs no hue to be found
   * — picking one action out of several is the whole job that colour does on this product, and there
   * are no others here. And this is the button that hands a person's identity document to a third
   * party: the highest-consequence, least-reversible act on the host tree is not a decision to paint
   * in the colour that exists to encourage a decision.
   */
  readonly controlVariant: "default" | "outline";
  readonly hostEmail: string;
  readonly emailVerified: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [refusal, setRefusal] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Read synchronously, BEFORE the transition: `currentTarget` is null by the time an async
    // callback runs, and a form read after the event has settled is the shape that silently submits
    // an empty field.
    const phone = String(new FormData(event.currentTarget).get("phone") ?? "");
    setRefusal(null);
    startTransition(async () => {
      const result = await requestHostVerification({ phone });
      if (result.ok) {
        // Straight into the hosted flow, which is a different origin — the same hand-off
        // `payout-banner.tsx` makes into the payments provider's onboarding, and for the same reason:
        // a client router is for routes this app owns.
        window.location.href = result.redirectTo;
        return;
      }
      setRefusal(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      {/* ── GATE 1 (D-269) — the confirmed email, on the shipped checklist grammar: a LABEL, a DONE
             boolean, and an ACTION present only when the row is unmet. The marker the wizard's
             checklist draws is deliberately absent: it is the one filled success surface left in this
             repository and this phase spends that hue zero times. Met reads as met through the same
             struck-through muted treatment the shipped rows use, and unmet is unmistakable because it
             is the only one carrying a control and a line about an inbox. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("text-label", emailVerified && "text-muted-foreground line-through")}>
            {VERIFICATION_EMAIL_GATE_LABEL}
          </span>
          {emailVerified ? null : (
            <Button
              type="button"
              variant="outline"
              size="touch"
              disabled={pending}
              aria-disabled={pending}
              onClick={() => {
                // The resend has ONE owner since plan 18.1-10, and the callback path is the only
                // thing this call site decides — the wizard sends a host back where they were
                // standing, and so does this. Both outcomes are the extracted module's toasts: the
                // one thing on this surface whose whole result is a message, with no state changed
                // and nothing left on screen to address.
                void resendVerificationEmail({ email: hostEmail, callbackURL: VERIFY_PATH });
              }}
            >
              {VERIFICATION_EMAIL_RESEND_LABEL}
            </Button>
          )}
        </div>
        {emailVerified ? null : (
          // The address is the HOST'S OWN, composed in the module rather than interleaved as markup
          // text — the transform that once dropped a leading space and shipped two words welded
          // together. It is the inverse of publishing an address for somebody to write to.
          <p className={SUPPORTING_CLASS}>{composeEmailGateLine(hostEmail)}</p>
        )}
      </div>

      {/* ── GATE 2 (D-268) — the phone. Required here as a hint; re-parsed server-side with its own
             permissive bound, because the value lands in a durable column an operator later reads. */}
      <div className="space-y-2">
        <Label htmlFor="verification-phone">{VERIFICATION_PHONE_LABEL}</Label>
        <Input
          id="verification-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          disabled={pending}
          aria-describedby="verification-phone-helper"
        />
        <p id="verification-phone-helper" className={SUPPORTING_CLASS}>
          {VERIFICATION_PHONE_HELPER}
        </p>
      </div>

      {/* ── THE CONTROL. 44px at every width because it ACTS, and it is the only thing here that does.
             In flight it carries BOTH `disabled` and `aria-disabled` — the shipped request-row idiom:
             one of them stops the press and the other is what a screen reader is told about it. */}
      <Button
        type="submit"
        variant={controlVariant}
        size="touch"
        disabled={pending}
        aria-disabled={pending}
      >
        {pending ? VERIFICATION_SUBMIT_PENDING_LABEL : idleLabel}
      </Button>

      {/*
        ⚠ D-273 — THE PANEL'S RESTING STATE CARRIES THE DEVICE INSTRUCTION, AND THAT PLACEMENT IS THE
        DECISION RATHER THAN THE DESCRIPTION.

        Both lines below are rendered UNCONDITIONALLY, beneath the control, from the first paint: they
        are not gated on a press, on the in-flight flag, or on a refusal. The partner's hosted flow is
        configured so it will not run on a computer, and a host who learns that AFTER being handed off
        has been told too late — the redirect they come back from cannot say why, and the most
        expensive outcome in this flow is a decline that spends one of their tries.

        `tests/listing/review-signal.test.ts` can see that the sentence EXISTS and that it is safe to
        say; only this surface can be wrong about WHEN it is said, which is why that file's own
        NOT COVERED list names the placement and `tests/host/verification-panel.test.tsx` renders the
        resting panel and asserts it.

        The second line is the ONLY place the product names the partner's existence, and it names no
        partner.
      */}
      <div className="space-y-1">
        <p className={SUPPORTING_CLASS}>{VERIFICATION_MOBILE_ONLY_LINE}</p>
        <p className={SUPPORTING_CLASS}>{VERIFICATION_HANDOFF_LINE}</p>
      </div>

      {/*
        THE ONE REGION, mounted only while a refusal exists.

        Named rather than content-named, for the measured reason `src/lib/design/live-regions.ts`
        records: on one screen-reader pairing a named live region can be announced BY ITS NAME INSTEAD
        OF ITS CONTENT, so the name is a three-word LABEL saying which region this is and never a
        paraphrase of the sentence inside it. `role=status` is nameFrom:author, so without the label it
        would compute the empty string and be unaddressable however good its sentence was. This is
        `ops-decision-actions.tsx`'s shipped resolution of the same hazard, reproduced.

        ORDINARY INK, NO ALARM COLOUR, NO RETRY AFFORDANCE OF ITS OWN — the form's control is the
        retry, and a second button that re-presses the first one is a control that acts on nothing.

        AND NOT A TOAST. A refusal leaves this surface on screen, so it belongs on it rather than in a
        dismissible, timed, unaddressable overlay. The resend keeps the toasts, because its whole
        result is a message and there is nothing left to address.

        ONE region serves every branch the action can refuse with, because a press can only refuse one
        thing; a second refusal replaces this sentence with the next, which is one announcement per
        press.
      */}
      {refusal ? (
        <p role="status" aria-label={HOST_VERIFICATION_REGION_NAME} className="text-label">
          {refusal}
        </p>
      ) : null}
    </form>
  );
}
