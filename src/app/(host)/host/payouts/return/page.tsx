// Payout onboarding RETURN landing (D-13). PayMongo redirects the host here after the hosted flow. The
// payout state may still read "pending" for a moment — activation is confirmed asynchronously — so we
// show the current state with a reassuring message and a link back to the dashboard. RSC with a canHost
// re-check (defense in depth; the (host) layout already gates, but never render hosting content without it).
//
// VOICE: never "Stripe" / "PayMongo" / "KYC" / "webhook" — say "payouts" / "get paid".

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hostPayout } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { PayoutBanner, derivePayoutStatus } from "@/components/host/payout-banner";

export default async function PayoutReturnPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/");
  }

  const [row] = await db
    .select()
    .from(hostPayout)
    .where(eq(hostPayout.userId, session.user.id));
  const status = derivePayoutStatus(row);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Thanks — that&apos;s submitted</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        {status === "enabled"
          ? "You're all set to get paid. Your published listings can now accept bookings."
          : "We're confirming your details. This can take a moment — we'll update your dashboard as soon as your account is ready to accept bookings."}
      </p>

      <div className="mt-8">
        <PayoutBanner status={status} />
      </div>

      <div className="mt-8">
        <Button asChild variant="outline">
          <Link href="/host">Back to your dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
