import { redirect } from "next/navigation";
import { requireOpsMutationOrigin, requireStaff } from "@/lib/ops/staff";
import { rateLimit } from "@/lib/rate-limit";
import {
  attachManualTestTransfer, holdManualTestUncertain, MANUAL_TEST_BOOKING_ID,
  prepareManualTestPayout, readManualPayoutSnapshot,
  dispatchControlledApiTestPayout, recoverControlledApiTestPayout,
} from "@/lib/payments/manual-host-payout";

async function prepareAction() {
  "use server";
  await requireOpsMutationOrigin();
  const actor = await requireStaff();
  if (!rateLimit(`manual-payout-prepare:${actor.id}`, { window: 60, max: 3 }).ok)
    redirect("/ops?manualResult=rate_limited#manual-payout-test");
  const result = await prepareManualTestPayout(actor.id);
  redirect(`/ops?manualResult=${encodeURIComponent(result)}#manual-payout-test`);
}

async function attachAction(formData: FormData) {
  "use server";
  await requireOpsMutationOrigin();
  const actor = await requireStaff();
  if (!rateLimit(`manual-payout-attach:${actor.id}`, { window: 60, max: 5 }).ok)
    redirect("/ops?manualResult=rate_limited#manual-payout-test");
  if (formData.get("feeConfirmed") !== "yes")
    redirect("/ops?manualResult=fee_confirmation_required#manual-payout-test");
  const transferId = formData.get("transferId");
  const result = typeof transferId === "string"
    ? await attachManualTestTransfer(transferId.trim()) : "invalid_transfer_id";
  redirect(`/ops?manualResult=${encodeURIComponent(result)}#manual-payout-test`);
}

async function holdUnknownAction(formData: FormData) {
  "use server";
  await requireOpsMutationOrigin();
  const actor = await requireStaff();
  if (!rateLimit(`manual-payout-uncertain:${actor.id}`, { window: 60, max: 3 }).ok)
    redirect("/ops?manualResult=rate_limited#manual-payout-test");
  const reportedId = formData.get("reportedTransferId");
  const result = await holdManualTestUncertain(typeof reportedId === "string" ? reportedId.trim() : undefined);
  redirect(`/ops?manualResult=${encodeURIComponent(result)}#manual-payout-test`);
}

async function apiDispatchAction() {
  "use server";
  await requireOpsMutationOrigin();
  const actor = await requireStaff();
  if (!rateLimit(`api-payout-dispatch:${actor.id}`, { window: 300, max: 1 }).ok)
    redirect("/ops?manualResult=rate_limited#manual-payout-test");
  const result = await dispatchControlledApiTestPayout(actor.id);
  redirect(`/ops?manualResult=${encodeURIComponent(result)}#manual-payout-test`);
}

async function apiRecoverAction() {
  "use server";
  await requireOpsMutationOrigin();
  const actor = await requireStaff();
  if (!rateLimit(`api-payout-recover:${actor.id}`, { window: 60, max: 5 }).ok)
    redirect("/ops?manualResult=rate_limited#manual-payout-test");
  const result = await recoverControlledApiTestPayout();
  redirect(`/ops?manualResult=${encodeURIComponent(result)}#manual-payout-test`);
}

export async function ManualPayoutPanel({ result = "" }: { result?: string }) {
  await requireStaff();
  const snapshot = await readManualPayoutSnapshot();
  result = result.replace(/[^a-z_]/g, "");
  return (
    <section id="manual-payout-test" className="mt-12 max-w-2xl space-y-6" aria-label="First host payout test">
      <h1 className="text-2xl font-semibold">First host payout test</h1>
      <p>Booking {MANUAL_TEST_BOOKING_ID}. This is one staff-controlled FitOut API test.
        The Friday sweep remains paused. Do not send the PayMongo Dashboard draft.</p>
      {result && <p role="status" className="rounded border p-3">Result: {result.replaceAll("_", " ")}</p>}
      {snapshot.destinationUnavailable && <p role="alert" className="rounded border p-4">
        The frozen payout destination cannot be read in this deployment. Check the recipient encryption
        configuration and stored destination before proceeding. Do not send in PayMongo.
      </p>}
      <section className="space-y-3 rounded border p-5" aria-label="Payout claim">
        <p><strong>Claim:</strong> {snapshot.state}</p>
        <p><strong>Host amount:</strong> ₱{(snapshot.amountCents / 100).toFixed(2)}</p>
        {snapshot.walletAvailableCents !== null && <p><strong>Fresh Wallet balance:</strong> ₱{(snapshot.walletAvailableCents / 100).toFixed(2)}</p>}
        <p><strong>Recorded debit budget:</strong> ₱{(snapshot.maxDebitCents / 100).toFixed(2)}.
          The provider reports the actual fee after creating an API transfer.</p>
        {snapshot.actualFeeCents !== null && <p><strong>Verified provider fee:</strong> ₱{(snapshot.actualFeeCents / 100).toFixed(2)}.
          {snapshot.actualFeeCents > 1000 && " Above the ₱10 expected fee; investigate the account pricing."}</p>}
        {snapshot.sourceAccountLast4 && <p><strong>Source Wallet:</strong> ending in {snapshot.sourceAccountLast4}</p>}
        {snapshot.state === "unprepared" ? (
          <form action={prepareAction}>
            <button type="submit" className="rounded bg-primary px-4 py-2 text-primary-foreground">Run preflight and reserve this booking</button>
          </form>
        ) : snapshot.destination && (
          <div className="space-y-1">
            <h2 className="font-semibold">Frozen destination for secure comparison</h2>
            <p>Institution BIC: {snapshot.destination.bic}</p>
            <p>Account name: {snapshot.destination.name}</p>
            <p>Account number: {snapshot.destination.number}</p>
          </div>
        )}
      </section>
      {snapshot.state === "prepared" && !snapshot.readyToSend && (
        <p role="alert" className="rounded border p-4">Release check is on hold. Refresh after the settlement,
          recipient, host and Wallet evidence is current. Do not send in PayMongo.</p>
      )}
      {snapshot.state === "prepared" && (
        <section className="space-y-4 rounded border p-5">
          <h2 className="text-lg font-semibold">One controlled FitOut API attempt</h2>
          <p>FitOut checked at {snapshot.checkedAt}. Refresh immediately before dispatch. The API sends
            ₱17.10 to the frozen destination above. The expected fee is up to ₱10, but PayMongo reveals
            the actual fee after creation. An over-budget fee becomes an incident, not a second send.</p>
          {snapshot.apiWalletReady ? (
            <form action={apiDispatchAction}>
              <button type="submit" className="rounded bg-primary px-4 py-2 text-primary-foreground">
                Dispatch one payout through FitOut API
              </button>
            </form>
          ) : <p role="alert">API dispatch is on hold. Fresh Wallet funds of at least ₱27.10 and all
            payout checks are required.</p>}
          <h3 className="font-semibold">Link an already sent transfer</h3>
          <p>Use this only if a Dashboard transfer was sent before switching routes. It never sends money.</p>
          <form action={attachAction} className="space-y-3">
            <label className="block">PayMongo transfer ID after sending
              <input name="transferId" required pattern="(tr|wallet_tr)_[A-Za-z0-9]{8,64}"
                defaultValue={snapshot.transferId ?? ""}
                className="mt-1 block w-full rounded border px-3 py-2" />
            </label>
            <label className="flex gap-2">
              <input type="checkbox" name="feeConfirmed" value="yes" required />
              I checked the final Dashboard screen: ₱17.10 to this destination, ₱0.00 fee.
            </label>
            <button type="submit" className="rounded bg-primary px-4 py-2 text-primary-foreground">
              Verify transfer and attach to FitOut claim
            </button>
          </form>
          <form action={holdUnknownAction} className="space-y-3 rounded border p-4">
            <p>If money may have been sent but the receipt, fee, or identity cannot be verified,
              record an investigation hold. This cannot mark the booking paid.</p>
            <label className="block">Reported transfer ID, if available
              <input name="reportedTransferId" pattern="(tr|wallet_tr)_[A-Za-z0-9]{8,64}"
                defaultValue={snapshot.transferId ?? ""}
                className="mt-1 block w-full rounded border px-3 py-2" />
            </label>
            <button type="submit" className="rounded border px-4 py-2">Hold for transfer investigation</button>
          </form>
          <p>Once a transfer may have been sent, never send again to discover its outcome.</p>
        </section>
      )}
      {["api_reserved", "api_submitted"].includes(snapshot.state) && <section className="space-y-3 rounded border p-5">
        <h2 className="text-lg font-semibold">API attempt recorded</h2>
        <p>FitOut will not send again. Read the existing PayMongo transfer by its saved ID or reference.</p>
        <form action={apiRecoverAction}>
          <button type="submit" className="rounded border px-4 py-2">Read back API transfer</button>
        </form>
      </section>}
      {snapshot.transferId && <p>Provider transfer ID: {snapshot.transferId}</p>}
    </section>
  );
}
