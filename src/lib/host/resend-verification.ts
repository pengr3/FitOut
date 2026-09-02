// D-269 — THE ONE OWNER OF THE EMAIL-CONFIRMATION RESEND, AND OF ITS TWO SENTENCES.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS EXTRACTED RATHER THAN COPIED, AND WHY THE MOMENT IS NOW
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This function shipped as a local `async function resendVerification()` inside
// `src/app/(host)/host/listings/[id]/edit/wizard.tsx`, where it drove the publish checklist's
// "Verified email" row. It was correct there and it stayed correct because it had ONE call site.
//
// The host verification form is the SECOND call site, which is the moment
// `src/components/host/hosting-paused-notice.tsx:7-11`'s rule starts applying: a sentence typed into
// two files is a sentence that drifts, and the drift is invisible because both copies compile and
// both render. The two strings below are what a host is told about their own inbox — the success one
// naming the address so they know WHICH inbox to open, the failure one saying the only actionable
// thing there is to say — and there is no version of this product where the wizard and the
// verification panel should say them differently.
//
// ⚠ `callbackURL` IS THE ONE THING THAT DIFFERS BETWEEN THE TWO CALL SITES, AND IT IS A PARAMETER,
// NEVER A BRANCH. The wizard sends the host back to `/host/listings` — the surface they were on — and
// the verification form sends them to `/host/verify`. A branch inside this module (on a path, on a
// flag, on "am I in the wizard") would make the destination this module's decision, and it is the
// caller's: only the caller knows where the host was standing.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE RESEND IS A HINT. THE GATE IS THE SERVER, AND IT REFUSES INDEPENDENTLY
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Pressing this changes nothing about the host's standing: it asks Better Auth to send another link.
// Both surfaces that draw it also draw an unmet checklist row, and BOTH are hints —
// `publishListing` re-runs the full D-02 gate server-side, and `requestHostVerification` re-reads
// `user.emailVerified` and refuses with its own sentence (plan 18.1-07). A client that skipped this
// control entirely, or lied about the row being met, changes nothing that decides anything.
//
// ⚠ NOT A REVERSAL OF D-07. `src/lib/auth.ts` keeps `requireEmailVerification: false` and
// `autoSignIn: true`, so signing in stays unblocked globally — a booker who never confirms their
// address can still book. The confirmation gate is LOCAL to the two host actions that need it, which
// is exactly how the publish wizard's gate has always worked. That file is not touched by this
// extraction and must not be.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// CLIENT-SAFE, AND NO DIRECTIVE PROLOGUE — `src/lib/auth-client.ts`'s SHAPE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// No guard, no DB import, no environment read, no secret: it calls Better Auth's BROWSER client and
// the shipped toast, both of which already live in the client bundle of every surface that will call
// this. It carries no `"use client"` prologue for the reason `src/lib/auth-client.ts` carries none —
// it exports no component and is never a boundary, only a helper the boundary already inside it
// reaches for. Every call site is a `"use client"` module; a Server Component importing this would be
// a mistake in that component, and neither a directive nor its absence can rescue that.

import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

/**
 * Ask Better Auth to send another confirmation link, and tell the host what happened.
 *
 * Both outcomes are announced through a TOAST, and that is deliberate rather than inherited: this is
 * the one thing on either surface whose result is a message and nothing else — no state changes, no
 * region's content becomes stale, and there is nothing left on screen for the host to address. It is
 * the only toast either surface spends. A REFUSAL from the submission action is a different shape
 * entirely and takes the named live region instead, because a refusal that leaves the surface on
 * screen must not live in a dismissible, timed, unaddressable overlay.
 *
 * ⚠ THE ADDRESS IN THE SUCCESS SENTENCE IS THE CALLER'S ARGUMENT — the host's own, read from their
 * session by the surface that drew the control. It is never a literal here, and it is the inverse of
 * FitOut publishing an address for somebody to write to.
 *
 * ⚠ THE FAILURE PATH SWALLOWS THE CAUSE ON PURPOSE. Better Auth's error for a send failure is about
 * a mail provider, a rate limit or a network hop, and none of the three is a thing the host can act
 * on differently. "Try again in a moment" is the only true and actionable sentence, and it is the
 * same one that shipped.
 */
export async function resendVerificationEmail({
  email,
  callbackURL,
}: {
  readonly email: string;
  readonly callbackURL: string;
}): Promise<void> {
  try {
    await authClient.sendVerificationEmail({ email, callbackURL });
    toast.success(`Verification email sent to ${email}.`);
  } catch {
    toast.error("Couldn't send the email. Try again in a moment.");
  }
}
