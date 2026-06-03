"use server";

// Capability activation server actions (AUTH-04, D-03/D-05, threat T-04-01).
//
// A single FitOut identity carries two capability flags — canBook and canHost — and a user can add
// the OTHER capability later via an explicit "Start hosting" / "Start booking" step. These actions
// are the ONLY sanctioned path to set those flags after signup.
//
// WHY SERVER-SIDE ONLY: canBook/canHost/role are input:false on the user table (src/lib/auth.ts),
// so they are silently stripped from any client-supplied body (signUpEmail / updateUser). A client
// can therefore NEVER self-grant a capability. These actions read the session to authorize the
// caller, then flip the flag via a PRIVILEGED Drizzle update on the user's own row — the exact
// mechanism documented in 01-02-SUMMARY ("capability flips go through a privileged server action,
// not client input"). This is the D-03 entry point and the T-04-01 elevation-of-privilege guard.
//
// COEXISTENCE (D-03): activating one capability NEVER clears the other — both can be true at once.
//
// D-05: activateHosting only sets the flag and routes the user toward listing creation (the /host
// surface). It does NOT trigger Stripe Connect payout onboarding — that lands in PHASE 2. No Stripe
// call happens here by design.

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export type CapabilityResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

/** Resolve the signed-in user's id, or null if there is no session. */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/**
 * Add the HOST capability to the signed-in user (D-03). Sets canHost=true server-side WITHOUT
 * touching canBook (coexistence). Returns the route toward listing creation (D-05). PHASE 2: this
 * is where Stripe Connect onboarding will be initiated — it is intentionally NOT triggered here.
 */
export async function activateHosting(): Promise<CapabilityResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to start hosting." };
  }
  // Privileged flip (input:false guard means this can never come from the client). canBook untouched.
  await db.update(user).set({ canHost: true }).where(eq(user.id, userId));
  // Route toward the host surface / listing creation (Phase 2). No Stripe onboarding here (D-05).
  return { ok: true, redirectTo: "/host" };
}

/**
 * Add the BOOK capability to the signed-in user (D-03). Sets canBook=true server-side WITHOUT
 * touching canHost (coexistence). Routes back to the booking surface.
 */
export async function activateBooking(): Promise<CapabilityResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, error: "You must be signed in to start booking." };
  }
  // Privileged flip; canHost untouched (coexistence, D-03).
  await db.update(user).set({ canBook: true }).where(eq(user.id, userId));
  return { ok: true, redirectTo: "/" };
}
