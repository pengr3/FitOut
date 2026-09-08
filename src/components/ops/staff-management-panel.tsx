"use client";

import * as React from "react";

import {
  inviteStaffAction,
  resendStaffInviteAction,
  type OpsStaffActionState,
} from "@/app/actions/ops-staff";
import { StaffActionDialog } from "@/components/ops/staff-action-dialog";
import { PanelCard } from "@/components/patterns/panel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { StaffManagementSnapshot } from "@/lib/ops/staff-management";

const STALE_STAFF_ACTION_MESSAGE =
  "This staff record changed before the action completed. Refresh the page and try again.";
const DELIVERY_FAILURE_MESSAGE =
  "We couldn't send the invitation. It remains pending so you can use Resend invitation to try again.";

function invitationRefKey(ref: { id: string; version: string }) {
  return `${ref.id}:${ref.version}`;
}

export function StaffManagementPanel({ snapshot }: { snapshot: StaffManagementSnapshot }) {
  const [result, setResult] = React.useState<OpsStaffActionState>({ status: "idle" });
  const [email, setEmail] = React.useState("");
  const [invitePending, setInvitePending] = React.useState(false);
  const [resending, setResending] = React.useState<string | null>(null);
  const resultRef = React.useRef<HTMLParagraphElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const pendingSectionRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (
      result.status === "success" &&
      (result.action === "revoke" || result.action === "cancel")
    ) {
      resultRef.current?.focus();
    }
  }, [result]);

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedEmail = email.trim().toLowerCase();
    setInvitePending(true);
    try {
      const actionResult = await inviteStaffAction({ email: submittedEmail });
      if (actionResult.outcome === "sent") {
        setResult({
          status: "success",
          action: "invite",
          message: `Invitation sent to ${actionResult.invitation.email}.`,
        });
        setEmail("");
      } else if (actionResult.outcome === "pending-delivery-failed") {
        setResult({ status: "error", action: "invite", message: DELIVERY_FAILURE_MESSAGE });
      } else if (actionResult.outcome === "invalid") {
        setResult({ status: "error", action: "invite", message: "Enter a valid email address." });
        emailRef.current?.focus();
      } else {
        const message =
          actionResult.reason === "already-staff-member"
            ? "Already a staff member."
            : actionResult.reason === "separate-staff-email"
              ? "Use a separate email for staff access."
              : "An invitation is already pending for this email. Use Resend invitation on the pending invitation.";
        setResult({ status: "error", action: "invite", message });
        if (actionResult.reason === "active-invitation-exists") {
          pendingSectionRef.current?.scrollIntoView?.({ block: "nearest" });
        }
      }
    } finally {
      setInvitePending(false);
    }
  }

  async function handleResend(invitation: StaffManagementSnapshot["pendingInvitations"][number]) {
    const key = invitationRefKey(invitation.actionRef);
    setResending(key);
    try {
      const actionResult = await resendStaffInviteAction(invitation.actionRef);
      setResult(
        actionResult.outcome === "sent"
          ? {
              status: "success",
              action: "resend",
              message: `A new invitation link was sent to ${invitation.email}. The previous link no longer works.`,
            }
          : actionResult.outcome === "pending-delivery-failed"
            ? { status: "error", action: "resend", message: DELIVERY_FAILURE_MESSAGE }
            : { status: "error", action: "resend", message: STALE_STAFF_ACTION_MESSAGE },
      );
    } finally {
      setResending(null);
    }
  }

  return (
    <PanelCard
      title="Staff management"
      titleAs="h2"
      description="Invite staff and manage access to FitOut Ops."
    >
      <div className="space-y-8">
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
            role={result.action === "invite" || result.action === "resend" ? "status" : undefined}
            aria-live={result.action === "invite" || result.action === "resend" ? "polite" : undefined}
            aria-label={result.message}
            tabIndex={result.action === "cancel" || result.action === "revoke" ? -1 : undefined}
            className="rounded-lg bg-muted p-4 text-label break-words outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {result.message}
          </p>
        ) : null}

        <section aria-labelledby="invite-staff-heading" className="space-y-4">
          <h3 id="invite-staff-heading" className="font-semibold">
            Invite staff
          </h3>
          <form
            className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={handleInvite}
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="staff-invite-email">Email</Label>
              <Input
                ref={emailRef}
                id="staff-invite-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                disabled={invitePending}
                onChange={(event) => setEmail(event.currentTarget.value)}
                required
              />
            </div>
            <Button
              type="submit"
              size="touch"
              className="w-full sm:w-auto"
              disabled={invitePending}
            >
              {invitePending ? "Sending invitation…" : "Send invitation"}
            </Button>
          </form>
        </section>

        <Separator />

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
                      aria-label={`Revoke staff access for ${staff.email}`}
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

        <section
          ref={pendingSectionRef}
          aria-labelledby="pending-invitations-heading"
          className="space-y-4"
        >
          <h3 id="pending-invitations-heading" className="font-semibold">
            Pending invitations
          </h3>
          {snapshot.pendingInvitations.length === 0 ? (
            <p className="text-label text-muted-foreground">No pending invitations.</p>
          ) : (
            <ul className="divide-y divide-border">
              {snapshot.pendingInvitations.map((invitation) => {
                const key = invitationRefKey(invitation.actionRef);
                const rowPending = resending === key;
                return (
                  <li
                    key={key}
                    className="flex min-w-0 flex-col gap-4 py-4 first:pt-0 last:pb-0 md:flex-row md:items-start md:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="min-w-0 break-all">{invitation.email}</p>
                      <p className="text-label text-muted-foreground tabular-nums break-words">
                        Sent {invitation.sentAtLabel}
                      </p>
                      <p className="text-label text-muted-foreground tabular-nums break-words">
                        Expires {invitation.expiresAtLabel}
                      </p>
                      <p className="text-label text-muted-foreground break-all">
                        Invited by {invitation.inviterLabel}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap md:justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="touch"
                        disabled={rowPending}
                        aria-label={`Resend invitation to ${invitation.email}`}
                        onClick={() => void handleResend(invitation)}
                      >
                        {rowPending ? "Sending invitation…" : "Resend invitation"}
                      </Button>
                      <StaffActionDialog
                        kind="cancel"
                        targetEmail={invitation.email}
                        invitationRef={invitation.actionRef}
                        disabled={rowPending}
                        onResult={setResult}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </PanelCard>
  );
}
