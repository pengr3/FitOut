import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hostPayoutDestination } from "@/lib/db/schema";
import { listReceivingInstitutions } from "@/lib/paymongo";
import { PayoutDestinationForm } from "@/components/host/payout-destination-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { attestPayoutDestination } from "@/app/actions/payout-destination";

export default async function PayoutsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const host = session.user as typeof session.user & { canHost?: boolean };
  if (!host.canHost) redirect("/");

  const [destination, institutionsResult] = await Promise.all([
    db.select({ institutionName: hostPayoutDestination.institutionName, accountLast4: hostPayoutDestination.accountLast4, verificationStatus: hostPayoutDestination.verificationStatus }).from(hostPayoutDestination).where(eq(hostPayoutDestination.userId, host.id)),
    listReceivingInstitutions().catch(() => []),
  ]);
  const current = destination[0];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Payout destination</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">Choose where FitOut should send your earnings after a completed session. Your account details are encrypted and are never shown on your public profile.</p>
      {current ? (
        <Alert className="mt-8">
          <AlertTitle>{current.verificationStatus === "verified" ? "Destination verified" : current.verificationStatus === "host_attested" ? "Destination confirmed by you" : "Confirm your destination"}</AlertTitle>
          <AlertDescription>{current.institutionName} ending in {current.accountLast4}. {current.verificationStatus === "host_attested" ? "It may be used only for an approved payout; booking availability remains under release controls." : "Confirm that the details are correct before FitOut can use it in an approved payout."}</AlertDescription>
        </Alert>
      ) : null}
      <div className="mt-8">
        {institutionsResult.length > 0 ? <PayoutDestinationForm institutions={institutionsResult} pendingDestination={current?.verificationStatus === "pending" ? { institutionName: current.institutionName, accountLast4: current.accountLast4 } : undefined} onAttest={current?.verificationStatus === "pending" ? attestPayoutDestination : undefined} /> : <Alert variant="destructive"><AlertTitle>Payout setup is temporarily unavailable</AlertTitle><AlertDescription>We can&apos;t load the current bank and e-wallet directory. Please return later.</AlertDescription></Alert>}
      </div>
    </div>
  );
}
