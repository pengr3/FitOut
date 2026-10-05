import { redirect } from "next/navigation";
import { requireOpsMutationOrigin, requireStaff } from "@/lib/ops/staff";
import { rateLimit } from "@/lib/rate-limit";
import {
  attachManualTestTransfer, MANUAL_TEST_BOOKING_ID,
  prepareManualTestPayout, readManualPayoutSnapshot,
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

export async function ManualPayoutPanel({ result = "" }: { result?: string }) {
  await requireStaff();
  const snapshot = await readManualPayoutSnapshot();
  result = result.replace(/[^a-z_]/g, "");
  return (
    <section id="manual-payout-test" className="mt-12 max-w-2xl space-y-6" aria-label="First host payout test">
      <h1 className="text-2xl font-semibold">First host payout test</h1>
      <p>Booking {MANUAL_TEST_BOOKING_ID}. This is a single, staff-controlled Dashboard transfer.
        The Friday sweep remains paused.</p>
      {result && <p role="status" className="rounded border p-3">Result: {result.replaceAll("_", " ")}</p>}
      <section className="space-y-3 rounded border p-5" aria-label="Payout claim">
        <p><strong>Claim:</strong> {snapshot.state}</p>
        <p><strong>Host amount:</strong> ₱{(snapshot.amountCents / 100).toFixed(2)}</p>
        <p><strong>Maximum total Wallet debit:</strong> ₱{(snapshot.maxDebitCents / 100).toFixed(2)}</p>
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
          <h2 className="text-lg font-semibold">Send in PayMongo</h2>
          {snapshot.readyToSend && <>
            <p>FitOut preflight checked at {snapshot.checkedAt}. Refresh this page immediately before
              authorizing the transfer; a previous check is not a continuing approval.</p>
            <p>Open the live PayMongo Wallet and compare its source Wallet and recipient with the frozen details above.
              At the final confirmation, send only if the fee is ₱0.00 and the total debit is ₱17.10.
              Do not authorize if the displayed values differ.</p>
            <a href="https://dashboard.paymongo.com/wallets" target="_blank" rel="noopener noreferrer"
              className="inline-block rounded border px-4 py-2 underline">Open PayMongo Wallet</a>
          </>}
          <h3 className="font-semibold">Link an already sent transfer</h3>
          <p>Use this readback even if a later preflight is on hold. It does not initiate a new transfer.</p>
          <form action={attachAction} className="space-y-3">
            <label className="block">PayMongo transfer ID after sending
              <input name="transferId" required pattern="tr_[A-Za-z0-9]{8,64}"
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
          <p>If PayMongo gives no transfer ID, leave this claim held and investigate. Never send again.</p>
        </section>
      )}
      {snapshot.transferId && <p>Provider transfer ID: {snapshot.transferId}</p>}
    </section>
  );
}
