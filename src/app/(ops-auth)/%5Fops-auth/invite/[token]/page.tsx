import type { Metadata } from "next";
import Link from "next/link";

import { StaffInviteSetupForm } from "@/app/(ops-auth)/%5Fops-auth/_components/staff-invite-setup-form";
import { PanelCard } from "@/components/patterns/panel-card";
import { Button } from "@/components/ui/button";
import { inspectStaffInvitation } from "@/lib/ops/invitations";

export const metadata: Metadata = {
  title: "Staff invitation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const INACTIVE_TITLE = "This invitation is no longer active";
const INACTIVE_BODY =
  "Ask the FitOut staff member who invited you to send a new invitation.";

export default async function StaffInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await inspectStaffInvitation(token);

  if (invitation.state === "inactive") {
    return (
      <PanelCard title={INACTIVE_TITLE} titleAs="h1" description={INACTIVE_BODY}>
        <Button asChild variant="outline" size="touch" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title="Create your staff account"
      titleAs="h1"
      description="Set your name and password to join FitOut Ops."
    >
      <dl className="rounded-md bg-muted px-3 py-2 text-sm">
        <dt className="font-medium text-foreground">Staff email</dt>
        <dd className="break-words text-muted-foreground">{invitation.email}</dd>
      </dl>
      <StaffInviteSetupForm token={token} />
    </PanelCard>
  );
}
