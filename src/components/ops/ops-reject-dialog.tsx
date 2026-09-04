"use client";

// OPS-05 / ENF-01 — THE REJECT DIALOG. The reason is a taxonomy first and free text second, the money
// is on screen before the choice is made, and the button that moves money says how many bookings it
// cancels.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE ESCALATION LIVES HERE AND NOT ON THE ROW
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// OPS-04 wants everything needed to decide on one screen; ENF-01 wants the enforcement level chosen
// per case. Those pull against each other: the more power on the row, the easier it is to hit the
// wrong thing forty listings into a session. The answer 18-UI-SPEC settles on is that NO control on
// the queue row can cancel-and-refund at all. Reaching it takes three deliberate acts — open this
// dialog, choose a reason, and actively move a radio off its default — none of which is in the muscle
// path of Reject, Reject, Reject.
//
// The server does not take that arrangement on trust. `cancelBookingAsOps` re-parses the lever and
// refuses unless the escalation was passed EXPLICITLY, because a client arrangement is not a gate and
// a server action is reachable by POST whatever the UI shows (18-08).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE IMPACT BLOCK IS RENDERED UNCONDITIONALLY, AND THAT IS THE WHOLE DEVICE
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every figure is on screen for every listing rejection, whatever the operator has chosen. So
// CHOOSING REVEALS NOTHING — the operator reads the money BEFORE deciding, nothing appears in
// response to an action, and therefore this dialog needs no live region of its own. The row's one
// status region carries the only announcement this flow can make (`ops-decision-actions.tsx`).
//
// ⚠ ZERO ARITHMETIC ON MONEY, AND IT IS STRUCTURAL RATHER THAN POLITE (PROJECT D-130 / GATE-05).
// `OpsCancelImpact` has no numeric money field at all: `refundTotal` and `retainedTotal` arrive as
// finished strings from `formatMoney`, computed server-side in `loadOpsCancelImpact`. This file
// cannot divide, sum or round them because it never receives a number to do it to. A dialog that
// could compute a refund is a dialog that could compute it differently from the server that will
// move it.
//
// ⚠ THE FIGURES ARE A SNAPSHOT AND THE SERVER IS THE AUTHORITY. Between paint and press a booking can
// be cancelled by its own booker, or a payout can leave. The action re-derives everything and a
// mismatch is a calm typed refusal carrying the server's own sentence — never a throw, never a
// partial apply — surfacing in the row's one status region.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// COMPOSED THROUGH THE ONE OVERLAY PATTERN
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `ResponsiveDialog` is the app's single overlay primitive and nothing here reaches past it into the
// vendored module it composes. Below `sm:` the pattern presents as a bottom sheet, which is the whole
// reason an operator can complete this on a phone. `Keep it` closes through the CONTROLLED state
// rather than a vendored close element, the `request-row.tsx` idiom.
//
// THE PATTERN'S OPEN-TIME FOCUS HOOK IS DELIBERATELY NOT PASSED, and this file does not name it —
// `tests/design/responsive-dialog-autofocus.test.tsx` polices its adopters by scanning their SOURCE
// for that prop's name, so a comment mentioning it fails the census against a correct implementation.
// (Measured: it did, on the first run of this file. Same rule, and the same reason, as
// `photo-gallery.tsx`'s note about the client-boundary directive.)
//
// It is not passed because it is not needed here. The footer's DOM order is SAFE-ACTION-FIRST, so
// Radix's own choice — the first tabbable element — already lands on `Keep it`, and D-168's binding
// mitigation ("default focus lands on the safe action, never on the alarm-inked one") holds with no
// hook at all. Steering focus here would be a decision to record in that census, not a line to add.

import * as React from "react";

import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { OpsCancelImpact } from "@/lib/ops/cancel-impact";
import {
  OPS_DEFAULT_LEVER,
  OPS_ENFORCEMENT_LEVERS,
  OTHER_REASON,
  REJECT_NOTE_MAX,
  type OpsEnforcementLever,
} from "@/lib/validation/ops";

/** The heavier lever, named once so the label, the radio and the confirm cannot drift apart. */
const ESCALATION_LEVER: OpsEnforcementLever = OPS_ENFORCEMENT_LEVERS[1];

/**
 * The value class every `<dd>` and every sub-label computes.
 *
 * ONE constant, for `request-row.tsx:ROW_VALUE_CLASS`'s reason: nothing in this dialog is promoted to
 * compete with anything else, and two hand-typed class strings are two chances to promote one of them
 * by accident in a way review cannot see.
 */
const VALUE_CLASS = "text-label";

/** A money or count value — the same role as every other value, plus the figure treatment. */
const FIGURE_CLASS = `${VALUE_CLASS} tabular-nums`;

/** The muted term class, shared by every `<dt>` and every hint sentence. */
const TERM_CLASS = "text-label text-muted-foreground";

/** The static hint under the note. Derived from the schema's own bound so the two cannot disagree. */
export const REJECT_NOTE_HINT = `Up to ${REJECT_NOTE_MAX} characters. The host reads this exactly as you write it.`;

/**
 * The sentence that replaces the money rows when there is nothing to undo AND nothing was ever sold.
 * A statement of fact, not a disabled control.
 */
export const NO_BOOKINGS_SENTENCE = "No bookings to undo — this listing has never been sold.";

/**
 * ⚠ THE SECOND NO-BOOKINGS SENTENCE, AND IT EXISTS BECAUSE THE FIRST ONE CAN BE FALSE.
 *
 * 18-UI-SPEC gives one sentence for the zero case. But `cancellableCount` and `notCancellableCount`
 * move independently: a listing whose every confirmed booking has already been paid out reads zero
 * cancellable and non-zero not-cancellable, and telling an operator it "has never been sold" on that
 * row would be a false statement on the one screen whose job is to be accurate. So the never-sold
 * claim is made only when BOTH counts are zero, and this states the narrower true thing beside the
 * `Can't be undone here` row that explains it.
 */
export const NOTHING_CANCELLABLE_SENTENCE = "No bookings to undo here.";

/** `{n} booking` / `{n} bookings` — the count and its noun, agreeing. */
function bookings(n: number): string {
  return `${n} ${n === 1 ? "booking" : "bookings"}`;
}

export type OpsRejectChoice<TReason extends string> = {
  /** The taxonomy SENTENCE the host will read — never a code, never an id. */
  reason: TReason;
  /** The operator's optional note, raw. Empty string when they wrote nothing. */
  note: string;
  /** Which lever the operator chose. Always the lighter one unless they moved the radio. */
  lever: OpsEnforcementLever;
};

export type OpsRejectDialogProps<TReason extends string> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The control that opens it, handed straight to the pattern's trigger slot. */
  trigger: React.ReactNode;
  /** The overlay's accessible name. */
  title: string;
  /** The lede: who is told, and that this console cannot undo it. */
  description: string;
  /**
   * The kind-appropriate taxonomy, as complete host-readable SENTENCES.
   *
   * Passed in and generic rather than derived here, so the reason this dialog hands back is typed as
   * a member of the caller's own taxonomy. That is what lets the caller pass it to a server action
   * without a cast — and a cast would need a client-authored fallback sentence for the impossible
   * branch, which is exactly the second wording of a refusal this surface refuses to have.
   */
  reasons: readonly TReason[];
  /**
   * The server-computed figures, or `null` when there is no listing behind this rejection.
   *
   * A host rejection cancels no bookings, so it has no impact block and no lever to choose.
   */
  impact: OpsCancelImpact | null;
  /** The confirm's in-flight state, owned by the caller that runs the action. */
  submitting: boolean;
  /** The plain-language act, under the lighter lever. */
  confirmLabel: string;
  /** What the confirm says while the action is running under the lighter lever. */
  submittingLabel: string;
  onConfirm: (choice: OpsRejectChoice<TReason>) => void;
};

export function OpsRejectDialog<TReason extends string>({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  reasons,
  impact,
  submitting,
  confirmLabel,
  submittingLabel,
  onConfirm,
}: OpsRejectDialogProps<TReason>) {
  const reasonId = React.useId();
  const noteId = React.useId();
  const leverLabelId = React.useId();
  const lighterId = React.useId();
  const heavierId = React.useId();

  const [reason, setReason] = React.useState<TReason | "">("");
  const [note, setNote] = React.useState("");
  const [lever, setLever] = React.useState<OpsEnforcementLever>(OPS_DEFAULT_LEVER);

  /**
   * D-233 — THE DEFAULT IS ALWAYS THE LIGHTER LEVER, CHECKED ON MOUNT, EVERY TIME.
   *
   * Reset on BOTH edges rather than only on close. Closing alone would be enough for the dialog as it
   * stands, and it would stop being enough the first time a caller opens this from anywhere other than
   * its own trigger — at which point the dialog would silently remember the last operator's choice
   * across two different listings. This dialog remembers nothing.
   */
  function handleOpenChange(next: boolean) {
    setReason("");
    setNote("");
    setLever(OPS_DEFAULT_LEVER);
    onOpenChange(next);
  }

  const cancellable = impact?.cancellableCount ?? 0;
  const notCancellable = impact?.notCancellableCount ?? 0;

  /**
   * THE RADIO GROUP RENDERS ONLY WHEN THERE IS SOMETHING TO CANCEL.
   *
   * When nothing can be cancelled there is no choice to make, and a radio offering an option that
   * does nothing is a trap: an operator would pick it, press a button promising a refund, and get a
   * calm server refusal for a decision the console had already shown them as available.
   */
  const showLever = impact !== null && cancellable > 0;

  const noteRequired = reason === OTHER_REASON;
  const noteSatisfied = !noteRequired || note.trim().length > 0;
  const canConfirm = reason !== "" && noteSatisfied;

  const escalating = showLever && lever === ESCALATION_LEVER;

  /**
   * ⚠ THE LABEL NAMES THE ACT AND THE NUMBER, AND THAT IS THE ANTI-MUSCLE-MEMORY DEVICE.
   *
   * A generic Confirm under a radio is exactly the shape a tired reviewer clicks through; a button
   * reading `Reject and refund 4 bookings` is not. This is the whole reason the label is dynamic, and
   * it is also why colour never carries the weight alone.
   */
  const activeLabel = escalating
    ? `Reject and refund ${bookings(cancellable)}`
    : confirmLabel;
  const activeSubmittingLabel = escalating ? "Cancelling and refunding…" : submittingLabel;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
      trigger={trigger}
      footer={
        <>
          {/* SAFE ACTION FIRST IN DOM ORDER — see the header's focus note. It closes through the
              controlled state, so the reset above runs on a dismissal exactly as it does on a
              confirm. */}
          <Button variant="ghost" disabled={submitting} onClick={() => handleOpenChange(false)}>
            Keep it
          </Button>
          {/* The escalation confirm is INK, never a solid fill: the shipped destructive-ACTION
              treatment at `listing-card.tsx:367`, already measured and already in the pair
              inventory. A solid alarm-coloured button on a queue shouts on every row it can reach,
              and an ops cancellation is a deliberate act rather than a failure. Red marks the act,
              not the surface. */}
          <Button
            variant="outline"
            className={escalating ? "text-destructive" : undefined}
            disabled={submitting || !canConfirm}
            aria-disabled={submitting || !canConfirm}
            onClick={() => {
              if (submitting || reason === "") return;
              onConfirm({ reason, note, lever });
            }}
          >
            {submitting ? activeSubmittingLabel : activeLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* ── THE REASON: A TAXONOMY FIRST, FREE TEXT SECOND ──────────────────────────────────── */}
        <div className="space-y-2">
          <Label htmlFor={reasonId}>Reason</Label>
          {/* COMPLETE HOST-READABLE SENTENCES, NOT CODES. What is stored is the sentence, because a
              host has READ it: if a later re-wording silently re-rendered the rejection they were
              shown, the record of what they were told would be retroactively false. */}
          <Select value={reason} onValueChange={(v) => setReason(v as TReason)}>
            <SelectTrigger id={reasonId} className="w-full">
              <SelectValue placeholder="Pick the reason the host will read" />
            </SelectTrigger>
            <SelectContent>
              {reasons.map((sentence) => (
                <SelectItem key={sentence} value={sentence}>
                  {sentence}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor={noteId}>
            {noteRequired ? "Explain what happened" : "Anything else the host should know (optional)"}
          </Label>
          <Textarea
            id={noteId}
            value={note}
            maxLength={REJECT_NOTE_MAX}
            required={noteRequired}
            aria-required={noteRequired}
            onChange={(e) => setNote(e.target.value)}
          />
          {/* A STATIC HINT, NEVER A LIVE COUNTER. A counter is a live region, and a live region for a
              character count is noise on a surface that already has exactly one announcement to make.
              The bound itself is re-validated server-side with Zod; this is a courtesy, not the gate. */}
          <p className={TERM_CLASS}>{REJECT_NOTE_HINT}</p>
        </div>

        {/* ── THE IMPACT BLOCK — ALWAYS RENDERED, FOR EVERY LISTING REJECTION ─────────────────── */}
        {impact ? (
          <div className="space-y-2 rounded-lg border p-3">
            <dl className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-4">
                <dt className={TERM_CLASS}>Bookings already made</dt>
                <dd className={FIGURE_CLASS}>{cancellable}</dd>
              </div>

              {cancellable > 0 ? (
                <>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className={TERM_CLASS}>Money that would go back</dt>
                    <dd className={FIGURE_CLASS}>
                      {impact.refundTotal} — the space price, to {cancellable}{" "}
                      {cancellable === 1 ? "booker" : "bookers"}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className={TERM_CLASS}>FitOut keeps</dt>
                    <dd className={FIGURE_CLASS}>{impact.retainedTotal} — the service fee</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className={TERM_CLASS}>The host is paid</dt>
                    <dd className={VALUE_CLASS}>{impact.hostPaid}</dd>
                  </div>
                </>
              ) : null}

              {/* D-241 RENDERED: a booking whose payout has already left is NOT CANCELLABLE HERE, and
                  the console says so WITH the reason — never a silent no-op, never a control that
                  appears to work. */}
              {notCancellable > 0 ? (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className={TERM_CLASS}>Can&apos;t be undone here</dt>
                  <dd className={FIGURE_CLASS}>
                    {notCancellable} — {impact.notCancellableReason}.
                  </dd>
                </div>
              ) : null}
            </dl>

            {/* Outside the description list on purpose: a paragraph is not a legal child of one. */}
            {cancellable === 0 ? (
              <p className={TERM_CLASS}>
                {notCancellable > 0 ? NOTHING_CANCELLABLE_SENTENCE : NO_BOOKINGS_SENTENCE}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* ── THE ENFORCEMENT CHOICE (D-233) ──────────────────────────────────────────────────── */}
        {showLever ? (
          <div className="space-y-2">
            <p id={leverLabelId} className={TERM_CLASS}>
              What happens to bookings already made
            </p>
            <RadioGroup
              value={lever}
              onValueChange={(v) => setLever(v as OpsEnforcementLever)}
              aria-labelledby={leverLabelId}
              className="gap-3"
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value={OPS_DEFAULT_LEVER} id={lighterId} className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor={lighterId} className={VALUE_CLASS}>
                    Block new bookings only
                  </Label>
                  <p className={TERM_CLASS}>
                    Nobody can book this space again until it&apos;s approved. The{" "}
                    {bookings(cancellable)} already made go ahead as planned.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value={ESCALATION_LEVER} id={heavierId} className="mt-1" />
                <div className="space-y-1">
                  <Label htmlFor={heavierId} className={VALUE_CLASS}>
                    Block new bookings and cancel what&apos;s already booked
                  </Label>
                  {/* ALL FOUR MONEY CONSEQUENCES, IN THE ORDER THEY HAPPEN. The last clause is D-235
                      made visible: an operator must not be able to believe a host-cancellation fee is
                      being applied, because none is — 18-07 froze the payout it would net against, so
                      it would be a permanent phantom debt on a suspended account. */}
                  <p className={TERM_CLASS}>
                    The {bookings(cancellable)} already confirmed are cancelled. Each booker gets{" "}
                    {impact?.refundTotal} back — the space price. FitOut keeps the{" "}
                    {impact?.retainedTotal} service fee. The host is paid nothing and is charged no
                    cancellation fee.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        ) : null}
      </div>
    </ResponsiveDialog>
  );
}
