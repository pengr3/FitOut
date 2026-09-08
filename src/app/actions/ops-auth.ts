"use server";

import { applySetCookies, splitSetCookieHeader } from "better-auth/cookies";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { OPS_APP_ORIGIN } from "@/lib/app-origins";
import { auth } from "@/lib/auth";
import { safeOpsCallback } from "@/lib/ops/ops-callback";
import { STAFF_ROLE } from "@/lib/ops/grant";
import { requireOpsMutationOrigin } from "@/lib/ops/staff";
import { acceptStaffInvitation } from "@/lib/ops/invitations";
import {
  loginSchema,
  requestResetSchema,
  resetSchema,
  type LoginInput,
  type RequestResetInput,
  type ResetInput,
} from "@/lib/validation/auth";
import {
  acceptStaffInvitationInput,
  type AcceptStaffInvitationInput,
} from "@/lib/validation/ops-staff";

export type OpsSignInInput = LoginInput & { callbackURL?: string | null };

export type OpsSignInResult =
  | { ok: true; redirectTo: string }
  | {
      ok: false;
      reason: "invalid-input" | "invalid-credentials" | "no-ops-access";
    };

export type OpsRecoveryResult =
  | { ok: true }
  | { ok: false; reason: "invalid-input" };

export type OpsResetResult =
  | { ok: true }
  | { ok: false; reason: "invalid-input" | "invalid-token" };

export type OpsStaffInviteAcceptanceResult = Exclude<
  Awaited<ReturnType<typeof acceptStaffInvitation>>,
  { outcome: "accepted" }
>;

function responseCookies(responseHeaders: Headers): string[] {
  if (typeof responseHeaders.getSetCookie === "function") {
    return responseHeaders.getSetCookie();
  }
  return splitSetCookieHeader(responseHeaders.get("set-cookie") ?? "");
}

/**
 * Authenticate a credential pair only on the exact ops request authority.
 *
 * Better Auth creates a session before the application can inspect the role. `returnHeaders` lets
 * us reconstruct that just-issued cookie for the role decision and, critically, delete that exact
 * session before returning the neutral refusal for any nonstaff identity.
 */
export async function signInOps(input: OpsSignInInput): Promise<OpsSignInResult> {
  await requireOpsMutationOrigin();

  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid-input" };

  const requestHeaders = await headers();
  let signedIn: {
    headers: Headers;
    response: { user: { role?: string | null } } | null;
  };
  try {
    signedIn = (await auth.api.signInEmail({
      body: parsed.data,
      headers: requestHeaders,
      returnHeaders: true,
    })) as unknown as typeof signedIn;
  } catch {
    return { ok: false, reason: "invalid-credentials" };
  }

  const signedInHeaders = signedIn.headers;
  const signedInUser = signedIn.response?.user;
  if (!signedInHeaders || !signedInUser) {
    return { ok: false, reason: "invalid-credentials" };
  }

  if (signedInUser.role !== STAFF_ROLE) {
    const sessionHeaders = new Headers(requestHeaders);
    applySetCookies(sessionHeaders, responseCookies(signedInHeaders));
    await auth.api.signOut({ headers: sessionHeaders });
    return { ok: false, reason: "no-ops-access" };
  }

  return {
    ok: true,
    redirectTo: safeOpsCallback(input.callbackURL, OPS_APP_ORIGIN),
  };
}

export async function signOutOpsAction(): Promise<string> {
  await requireOpsMutationOrigin();
  await auth.api.signOut({ headers: await headers() });
  return `${OPS_APP_ORIGIN}/login?signedOut=1`;
}

/** Compatibility entrypoint retained for the focused auth contract. */
export async function signOutOps(): Promise<never> {
  redirect(await signOutOpsAction());
}

export async function requestOpsPasswordReset(
  input: RequestResetInput,
): Promise<OpsRecoveryResult> {
  await requireOpsMutationOrigin();

  const parsed = requestResetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid-input" };

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: `${OPS_APP_ORIGIN}/reset-password`,
      },
      headers: await headers(),
    });
  } catch {
    // Better Auth intentionally returns the same success for a missing account. Delivery/provider
    // failures must share that observable result as well so this endpoint cannot become an oracle.
  }

  return { ok: true };
}

export async function resetOpsPassword(input: ResetInput): Promise<OpsResetResult> {
  await requireOpsMutationOrigin();

  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid-input" };

  try {
    await auth.api.resetPassword({
      body: { newPassword: parsed.data.password, token: parsed.data.token },
      headers: await headers(),
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "invalid-token" };
  }
}

/**
 * Accept a staff invitation only on the exact ops authority.
 *
 * Email, row id, invitation version, actor id, and target user id are deliberately absent from this
 * interface. The bearer token selects the verification row and the transaction derives every target
 * fact from that row; extra runtime fields are discarded by the bounded schema before domain work.
 */
export async function acceptStaffInviteAction(
  input: AcceptStaffInvitationInput,
): Promise<OpsStaffInviteAcceptanceResult> {
  await requireOpsMutationOrigin();

  const parsed = acceptStaffInvitationInput.safeParse(input);
  if (!parsed.success) return { outcome: "invalid" };

  const result = await acceptStaffInvitation(parsed.data);
  if (result.outcome === "accepted") redirect("/login?accepted=1");
  return result;
}
