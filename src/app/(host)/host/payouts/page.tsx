import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hostPayout, hostPayoutDestination } from "@/lib/db/schema";
import { listReceivingInstitutions } from "@/lib/paymongo";
import { PayoutDestinationForm } from "@/components/host/payout-destination-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { attestPayoutDestination } from "@/app/actions/payout-destination";
import { loadHostVerification } from "@/lib/host/verification-status";
import Link from "next/link";

export default async function PayoutsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const host = session.user as typeof session.user & { canHost?: boolean };
  if (!host.canHost) redirect("/");

  const [destination, payout, institutionsResult, verification] = await Promise.all([
    db.select({ institutionName: hostPayoutDestination.institutionName, accountLast4: hostPayoutDestination.accountLast4, verificationStatus: hostPayoutDestination.verificationStatus }).from(hostPayoutDestination).where(eq(hostPayoutDestination.userId, host.id)),
    db.select({ payoutsEnabled: hostPayout.payoutsEnabled }).from(hostPayout).where(eq(hostPayout.userId, host.id)),
    listReceivingInstitutions().catch(() => []),
    loadHostVerification(db, host.id),
  ]);
  const current = destination[0];
  const destinationActive = payout[0]?.payoutsEnabled === true && (current?.verificationStatus === "host_attested" || current?.verificationStatus === "verified");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Payout destination</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">Choose where FitOut should send your earnings after a completed session. Your account details are encrypted and are never shown on your public profile.</p>
      {current ? (
        <Alert className="mt-8">
          <AlertTitle>{destinationActive ? "Destination confirmed" : "Review your payout destination"}</AlertTitle>
          <AlertDescription>{current.institutionName} ending in {current.accountLast4}. {destinationActive ? "You confirmed these details. FitOut will use them only when a booking meets the payout rules." : "Enter and save the complete details again, then confirm them to make this destination eligible for payouts. Host approval is also required."}</AlertDescription>
        </Alert>
      ) : null}
      {verification.status !== "approved" && verification.status !== "grandfathered" ? (
        <Alert className="mt-5">
          <AlertTitle>Hosting approval is needed</AlertTitle>
          <AlertDescription>You can save a payout destination now. Confirmation becomes available after your hosting account is approved. <Link href="/host/verify">Check your verification status</Link>.</AlertDescription>
        </Alert>
      ) : null}
      <div className="mt-8">
        {institutionsResult.length > 0 ? <PayoutDestinationForm institutions={institutionsResult} pendingDestination={current?.verificationStatus === "pending" ? { institutionName: current.institutionName, accountLast4: current.accountLast4 } : undefined} confirmedDestination={destinationActive ? { institutionName: current!.institutionName, accountLast4: current!.accountLast4 } : undefined} hostApproved={verification.status === "approved" || verification.status === "grandfathered"} onAttest={attestPayoutDestination} /> : <Alert variant="destructive"><AlertTitle>Payout setup is temporarily unavailable</AlertTitle><AlertDescription>We can&apos;t load the current bank and e-wallet directory. Please return later.</AlertDescription></Alert>}
      </div>
    </div>
  );
}
