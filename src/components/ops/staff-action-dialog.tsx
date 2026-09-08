"use client";

import * as React from "react";

import {
  cancelStaffInviteAction,
  revokeStaffAction,
} from "@/app/actions/ops-staff";
import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { Button } from "@/components/ui/button";
import type { StaffInvitationRef } from "@/lib/ops/invitations";
import {
  INITIAL_OPS_STAFF_ACTION_STATE,
  type OpsStaffActionState,
} from "@/lib/ops/staff-action-state";

type SharedStaffActionDialogProps = {
  targetEmail: string;
  onResult: (state: OpsStaffActionState) => void;
  disabled?: boolean;
};

type StaffActionDialogProps =
  | (SharedStaffActionDialogProps & { kind?: "revoke"; targetUserId: string })
  | (SharedStaffActionDialogProps & { kind: "cancel"; invitationRef: StaffInvitationRef });

export function StaffActionDialog(props: StaffActionDialogProps) {
  const { targetEmail, onResult, disabled = false } = props;
  const isCancel = props.kind === "cancel";
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const presented: OpsStaffActionState = isCancel
        ? await cancelStaffInviteAction(props.invitationRef).then((result) =>
            result.outcome === "cancelled"
              ? {
                  status: "success" as const,
                  action: "cancel" as const,
                  message: `Invitation for ${targetEmail} was cancelled.`,
                }
              : {
                  status: "error" as const,
                  action: "cancel" as const,
                  message:
                    "This staff record changed before the action completed. Refresh the page and try again.",
                },
          )
        : await revokeStaffAction(
            props.targetUserId,
            INITIAL_OPS_STAFF_ACTION_STATE,
            new FormData(event.currentTarget),
          ).then((result) =>
            result.status === "success"
              ? { ...result, message: `${targetEmail} no longer has staff access.` }
              : result,
          );
      onResult(presented);
      if (presented.status === "success") {
        setRefusal(null);
        setOpen(false);
      } else if (presented.status === "error") {
        setRefusal(presented.message);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) {
          if (next) setRefusal(null);
          setOpen(next);
        }
      }}
      title={isCancel ? "Cancel invitation?" : "Revoke staff access?"}
      description={
        isCancel
          ? `Cancel the invitation for ${targetEmail}. Its current link will stop working immediately.`
          : `Revoke ${targetEmail}'s access to FitOut Ops. They will lose access on their next request. This does not delete the account.`
      }
      trigger={
        <Button
          type="button"
          variant="outline"
          size="touch"
          disabled={disabled}
          aria-label={
            isCancel ? `Cancel invitation for ${targetEmail}` : `Revoke staff access for ${targetEmail}`
          }
        >
          {isCancel ? "Cancel invitation" : "Revoke access"}
        </Button>
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="touch"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            {isCancel ? "Keep invitation" : "Keep staff access"}
          </Button>
          <form onSubmit={handleSubmit}>
            <Button
              type="submit"
              variant="destructive"
              size="touch"
              className="w-full sm:w-auto"
              disabled={pending}
            >
              {pending
                ? isCancel
                  ? "Cancelling…"
                  : "Revoking…"
                : isCancel
                  ? "Cancel invitation"
                  : "Revoke access"}
            </Button>
          </form>
        </>
      }
    >
      {refusal ? (
        <p role="alert" className="rounded-lg bg-muted p-4 text-label text-destructive break-words">
          {refusal}
        </p>
      ) : null}
    </ResponsiveDialog>
  );
}
