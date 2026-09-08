"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import {
  cancelStaffInvitation,
  issueStaffInvitation,
  resendStaffInvitation,
  type StaffInvitationRef,
} from "@/lib/ops/invitations";
import {
  DEFAULT_ROLE,
  LAST_STAFF_REVOKE_REASON,
  SELF_REVOKE_REASON,
  writeRole,
} from "@/lib/ops/grant";
import type { OpsStaffActionState } from "@/lib/ops/staff-action-state";
import { requireOpsMutationOrigin, requireStaff } from "@/lib/ops/staff";
import type { IssueStaffInvitationInput } from "@/lib/validation/ops-staff";

const STALE_STAFF_ACTION_MESSAGE =
  "This staff record changed before the action completed. Refresh the page and try again.";

function boundInvitationRef(ref: StaffInvitationRef): StaffInvitationRef | null {
  if (
    typeof ref?.id !== "string" ||
    ref.id.length === 0 ||
    typeof ref.version !== "string" ||
    ref.version.length === 0
  ) {
    return null;
  }
  return { id: ref.id, version: ref.version };
}

/** Create one pending invitation with the actor derived only from the current staff session. */
export async function inviteStaffAction(input: IssueStaffInvitationInput) {
  await requireOpsMutationOrigin();
  const staff = await requireStaff();
  const result = await issueStaffInvitation({ email: input?.email }, staff.id);
  if (result.outcome === "sent" || result.outcome === "pending-delivery-failed") {
    revalidatePath("/ops");
  }
  return result;
}

/** Rotate only the invitation version captured by the server-rendered pending row. */
export async function resendStaffInviteAction(ref: StaffInvitationRef) {
  await requireOpsMutationOrigin();
  const staff = await requireStaff();
  const invitation = boundInvitationRef(ref);
  if (!invitation) return { outcome: "stale" } as const;
  const result = await resendStaffInvitation(invitation, staff.id);
  if (result.outcome === "sent" || result.outcome === "pending-delivery-failed") {
    revalidatePath("/ops");
  }
  return result;
}

/** Cancel only the invitation version captured by the server-rendered pending row. */
export async function cancelStaffInviteAction(ref: StaffInvitationRef) {
  await requireOpsMutationOrigin();
  const staff = await requireStaff();
  const invitation = boundInvitationRef(ref);
  if (!invitation) return { outcome: "stale" } as const;
  const result = await cancelStaffInvitation(invitation, staff.id);
  if (result.outcome === "cancelled") {
    revalidatePath("/ops");
  }
  return result;
}

/** Revoke through the transactional policy; client form fields never decide actor or eligibility. */
export async function revokeStaffAction(
  boundTargetUserId: string,
  _previousState: OpsStaffActionState,
  _formData: FormData,
): Promise<OpsStaffActionState> {
  await requireOpsMutationOrigin();
  const staff = await requireStaff();
  void _previousState;
  void _formData;

  if (typeof boundTargetUserId !== "string" || boundTargetUserId.length === 0) {
    return { status: "error", action: "revoke", message: STALE_STAFF_ACTION_MESSAGE };
  }

  const result = await writeRole(
    { target: boundTargetUserId, actorId: staff.id, role: DEFAULT_ROLE },
    db,
  );
  if (result.outcome === "written") {
    revalidatePath("/ops");
    return {
      status: "success",
      action: "revoke",
      message: "Staff access was revoked.",
      targetUserId: result.userId,
    };
  }

  const message =
    result.outcome === "refused" && result.reason === "self_revoke"
      ? SELF_REVOKE_REASON
      : result.outcome === "refused" &&
          (result.reason === "last_staff" || result.reason === "staff_invariant_empty")
        ? LAST_STAFF_REVOKE_REASON
        : STALE_STAFF_ACTION_MESSAGE;
  return { status: "error", action: "revoke", message };
}
