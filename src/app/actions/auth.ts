"use server";

// Server actions for the logged-out auth surface.
//
// SECURITY CONTRACT (the reason these live server-side):
//   - Every action RE-VALIDATES its input with the SAME shared Zod schema the client
//     form used (src/lib/validation/auth.ts). The client is NEVER trusted — Next 16
//     server-action closures are encrypted in transit, but the payload itself is still
//     attacker-controlled, so we parse again here (threat T-03-04).
//   - The signup `intent` ("book" | "host") is mapped to the capability flags
//     canBook/canHost SERVER-SIDE only. Those flags are `input:false` on the user table
//     (src/lib/auth.ts) so they cannot be set through the signUpEmail body — a client that
//     smuggles canHost:true is silently stripped (proved by tests/auth/capability-escalation).
//     We therefore set the chosen single flag via a privileged DB update AFTER the user is
//     created (the mechanism documented in 01-02-SUMMARY: "capability flips must go through a
//     privileged server action, not client input"). This is the D-02 entry point and the
//     T-03-01 elevation-of-privilege mitigation.
//
// auth.api.signUpEmail({ autoSignIn: true }) + the nextCookies() plugin set the httpOnly
// session cookie, so the user is logged in immediately on a successful signup.

import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";

export type SignupResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/**
 * Create a user from the signup form, then set the capability flag SERVER-SIDE from the
 * validated intent. Returns the redirect target (book -> "/", host -> "/host") so the
 * client can navigate after the session cookie is set. We intentionally do NOT call
 * Next's redirect() here so the client can show inline errors without a thrown control-flow.
 */
export async function signup(input: SignupInput): Promise<SignupResult> {
  // 1. Re-validate server-side with the shared schema (never trust the client).
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form and try again." };
  }
  const { email, password, firstName, intent } = parsed.data;

  // 2. Create the user. `name` is set to the first name (per the Plan-02 firstName/name
  //    decision); `firstName` populates the explicit public-display column. canBook/canHost
  //    are NOT passed here — they are input:false and would be stripped anyway.
  try {
    const result = await auth.api.signUpEmail({
      body: { email, password, name: firstName, firstName },
    });

    const userId = (result as { user?: { id?: string } }).user?.id;
    if (!userId) {
      return { ok: false, error: "Could not create your account. Please try again." };
    }

    // 3. Set the chosen capability flag SERVER-SIDE (input:false guard means this cannot
    //    come from the client). intent "book" -> canBook=true; intent "host" -> canHost=true.
    //    Only ever grants the single chosen capability (T-03-01).
    if (intent === "host") {
      await db.update(user).set({ canHost: true }).where(eq(user.id, userId));
    } else {
      await db.update(user).set({ canBook: true }).where(eq(user.id, userId));
    }

    // 4. D-05: choosing "host" only sets the flag + routes toward listing creation — it does
    //    NOT trigger Stripe onboarding (Phase 2). Booker signups land on the home/search surface.
    return { ok: true, redirectTo: intent === "host" ? "/host" : "/" };
  } catch (err) {
    // Better Auth throws APIError on duplicate email / weak password etc. Surface a generic,
    // non-enumerating message (T-03-06) but keep the known "already exists" hint useful.
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "";
    if (/exist|already|unique/i.test(message)) {
      return { ok: false, error: "An account with that email may already exist." };
    }
    return { ok: false, error: "Could not create your account. Please try again." };
  }
}
