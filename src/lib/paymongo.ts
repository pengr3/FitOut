// PayMongo REST client — a thin `fetch` wrapper (there is NO official PayMongo SDK; CLAUDE.md § D-20).
//
// This module is the ONLY place that talks to PayMongo over HTTP. It is deliberately tiny: HTTP Basic
// auth (the secret key as the username, per PayMongo), a JSON `fetch` helper that sends an
// `Idempotency-Key` on POSTs and throws on non-2xx, and the two Platforms / Linked-Accounts calls the
// payout-onboarding action needs (createLinkedAccount + createOnboardingLink). The webhook route does
// its own node-crypto signature verification and does NOT import this client.
//
// FAIL-CLOSED (copied from the src/lib/auth.ts WR-03 boot guard): in PRODUCTION we refuse to boot
// without PAYMONGO_SECRET_KEY rather than silently make unauthenticated calls. In dev/test/build the
// placeholder in .env is tolerated so local setup, the fully-mocked test suite, and `next build` all
// pass — only a real production boot is keyless-fatal.
//
// BETA NOTE: PayMongo Platforms / Linked Accounts is beta / sales-gated. The endpoint paths below wrap
// the documented contract; real hosted onboarding is exercised in MANUAL UAT once PayMongo enables the
// platform on the account. Every test mocks THIS module (tests/helpers/mocks.ts → mockPayMongo), so no
// test depends on a live PayMongo call.

import { randomUUID } from "node:crypto";

// Version-less base (Pitfall 3): PayMongo mixes /v1 (Checkout Sessions, Refunds, Linked Accounts) and
// /v2 (Batch Transfers, Wallets) endpoints. Every caller passes a FULLY versioned path (`/v1/...` or
// `/v2/...`) so a /v2 call can never accidentally hit `/v1/v2/...`. Do NOT re-add a trailing `/v1` here.
const PAYMONGO_BASE = "https://api.paymongo.com";

// Fail-closed at module load — production only (dev/test/build tolerate the .env placeholder).
if (!process.env.PAYMONGO_SECRET_KEY && process.env.NODE_ENV === "production") {
  throw new Error(
    "PAYMONGO_SECRET_KEY is not set. Refusing to boot in production without the PayMongo secret key. " +
      "Set it in the deploy environment (it is the HTTP-Basic username for every PayMongo API call).",
  );
}

// The platform payout wallet — the `source_account` for every inhouse batch transfer (D-20). Same
// fail-closed shape as the secret-key guard: in PRODUCTION we refuse to boot without the wallet
// identifiers rather than fire a transfer with an empty source (which would fail or misroute money).
// Dev/test/build tolerate placeholders so the fully-mocked suite and `next build` still pass. BIC
// defaults to PayMongo's inhouse BIC (PAEYPHM2XXX) when unset.
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  (!process.env.PLATFORM_WALLET_NUMBER || !process.env.PLATFORM_WALLET_NAME)
) {
  throw new Error(
    "PLATFORM_WALLET_NUMBER / PLATFORM_WALLET_NAME are not set. Refusing to boot in production without " +
      "the platform payout wallet identifiers — they are the source_account for every host payout transfer.",
  );
}

/** Platform payout wallet — the source_account of every inhouse /v2 batch transfer (D-20). */
const PLATFORM_WALLET = {
  number: process.env.PLATFORM_WALLET_NUMBER ?? "",
  name: process.env.PLATFORM_WALLET_NAME ?? "",
  bic: process.env.PLATFORM_WALLET_BIC ?? "PAEYPHM2XXX",
};

/** HTTP Basic auth header — the secret key is the username, empty password (PayMongo convention). */
function authHeader(): string {
  const secret = process.env.PAYMONGO_SECRET_KEY ?? "";
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

type FetchInit = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Idempotency-Key for safe POST retries (PayMongo requirement). */
  idempotencyKey?: string;
};

/**
 * Call the PayMongo REST API with Basic auth + JSON. Sends an Idempotency-Key on POSTs and throws a
 * descriptive Error on any non-2xx (surfacing the first PayMongo error detail when present).
 */
async function paymongoFetch<T>(path: string, init: FetchInit = {}): Promise<T> {
  const method = init.method ?? "GET";
  const headers: Record<string, string> = {
    Authorization: authHeader(),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (method === "POST") {
    // Every POST carries an Idempotency-Key so a retried create can't duplicate (PayMongo requirement).
    headers["Idempotency-Key"] = init.idempotencyKey ?? randomUUID();
  }

  const res = await fetch(`${PAYMONGO_BASE}${path}`, {
    method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const detail =
      (json as { errors?: Array<{ detail?: string }> })?.errors?.[0]?.detail ??
      res.statusText;
    throw new Error(`PayMongo ${method} ${path} failed (${res.status}): ${detail}`);
  }
  return json as T;
}

export type LinkedAccount = { id: string };
export type OnboardingLink = { url: string };

/**
 * Create a PayMongo Linked Account (Platforms / Linked Accounts — the hosted-KYC child/merchant). Call
 * this AT MOST ONCE per host; the caller (paymongo-connect.ts) guards create-once with a row lock and
 * persists the returned id. A stable Idempotency-Key keyed on the host email makes an accidental
 * double-POST a no-op on PayMongo's side as a second line of defense.
 */
export async function createLinkedAccount({
  email,
}: {
  email: string;
}): Promise<LinkedAccount> {
  const json = await paymongoFetch<{ data: { id: string } }>("/v1/linked_accounts", {
    method: "POST",
    idempotencyKey: `linked-account:${email}`,
    body: { data: { attributes: { type: "linked_account", email } } },
  });
  return { id: json.data.id };
}

/**
 * Mint a hosted onboarding redirect link for a Linked Account (the Stripe-Account-Links equivalent).
 * Links are single-use / expiring — the caller re-mints one on EVERY click and on the refresh_url page;
 * never cache the URL. A fresh Idempotency-Key per call keeps each mint distinct.
 */
export async function createOnboardingLink({
  accountId,
  returnUrl,
  refreshUrl,
}: {
  accountId: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<OnboardingLink> {
  const json = await paymongoFetch<{ data: { attributes: { url: string } } }>(
    "/v1/linked_accounts/onboarding_links",
    {
      method: "POST",
      idempotencyKey: `onboarding-link:${accountId}:${randomUUID()}`,
      body: {
        data: {
          attributes: {
            account_id: accountId,
            return_url: returnUrl,
            refresh_url: refreshUrl,
          },
        },
      },
    },
  );
  return { url: json.data.attributes.url };
}

// ---------------------------------------------------------------------------
// Money-movement calls (Phase 5, D-53/54/56/60). All wrap the SAME paymongoFetch helper above.
// ---------------------------------------------------------------------------

export type CheckoutSession = { id: string; checkoutUrl: string };

/**
 * Create a hosted PayMongo Checkout Session (/v1) that charges an EXACT server-frozen amount across the
 * full PH rail set (D-53: cards + GCash + Maya + QRPh in one hosted page, D-54). The booker is redirected
 * to `checkoutUrl`; the `checkout_session.payment.paid` webhook — NOT the browser return — is the confirm
 * authority (D-57).
 *
 * `amountCents` is integer CENTAVOS and MUST be the server-frozen `booking.quotedTotalCents` (D-49) —
 * NEVER a client-supplied number. `paymaya` is Maya's PayMongo API name. Idempotency-Key is set by the
 * caller (e.g. `checkout:<bookingId>`) so a double-click / retry can't create a second charge.
 */
export async function createCheckoutSession(input: {
  amountCents: number;
  currency?: string;
  name: string;
  description?: string;
  referenceNumber: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  idempotencyKey: string;
}): Promise<CheckoutSession> {
  const json = await paymongoFetch<{ data: { id: string; attributes: { checkout_url: string } } }>(
    "/v1/checkout_sessions",
    {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: {
        data: {
          attributes: {
            line_items: [
              {
                amount: input.amountCents,
                currency: (input.currency ?? "PHP").toUpperCase(),
                name: input.name,
                quantity: 1,
              },
            ],
            payment_method_types: ["card", "gcash", "paymaya", "qrph"], // D-53 full PH rail set
            reference_number: input.referenceNumber,
            metadata: input.metadata,
            description: input.description ?? input.name,
            success_url: input.successUrl,
            cancel_url: input.cancelUrl,
            send_email_receipt: true,
          },
        },
      },
    },
  );
  return { id: json.data.id, checkoutUrl: json.data.attributes.checkout_url };
}

export type Refund = { id: string; status: string };

/**
 * Create a PayMongo refund (/v1) against a captured payment (D-60 refund MECHANISM only — no policy
 * tiers here, those are Phase 7). Idempotency-Key is keyed on the payment id so a retry can't double-
 * refund.
 *
 * ⚠️ FAILS for QRPh / UBP payments — PayMongo does not support refunding those rails. The caller
 * (Plan 04's auto-refund backstop) MUST branch on the booking's payment method BEFORE calling this and
 * take the operator-alert path for an unrefundable rail (Research Pitfall 1).
 */
export async function createRefund(input: {
  amountCents: number;
  paymentId: string;
  notes?: string;
}): Promise<Refund> {
  const json = await paymongoFetch<{ data: { id: string; attributes: { status: string } } }>(
    "/v1/refunds",
    {
      method: "POST",
      // ⚠️ ONE-REFUND-PER-PAYMENT ASSUMPTION, recorded explicitly (07-16). This key is scoped to the
      // PAYMENT, not to a (payment, amount) pair — so a SECOND createRefund for the same payment does NOT
      // produce a second refund resource: PayMongo's idempotency replays the FIRST response, whatever
      // amount the second call asked for. That is SAFE today (one refund per booking; booking↔payment is
      // 1:1) and is exactly the double-refund guard the key exists to be. But it is a TRAP for any future
      // partial-then-top-up flow: the top-up call would silently no-op and REPORT SUCCESS while moving no
      // money. If that flow is ever built, this key must gain a per-refund discriminator — and the
      // one-refund-per-payment test in tests/paymongo/refund.test.ts will go red to force the decision.
      idempotencyKey: `refund:${input.paymentId}`,
      body: {
        data: {
          attributes: {
            amount: input.amountCents,
            payment_id: input.paymentId,
            reason: "others",
            notes: input.notes,
          },
        },
      },
    },
  );
  return { id: json.data.id, status: json.data.attributes.status };
}

export type BatchTransfer = { batchId: string; transferId: string; status: string };

/**
 * Fire an inhouse (`provider:"paymongo"`) wallet-to-wallet batch transfer (/v2) of an EXACT net amount to
 * a host's Linked-Account wallet — the hold-until-session payout (D-20, PAY-03). This is the PayMongo
 * analog of Stripe's separate-charges-and-transfers; it is NEVER payment-splitting (which pays the host
 * at settlement, violating hold-until-session).
 *
 * `netCents` is transferred VERBATIM — it is already `(gross − commission)` and is NOT further reduced by
 * the PayMongo gateway fee (D-52: the platform absorbs that fee; the host nets exactly `gross − 10%`).
 * Idempotency-Key is keyed `payout:<bookingId>` so a re-run of the payout sweep can't double-pay.
 *
 * The response nesting (`data.attributes.transfers[0]`) is a beta/thinly-documented assumption (A2/A3) —
 * we optional-chain defensively rather than crash if PayMongo shifts the shape.
 */
export async function createBatchTransfer(input: {
  netCents: number;
  currency?: string;
  bookingId: string;
  description: string;
  destination: { number: string; name: string; bic?: string };
  callbackUrl?: string;
}): Promise<BatchTransfer> {
  const json = await paymongoFetch<{
    data?: { id?: string; attributes?: { transfers?: Array<{ id?: string; status?: string }> } };
  }>("/v2/batch_transfers", {
    method: "POST",
    idempotencyKey: `payout:${input.bookingId}`,
    body: {
      transfers: [
        {
          provider: "paymongo", // inhouse wallet-to-wallet — NEVER payment-splitting
          amount: input.netCents, // D-52: net, NOT reduced by the gateway fee
          currency: (input.currency ?? "PHP").toUpperCase(),
          purpose: "Marketplace payout",
          description: input.description,
          reference_number: `payout-${input.bookingId}`,
          source_account: {
            number: PLATFORM_WALLET.number,
            name: PLATFORM_WALLET.name,
            bic: PLATFORM_WALLET.bic,
          },
          destination_account: {
            number: input.destination.number,
            name: input.destination.name,
            bic: input.destination.bic ?? "PAEYPHM2XXX",
          },
          callback_url: input.callbackUrl,
          metadata: { booking_id: input.bookingId },
        },
      ],
    },
  });
  const transfer = json.data?.attributes?.transfers?.[0];
  return {
    batchId: json.data?.id ?? "",
    transferId: transfer?.id ?? "",
    status: transfer?.status ?? "",
  };
}

/**
 * InstaPay's real-time ceiling: ₱50,000 = 5_000_000 centavos (07-RESEARCH § InstaPay transfer shape).
 * A transfer above it is DOOMED — do not fire it. createRefundTransfer throws below as defence in depth;
 * the cancel action checks this constant FIRST and takes the `needs_attention` operator-alert path instead
 * of a call we know fails. Comfortably above any plausible FitOut booking, asserted anyway.
 */
export const INSTAPAY_CEILING_CENTS = 5_000_000;

/**
 * Fire an InstaPay refund transfer (/v2/batch_transfers) of a booker's cancellation refund to a bank /
 * e-wallet destination THE BOOKER SUPPLIED on the cancel screen (D-72, Plan 07-16 Branch B — QRPh is NOT
 * API-refundable, settled by the 2026-07-23 probe recorded in src/lib/payments/refund-rail.ts).
 *
 * A SEPARATE exported function, deliberately NOT an overload of createBatchTransfer's payout signature:
 * the two move money for different reasons, and collapsing them invites exactly the namespace collision
 * below.
 *
 * ⚠️ PITFALL 10 — THE IDEMPOTENCY NAMESPACE IS `refund:`, NEVER the payout namespace. A payout and a
 * refund can exist for the SAME booking (partial refund → the retained share still pays out); if both
 * used one key, PayMongo would silently replay one call's response for the other and either the host or
 * the booker would not be paid. The two namespaces are grep-asserted distinct.
 *
 * ⚠️ RETRY SHAPE (A3): the `Idempotency-Key` is STABLE per booking (it is what prevents a double-pay);
 * `reference_number` ROTATES per attempt (`refund-<bookingId>-<attempt>`), per PayMongo's documented
 * guidance to "always use a NEW, unique reference_number" on retry — the reference is a reconciliation
 * label, not the dedupe. A3 (that PayMongo accepts this mix) is BLOCKED-unverified: the Money Movement
 * endpoints 404 on this test account until PayMongo enables the feature (evidence in refund-rail.ts).
 * Re-verify in manual UAT; the design follows the documented contract either way.
 *
 * ⚠️ D-72 COLLECT-AND-NEVER-STORE: `destination` passes STRAIGHT THROUGH to the transfer body and is
 * never persisted or logged by this module. The CALLER may keep only the returned transfer id and a
 * masked last-4. Transfers start `pending` and there is NO transfer webhook — terminal status is polled
 * (getTransfer), exactly as payout-reconcile does.
 */
export async function createRefundTransfer(input: {
  bookingId: string;
  amountCents: number;
  currency: string;
  attempt: number;
  destination: { number: string; name: string; bic: string };
}): Promise<BatchTransfer> {
  if (input.amountCents > INSTAPAY_CEILING_CENTS) {
    // Defence in depth — the caller must have routed this to the operator-alert path already.
    throw new Error(
      `Refund transfer for ${input.bookingId} exceeds the InstaPay ceiling; refusing to fire a doomed transfer.`,
    );
  }
  const json = await paymongoFetch<{
    data?: { id?: string; attributes?: { transfers?: Array<{ id?: string; status?: string }> } };
  }>("/v2/batch_transfers", {
    method: "POST",
    idempotencyKey: `refund:${input.bookingId}`,
    body: {
      transfers: [
        {
          provider: "instapay",
          amount: input.amountCents, // server-frozen quote.totalRefundCents — NEVER a client figure
          currency: input.currency.toUpperCase(),
          purpose: "Disbursement",
          description: `FitOut refund ${input.bookingId}`,
          reference_number: `refund-${input.bookingId}-${input.attempt}`,
          source_account: {
            number: PLATFORM_WALLET.number,
            name: PLATFORM_WALLET.name,
            bic: PLATFORM_WALLET.bic,
          },
          destination_account: {
            number: input.destination.number,
            name: input.destination.name,
            bic: input.destination.bic,
          },
          metadata: { booking_id: input.bookingId },
        },
      ],
    },
  });
  const transfer = json.data?.attributes?.transfers?.[0];
  return {
    batchId: json.data?.id ?? "",
    transferId: transfer?.id ?? "",
    status: transfer?.status ?? "",
  };
}

export type ReceivingInstitution = { name: string; bic: string };

/**
 * List the InstaPay receiving institutions (GET /v2/transfers/receiving_institutions?provider=instapay) —
 * the `{ name, bic }` pairs that populate the D-72 destination form's institution picker and the server-side
 * BIC allow-list (T-07-99: a destination BIC is validated against THIS set, never accepted as a free string).
 *
 * ⚠️ CURRENTLY 404s ON THIS ACCOUNT (observed 2026-07-23): until PayMongo enables Money Movement, the
 * router resolves `receiving_institutions` as a transfer-id lookup and returns
 * `{"errors":[{"code":"not_found","detail":"failed to get transfer: resource not found"}]}`. Callers MUST
 * tolerate a throw from this function and degrade calmly (the cancel page falls back to the
 * `needs_attention` operator-alert seam) rather than crash the cancellation surface.
 */
export async function listReceivingInstitutions(): Promise<ReceivingInstitution[]> {
  const json = await paymongoFetch<{
    data?: Array<{ attributes?: { name?: string; bic?: string }; name?: string; bic?: string }>;
  }>("/v2/transfers/receiving_institutions?provider=instapay");
  // Defensive over the beta shape: tolerate both a flat and an attributes-nested entry.
  return (json.data ?? [])
    .map((r) => ({ name: r.attributes?.name ?? r.name ?? "", bic: r.attributes?.bic ?? r.bic ?? "" }))
    .filter((r) => r.name !== "" && r.bic !== "");
}

export type WalletAccount = {
  id: string;
  accountNumber: string;
  accountName: string;
  status: string;
};

/**
 * List ALL activated PayMongo wallet accounts (/v2/wallets?status=activated).
 *
 * ⚠️ CONTRACT — READ BEFORE USING: this returns a GLOBAL, UNFILTERED list of EVERY activated wallet on
 * the platform. It takes NO host/account parameter. The CALLER (the Plan-05 payout sweep) MUST correlate
 * a returned entry to the specific booking's host by `wallet.id === host_payout.paymongo_account_id`
 * (or `wallet.accountNumber === <the stored per-host wallet number>`) BEFORE transferring — it must
 * NEVER pick `[0]`, or it will pay the wrong host. Enumerating a linked-account child wallet is a
 * beta/thinly-documented path (A2); the Plan-05 caller may instead read a stored per-host wallet number
 * directly. This helper is intentionally defensive (optional-chains the nested account shape).
 */
export async function listWalletAccounts(): Promise<WalletAccount[]> {
  const json = await paymongoFetch<{
    data?: Array<{
      id?: string;
      account?: { account_number?: string; account_name?: string };
      status?: string;
    }>;
  }>("/v2/wallets?status=activated");
  return (json.data ?? []).map((w) => ({
    id: w.id ?? "",
    accountNumber: w.account?.account_number ?? "",
    accountName: w.account?.account_name ?? "",
    status: w.status ?? "",
  }));
}

export type Transfer = { id: string; status: string };

/**
 * Poll a single /v2 transfer's terminal status (GET /v2/transfers/{id}, PAY-03).
 *
 * ⚠️ WHY A POLL, NOT A WEBHOOK: PayMongo has NO transfer/payout webhook subscription event (Research
 * Pitfall 2 — the create-a-webhook enum contains no transfer/payout/disbursement events). Transfer status
 * is therefore reconciled by POLLING this endpoint from the Plan-05b `payout-reconcile` cron, which moves
 * each Processing ledger row Held→Processing→Paid/Failed based on the returned `status`.
 *
 * This is a GET, so it carries NO Idempotency-Key (only POSTs do, per paymongoFetch). The exact terminal
 * status enum is a beta/thinly-documented surface (A4 — VERIFY the values against a captured test-mode
 * response before UAT); the caller's mapTransferStatus treats any unknown/in-flight value as still
 * `processing` so an unrecognized status can never spuriously flip a payout to Paid.
 */
export async function getTransfer(transferId: string): Promise<Transfer> {
  const json = await paymongoFetch<{ data: { id: string; attributes: { status: string } } }>(
    `/v2/transfers/${transferId}`,
    { method: "GET" }, // GET — no Idempotency-Key
  );
  return { id: json.data.id, status: json.data.attributes.status };
}
