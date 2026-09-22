// An intentionally narrow production operator tool for one known hosted Checkout Session.
// It prints no session id, payment id, booking id, credentials, provider response body, or error body.

import {
  parseCheckoutStopArgs,
  runCheckoutStop,
} from "@/lib/ops/checkout-stop";
import { expireCheckoutSession, getCheckoutSession } from "@/lib/paymongo";

const USAGE = `Usage:
  npm run ops:stop-checkout -- inspect <checkout-session-id>
  npm run ops:stop-checkout -- expire <checkout-session-id> --confirm

Inspect is read-only. Expire affects exactly one active Checkout Session and always performs a provider
read-back. Do not use this after a payment is reported paid; preserve HOLD and use the return/reconciliation procedure instead.`;

async function main(): Promise<void> {
  if (!process.env.PAYMONGO_SECRET_KEY) {
    console.error("PayMongo credentials are unavailable in this environment. Nothing was sent.");
    process.exitCode = 1;
    return;
  }

  const parsed = parseCheckoutStopArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`${parsed.error}\n\n${USAGE}`);
    process.exitCode = 1;
    return;
  }

  try {
    const outcome = await runCheckoutStop(parsed.command, {
      getCheckoutSession,
      expireCheckoutSession,
    });

    if (outcome.kind === "inspected") {
      console.log(`Provider session status: ${outcome.status}. No change was made.`);
      return;
    }
    if (outcome.kind === "not-active") {
      console.error(`Refusing expiry: provider session is ${outcome.status}, not active. Nothing was sent.`);
      process.exitCode = 1;
      return;
    }
    if (outcome.kind === "verification-failed") {
      console.error(`Expiry could not be verified: provider session is ${outcome.status}. Keep HOLD.`);
      process.exitCode = 1;
      return;
    }

    console.log("Provider read-back confirmed the Checkout Session is expired and not payable.");
  } catch {
    console.error("Checkout stop failed without a verified provider result. Keep HOLD and reconcile manually.");
    process.exitCode = 1;
  }
}

main();
