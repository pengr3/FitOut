"use client";

import * as React from "react";

import type { OpsStaffActionState } from "@/app/actions/ops-staff";
import { StaffActionDialog } from "@/components/ops/staff-action-dialog";
import { PanelCard } from "@/components/patterns/panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { StaffManagementSnapshot } from "@/lib/ops/staff-management";

export function StaffManagementPanel({ snapshot }: { snapshot: StaffManagementSnapshot }) {
  const [result, setResult] = React.useState<OpsStaffActionState>({ status: "idle" });
  const resultRef = React.useRef<HTMLParagraphElement>(null);

  React.useEffect(() => {
    if (result.status === "success" && result.action === "revoke") {
      resultRef.current?.focus();
    }
  }, [result]);

  return (
    <PanelCard
      title="Staff management"
      titleAs="h2"
      description="Invite staff and manage access to FitOut Ops."
    >
      {result.status === "error" ? (
        <p
          ref={resultRef}
          role="alert"
          aria-label={result.message}
          className="rounded-lg bg-muted p-4 text-label text-destructive break-words"
        >
          {result.message}
        </p>
      ) : result.status === "success" ? (
        <p
          ref={resultRef}
          tabIndex={-1}
          className="rounded-lg bg-muted p-4 text-label break-words outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {result.message}
        </p>
      ) : null}

      <section aria-labelledby="active-staff-heading" className="space-y-4">
        <h3 id="active-staff-heading" className="font-semibold">
          Active staff
        </h3>
        <ul className="divide-y divide-border">
          {snapshot.activeStaff.map((staff) => {
            const reasonId = `revoke-reason-${staff.actionRef.targetUserId}`;
            return (
              <li
                key={staff.actionRef.targetUserId}
                className="flex min-w-0 flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="min-w-0 break-all">{staff.email}</p>
                    {staff.isCurrentActor ? <Badge variant="secondary">You</Badge> : null}
                  </div>
                  <p className="text-label text-muted-foreground tabular-nums">
                    Staff since {staff.staffSinceLabel}
                  </p>
                </div>
                <div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-start md:items-end">
                  {staff.canRevoke ? (
                    <StaffActionDialog
                      targetEmail={staff.email}
                      targetUserId={staff.actionRef.targetUserId}
                      onResult={setResult}
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="touch"
                      disabled
                      aria-describedby={reasonId}
                    >
                      Revoke access
                    </Button>
                  )}
                  {staff.revokeDisabledReason ? (
                    <p
                      id={reasonId}
                      className="max-w-prose text-label text-muted-foreground break-words md:text-right"
                    >
                      {staff.revokeDisabledReason}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Separator />

      <section aria-labelledby="pending-invitations-heading" className="space-y-4">
        <h3 id="pending-invitations-heading" className="font-semibold">
          Pending invitations
        </h3>
        <p className="text-label text-muted-foreground">No pending invitations.</p>
      </section>
    </PanelCard>
  );
}
