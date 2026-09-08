"use server";

import {
  cancelStaffInvitation,
  issueStaffInvitation,
  resendStaffInvitation,
  type StaffInvitationRef,
} from "@/lib/ops/invitations";
import { requireOpsMutationOrigin, requireStaff } from "@/lib/ops/staff";
import type { IssueStaffInvitationInput } from "@/lib/validation/ops-staff";

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
  return issueStaffInvitation({ email: input?.email }, staff.id);
}

/** Rotate only the invitation version captured by the server-rendered pending row. */
export async function resendStaffInviteAction(ref: StaffInvitationRef) {
  await requireOpsMutationOrigin();
  const staff = await requireStaff();
  const invitation = boundInvitationRef(ref);
  if (!invitation) return { outcome: "stale" } as const;
  return resendStaffInvitation(invitation, staff.id);
}

/** Cancel only the invitation version captured by the server-rendered pending row. */
export async function cancelStaffInviteAction(ref: StaffInvitationRef) {
  await requireOpsMutationOrigin();
  const staff = await requireStaff();
  const invitation = boundInvitationRef(ref);
  if (!invitation) return { outcome: "stale" } as const;
  return cancelStaffInvitation(invitation, staff.id);
}
