"use client";

// RsvpForm (GROUP-02 / GROUP-03 · D-112 / D-116 / D-117 / D-120, 08-UI-SPEC §3) — the identity block and the
// RSVP choice on the public invite page. The one interactive surface in the app that a person with no FitOut
// account, and no intention of getting one, is expected to complete.
//
// ── THE FOUR RULES THIS FILE EXISTS TO HOLD ───────────────────────────────────────────────────────────────
//
// 1. THE SERVER IS THE GATE; THIS FORM IS A COURTESY (D-112 / GROUP-05). The `full` prop disables the Yes
//    button, and that is ALL it does — it is a display convenience computed from a count the page read a
//    moment ago. The authority is `claimSeat`'s `SELECT … FOR UPDATE` inside `submitRsvp`. So a Yes that
//    looked open and lost the race comes back as an ordinary `{ ok: false, error }` whose sentence the
//    server already composed with the real cap, and this component RENDERS THAT SENTENCE rather than
//    deciding anything. There is deliberately no client-side "am I still under the cap?" re-check anywhere
//    below: a second opinion that disagreed with the row lock could only ever be the wrong one.
//
// 2. THE GUEST PATH IS THE POINT, NOT THE FALLBACK (D-116 / G1 / GROUP-03). Logged out, this renders a name
//    field and an OPTIONAL email field — not a signup wall with a guest escape hatch. `Log in instead` is a
//    ghost link, the quietest control on the surface, because logging in is the alternative here and not the
//    expectation.
//
// 3. THE EMAIL FIELD IS A BENEFIT, NEVER A GATE (D-117 / G2). It is marked optional in its own label, its
//    helper text states what the person GETS by filling it in, and leaving it blank submits a complete,
//    first-class RSVP that counts toward the headcount exactly like any other. Nothing here nags, re-asks,
//    or blocks on it. If a future edit makes this field required, it silently reverses GROUP-03.
//
// 4. ONE RSVP IS ONE PERSON (D-120). There is NO control anywhere below for bringing extra people along, and
//    that absence is structural rather than merely unrendered: `rsvpSchema` has no such field either
//    (08-06), so there is no request shape in which a head count could be submitted at all. Everyone coming
//    answers on their own — which is what the microcopy under the buttons tells them. Do not add such a
//    control here without reopening D-120.
//
// ⚠️ THE TOKEN IS A BEARER CREDENTIAL (D-118 / T-08-23). It arrives as a prop, is handed to `submitRsvp`,
// and goes nowhere else: it is never put in a state variable that renders, never appended to a query string
// by this component, and there is deliberately NO browser-log call of any kind in this file — not even on
// the failure path, where logging the request you just failed to send is the obvious instinct. Same rule,
// same reason as share-link-box.tsx.
//
// ⚠️ GREP TRIPWIRE (the 07-04 idiom). All three absences above — the alarm colour token, the browser logger,
// and the D-120 head-count control — are checked by grepping this file for their own names, so none of them
// is spelled out anywhere here, comments included. A grep that the comment forbidding the thing can trip is
// not a guard.
//
// COLOUR: `Yes, I'm coming` is the ONE coral on this page (08-UI-SPEC §Color accent #2) and `Can't make it`
// is a neutral outline — declining is a reversible, expected answer, not damage. `full` and `closed` are
// neutral alerts: being full is a happy outcome (G4) and a session that has started is just time passing.

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LockIcon, UsersRoundIcon } from "lucide-react";
import type { z } from "zod";

import { rsvpSchema } from "@/lib/validation/group";
import { submitRsvp } from "@/app/actions/group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RsvpConfirmation } from "@/components/group/rsvp-confirmation";

/**
 * The client-side shape, taken from the SERVER's own schema minus the answer (which is carried by whichever
 * button was pressed, not by a field). Reusing `rsvpSchema` rather than restating its bounds means the
 * inline "that name is too long" a guest sees cannot drift from the rule the action enforces.
 *
 * This validation is UX ONLY. `submitRsvp` re-parses the whole body server-side (Security V5) — a crafted
 * POST never passes through this file at all.
 */
const rsvpIdentitySchema = rsvpSchema.omit({ answer: true });
type RsvpIdentityValues = z.input<typeof rsvpIdentitySchema>;

/** What the SERVER recorded, as this component holds it between the submit and the next page load. */
type RecordedRsvp = { answer: "yes" | "no"; reachable: boolean };

export type RsvpFormProps = {
  /** The bearer invite credential (D-118). Passed straight to the action; never logged, never re-emitted. */
  token: string;
  /**
   * The signed-in viewer, or null for a guest — the D-116 fork. Read server-side with
   * `auth.api.getSession` on a page that does NOT require it; null is the expected, supported case.
   */
  viewer: { name: string } | null;
  /**
   * The server-computed display state. `closed` is the DB clock's answer (`now() >= starts_at`, D-120) and
   * `full` is the courtesy count against `capacity_snapshot` (D-112) — neither is ever computed here.
   */
  state: "open" | "full" | "closed";
  /** The D-111 `capacity_snapshot`, for the "all {N} spots are taken" sentence. */
  capacity: number;
  /** Same-origin `/login?callbackURL=…` that returns to THIS invite. Only used when `viewer` is null. */
  loginHref: string;
  /**
   * The answer this viewer already has on record, for a returning ACCOUNT (D-120). Guests are deliberately
   * not recognised on arrival: we would have to identify them by an address they have not typed yet.
   */
  existingAnswer: "yes" | "no" | null;
};

export function RsvpForm({
  token,
  viewer,
  state,
  capacity,
  loginHref,
  existingAnswer,
}: RsvpFormProps) {
  // A returning account starts on their confirmation, not on an empty form — seeing "Yes, I'm coming"
  // offered again would suggest their earlier answer never landed. `reachable: true` holds by construction:
  // only an account can be recognised on arrival, and an account always has a channel.
  const [recorded, setRecorded] = React.useState<RecordedRsvp | null>(
    existingAnswer ? { answer: existingAnswer, reachable: true } : null,
  );
  // The D-120 change-answer toggle: puts the choice back on screen without discarding what was recorded.
  const [changing, setChanging] = React.useState(false);
  /**
   * WHICH answer is in flight, not merely THAT one is — so only the button that was actually pressed shows
   * "Saving…". The answer is not a form field (it is carried by the control that submitted), and it is
   * deliberately state rather than a ref: a ref read during render is exactly what makes a button label lag
   * a click by one paint.
   */
  const [pendingAnswer, setPendingAnswer] = React.useState<"yes" | "no" | null>(null);
  const pending = pendingAnswer !== null;
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<RsvpIdentityValues>({
    resolver: zodResolver(rsvpIdentitySchema),
    // A signed-in attendee RSVPs under their ACCOUNT name and the field is not rendered — the action reads
    // the name off the session regardless, so this default only keeps one form shape for both branches.
    defaultValues: { name: viewer?.name ?? "", email: "" },
  });

  async function onSubmit(values: RsvpIdentityValues, answer: "yes" | "no") {
    // Belt-and-braces against a keyboard submit landing on a Yes the page has already disabled. The server
    // would refuse it anyway (that is rule 1) — this just avoids a pointless round trip.
    if (state === "closed" || (state === "full" && answer === "yes")) return;
    if (pending) return; // double-click guard, before the disabled attribute can apply

    setPendingAnswer(answer);
    setFormError(null);
    try {
      const res = await submitRsvp(token, {
        name: values.name,
        // Blank collapses to undefined in the schema; passing "" would be the same thing, but sending
        // `undefined` keeps "no address" a single shape all the way down (D-117).
        email: values.email?.trim() ? values.email.trim() : undefined,
        answer,
      });

      if (res.ok) {
        // Whatever the SERVER recorded — including the `reachable` flag that decides the G3 disclosure.
        setRecorded({ answer: res.status, reachable: res.reachable });
        setChanging(false);
        setPendingAnswer(null);
        return;
      }

      // Every failure from the action is already a calm, finished sentence composed with the real numbers:
      // the group just filled up, RSVPs have closed, the invite is no longer active, or a plain retry. It is
      // rendered verbatim — restating it here would be this component second-guessing the authority.
      setFormError(res.error);
      setPendingAnswer(null);
    } catch {
      // Swallowed WITHOUT logging: a rejected server-action call can echo the request back, and the request
      // carries both the invite credential and a guest's address.
      setFormError("We couldn't save your RSVP. Try again.");
      setPendingAnswer(null);
    }
  }

  // ── The recorded state (post-submit, or a returning account) ────────────────────────────────────────────
  if (recorded && !changing) {
    return (
      <RsvpConfirmation
        answer={recorded.answer}
        reachable={recorded.reachable}
        action={
          // D-120 — offered ONLY to someone we can actually recognise again, and only while RSVPs are open.
          // A blank-email guest (`reachable: false`) gets no toggle, because the confirmation they just read
          // told them plainly they would not get one.
          recorded.reachable && state !== "closed" ? (
            <Button
              type="button"
              variant="outline"
              size="touch"
              onClick={() => {
                setFormError(null);
                setChanging(true);
              }}
            >
              Change my answer
            </Button>
          ) : undefined
        }
      />
    );
  }

  // ── Closed (D-120, the DB clock) ────────────────────────────────────────────────────────────────────────
  if (state === "closed") {
    return (
      // Neutral, and announced. `Alert` hardcodes role="alert"; role="status" is passed to override it,
      // because a session that has already started is information, not an emergency.
      <Alert role="status" aria-live="polite">
        <LockIcon aria-hidden="true" />
        <AlertTitle>RSVPs have closed</AlertTitle>
        <AlertDescription>This session has already started.</AlertDescription>
      </Alert>
    );
  }

  const guest = viewer === null;

  return (
    <Form {...form}>
      {/* Enter inside the identity fields means the PRIMARY choice — which is what a surface offering one
          coral CTA promises. Each button below submits its own answer explicitly. */}
      <form
        onSubmit={form.handleSubmit((v) => onSubmit(v, "yes"))}
        className="space-y-4"
      >
        {/* ── Identity block (D-116, the guest-or-login fork) ────────────────────────────────────────── */}
        {guest ? (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete="name"
                      placeholder="How your friends know you"
                      className="h-11"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  {/* "Optional" is in the LABEL, where it cannot be missed — not buried in helper text
                      under a field that looks required (G2). */}
                  <FormLabel>
                    Email{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="h-11"
                    />
                  </FormControl>
                  {/* States what they GET, not what we want (D-117/G2). No "sign up", no "required to
                      continue", no second ask further down the page. */}
                  <FormDescription>
                    Add your email to get a confirmation and a link to change your answer.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* The alternative, kept deliberately quiet: a ghost link, below the fields, carrying the
                invite through `callbackURL` so logging in returns to this same page rather than dumping
                someone on a home page with no idea where their invite went. */}
            <p className="text-sm text-muted-foreground">
              Already have a FitOut account?{" "}
              <Button asChild variant="ghost" size="sm" className="px-1 underline">
                <Link href={loginHref}>Log in instead</Link>
              </Button>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            RSVPing as <span className="font-semibold text-foreground">{viewer.name}</span>
          </p>
        )}

        {/* ── Full (D-112, a courtesy — see rule 1) ─────────────────────────────────────────────────── */}
        {state === "full" && (
          <Alert role="status" aria-live="polite">
            <UsersRoundIcon aria-hidden="true" />
            <AlertTitle>This group is full</AlertTitle>
            <AlertDescription>
              All {capacity} {capacity === 1 ? "spot is" : "spots are"} taken. You can still let the
              organizer know you can&apos;t make it.
            </AlertDescription>
          </Alert>
        )}

        {/* ── The failure the SERVER reported, verbatim. Neutral and announced — "the group just filled
            up" is somebody else's good news, not this person's error. ───────────────────────────────── */}
        {formError && (
          <Alert role="status" aria-live="polite">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        {/* ── RSVP choice (D-120) — exactly TWO controls, and nothing else (rule 4). ─────────────────── */}
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* D-22 — the 44px height is the named opt-in size rather than a hand-rolled height class.
              The size also carries the wider padding that goes with a touch target; both buttons in
              this row are flex-1, so they stay the same width and the change is invisible here. */}
          <Button
            type="button"
            variant="brand"
            size="touch"
            onClick={form.handleSubmit((v) => onSubmit(v, "yes"))}
            disabled={pending || state === "full"}
            aria-disabled={pending || state === "full"}
            className="flex-1"
          >
            {pendingAnswer === "yes" ? "Saving…" : "Yes, I'm coming"}
          </Button>
          {/* The SAME named size as its sibling (WR-01). This button hand-rolled the height while
              the one above opted into the size, so two adjacent controls in one row expressed the
              same 44px two different ways — and got different horizontal padding for it (px-4 from
              the size, px-2.5 from the default). Identical height, visibly different insets. */}
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={form.handleSubmit((v) => onSubmit(v, "no"))}
            disabled={pending}
            aria-disabled={pending}
            className="flex-1"
          >
            {pendingAnswer === "no" ? "Saving…" : "Can't make it"}
          </Button>
        </div>

        {/* One person, one answer — said out loud so nobody goes hunting for the control rule 4 omits. */}
        <p className="text-center text-xs text-muted-foreground">
          This answer is just for you — everyone coming needs their own invite link.
        </p>
      </form>
    </Form>
  );
}
