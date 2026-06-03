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
//     The chosen single flag is granted ATOMICALLY as part of user creation: we thread the
//     validated intent through the signUpEmail body, and the `databaseHooks.user.create.before`
//     hook in src/lib/auth.ts sets the flag on the SAME inserted row (a single write). There is no
//     longer a second post-create UPDATE that could fail and leave the user created-but-flagless
//     (the CR-02 non-atomic hazard). This is the D-02 entry point and the T-03-01 mitigation.
//
// auth.api.signUpEmail({ autoSignIn: true }) + the nextCookies() plugin set the httpOnly
// session cookie, so the user is logged in immediately on a successful signup.

import { auth } from "@/lib/auth";
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

  // 2. Create the user AND grant the chosen capability in a SINGLE write. `name` is the first
  //    name (Plan-02 firstName/name decision); `firstName` populates the public-display column.
  //    `intent` is threaded through purely as transport: canBook/canHost are input:false (a client
  //    cannot self-grant), and the databaseHooks.user.create.before hook in src/lib/auth.ts reads
  //    this intent and sets the single chosen flag ON the inserted row (CR-02 atomic fix — no
  //    second UPDATE to fail). Only ever grants the one intent-derived capability (T-03-01).
  try {
    // The runtime accepts extra body fields (the create.before hook reads `intent` off the body),
    // but signUpEmail's STATIC body type only models the declared additionalFields, so we widen the
    // body shape here. `intent` is transport-only — it is not an additionalField and is never
    // persisted as a column (CR-02). Same widening rationale as tests/helpers/auth.ts.
    const signUp = auth.api.signUpEmail as unknown as (args: {
      body: {
        email: string;
        password: string;
        name: string;
        firstName: string;
        intent: "book" | "host";
      };
    }) => ReturnType<typeof auth.api.signUpEmail>;
    const result = await signUp({
      body: { email, password, name: firstName, firstName, intent },
    });

    const userId = (result as { user?: { id?: string } }).user?.id;
    if (!userId) {
      return { ok: false, error: "Could not create your account. Please try again." };
    }

    // 3. D-05: choosing "host" only sets the flag + routes toward listing creation — it does
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
