"use client";

import * as React from "react";

import {
  INITIAL_OPS_STAFF_ACTION_STATE,
  revokeStaffAction,
  type OpsStaffActionState,
} from "@/app/actions/ops-staff";
import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";
import { Button } from "@/components/ui/button";

type StaffActionDialogProps = {
  targetEmail: string;
  targetUserId: string;
  onResult: (state: OpsStaffActionState) => void;
};

export function StaffActionDialog({
  targetEmail,
  targetUserId,
  onResult,
}: StaffActionDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [refusal, setRefusal] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const result = await revokeStaffAction(
        targetUserId,
        INITIAL_OPS_STAFF_ACTION_STATE,
        new FormData(event.currentTarget),
      );
      const presented =
        result.status === "success"
          ? { ...result, message: `${targetEmail} no longer has staff access.` }
          : result;
      onResult(presented);
      if (presented.status === "success") {
        setRefusal(null);
        setOpen(false);
      } else {
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
      title="Revoke staff access?"
      description={`Revoke ${targetEmail}'s access to FitOut Ops. They will lose access on their next request. This does not delete the account.`}
      trigger={
        <Button type="button" variant="outline" size="touch">
          Revoke access
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
            Keep staff access
          </Button>
          <form onSubmit={handleSubmit}>
            <Button
              type="submit"
              variant="destructive"
              size="touch"
              className="w-full sm:w-auto"
              disabled={pending}
            >
              {pending ? "Revoking…" : "Revoke access"}
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
