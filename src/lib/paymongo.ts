// PayMongo REST client — a thin `fetch` wrapper (there is NO official PayMongo SDK; CLAUDE.md § D-20).
//
// This module is the ONLY place that talks to PayMongo over HTTP. It is deliberately tiny: HTTP Basic
// auth (the secret key as the username, per PayMongo), a JSON `fetch` helper that sends an
// `Idempotency-Key` on POSTs and throws on non-2xx, and the two Platforms / Linked-Accounts calls the
// payout-onboarding action needs (createLinkedAccount + createOnboardingLink). The webhook route does
// its own node-crypto signature verification and does NOT import this client.
//
// FAIL-CLOSED (copied from the src/lib/auth.ts WR-03 boot guard): in the Vercel Production deployment we
// refuse to boot without PAYMONGO_SECRET_KEY rather than silently make unauthenticated calls. Vercel Preview
// is deliberately credential-free and may render the app against an isolated database; its payment calls
// fail before any request is made. Dev/test/build tolerate the .env placeholder so local setup, the
// fully-mocked test suite, and `next build` all pass.
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
const isVercelPreview = process.env.VERCEL_ENV === "preview";

// Fail-closed at module load — actual production only (dev/test/build and credential-free Preview tolerate
// the placeholder). `NODE_ENV` alone cannot identify a Vercel Production deployment: Vercel sets it to
// "production" for Preview too.
if (!process.env.PAYMONGO_SECRET_KEY && process.env.NODE_ENV === "production" && !isVercelPreview) {
  throw new Error(
    "PAYMONGO_SECRET_KEY is not set. Refusing to boot in production without the PayMongo secret key. " +
      "Set it in the deploy environment (it is the HTTP-Basic username for every PayMongo API call).",
  );
}

/**
 * Platform payout wallet — the source account of the two money-movement functions below (D-20).
 *
 * The guard must live at the movement boundary, not module evaluation: the Operations server action
 * bundle imports cancellation code, so a missing payout-wallet configuration otherwise makes unrelated
 * staff and review operations unavailable. Production still fails closed before any transfer request is
 * sent; dev, test, build, and credential-free Preview retain their existing placeholder behavior.
 */
function platformWallet(): { number: string; name: string; bic: string } {
  const number = process.env.PLATFORM_WALLET_NUMBER ?? "";
  const name = process.env.PLATFORM_WALLET_NAME ?? "";
  if (
    process.env.NODE_ENV === "production" &&
    !isVercelPreview &&
    (!number || !name)
  ) {
    throw new Error(
      "PLATFORM_WALLET_NUMBER / PLATFORM_WALLET_NAME are not set. Refusing to create a payout or refund " +
        "transfer without the platform payout wallet identifiers.",
    );
  }
  return { number, name, bic: process.env.PLATFORM_WALLET_BIC ?? "PAEYPHM2XXX" };
}

/** HTTP Basic auth header — the secret key is the username, empty password (PayMongo convention). */
function authHeader(): string {
  const secret = process.env.PAYMONGO_SECRET_KEY ?? "";
  if (!secret && isVercelPreview) {
    throw new Error(
      "PayMongo is unavailable in this Preview deployment because payment credentials are intentionally not configured.",
    );
  }
  return `Basic ${Buffer.from(`${secret}:`).toString("base64")}`;
}

type FetchInit = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Idempotency-Key for safe POST retries (PayMongo requirement). */
  idempotencyKey?: string;
  /**
   * OPT-IN request deadline (D-84, plan 13-03). Defaults to `undefined`, which is why every call site
   * that existed before this parameter is behaviourally unchanged: per WebIDL an explicitly-`undefined`
   * optional dictionary member is treated as ABSENT, so `fetch(url, { …, signal: undefined })` and
   * `fetch(url, { … })` are the same request. The negative assertion in
   * tests/payments/paymongo-calls.test.ts case (4) pins that, so a later "helpful" default deadline
   * cannot be added here in silence.
   */
  signal?: AbortSignal;
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
    // The ONLY place a deadline can be threaded. `undefined` here === no signal at all (see FetchInit).
    signal: init.signal,
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
 * NEVER a client-supplied number. `paymaya` is Maya's PayMongo API name.
 *
 * ⚠️ Idempotency-Key is sent on every POST (paymongoFetch adds it), but PayMongo does NOT honor it on
 * POST /v1/checkout_sessions — probed against sk_test_, two POSTs with a byte-identical key + body return
 * two DIFFERENT, independently payable session ids. It is therefore NOT a double-charge guard. The caller
 * (confirmBooking / updateDeclaredPax) must expire the previously-persisted session via
 * expireCheckoutSession BEFORE creating a new one; that is the only mechanism that retires a superseded
 * session on a SEQUENTIAL resubmission. A truly CONCURRENT double-click is handled one layer up instead:
 * confirmBooking claims a compare-and-swap lease on the booking (src/lib/payments/checkout-lease.ts) before
 * it calls this function at all, so a second simultaneous caller is refused before any session is minted
 * (T-08-79, closed by quick task 260801-kv2).
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

/**
 * Expire a hosted Checkout Session (POST /v1/checkout_sessions/{id}/expire) so it can never be paid —
 * the CR-02 close. Takes no request body and returns the expired session's id.
 *
 * WHY THIS EXISTS. D-108 scoped the checkout Idempotency-Key to the frozen AMOUNT for per-head bookings,
 * so a re-priced hold mints a genuinely NEW session instead of replaying the old one at the old total.
 * Correct for what the booker is shown — but it leaves the SUPERSEDED session payable in a second tab or
 * the browser Back stack, and the confirm webhook keys purely on `reference_number` with no amount check,
 * so that stale payment would be captured and never refunded. The caller (updateDeclaredPax) expires the
 * persisted `booking.checkout_session_id` BEFORE minting a new session, keeping at most one payable.
 *
 * ⚠️ THE KEY IS SCOPED TO THE SESSION ID, NEVER TO THE BOOKING. A booking legitimately owns MORE THAN
 * ONE session over its life (a re-price creates exactly that), so a booking-scoped key would let one
 * session's expire be confused with another's. But the key is STILL NOT what makes a repeat expire safe:
 * PayMongo does NOT honor the Idempotency-Key on this endpoint (08-19 probed it live — a repeat expire
 * returns HTTP 400, not a replayed 200). That finding stands and is still load-bearing.
 *
 * WHAT MAKES IT SAFE IS THE POSTCONDITION CHECK (LW-01). On ANY error from the expire POST we ask the
 * provider what the session's status actually IS — exactly ONE `getCheckoutSession(id)` re-probe — and
 * tolerate the error only when the provider itself reports `expired`. At that point the POSTCONDITION of
 * expire — this session can never be paid — demonstrably HOLDS, whatever the error text said. That is
 * what keeps the confirmBooking / updateDeclaredPax post-expire-then-create-failure RETRY recovering
 * instead of livelocking on a permanent fail-closed refusal (T-08-84).
 *
 * THIS IS DELIBERATELY WORDING-INDEPENDENT, and that is the whole point of LW-01. The previous
 * implementation string-matched PayMongo's PROSE on the money path — a `(400)` status-code regex ANDed
 * with a regex over the error sentence's wording. A reword, a localization, or a status-code change on
 * their side would have silently stopped matching, reverted the tolerance to genuine-failure behaviour,
 * and re-opened the T-08-84 recovery livelock — with no automated detector, because the unit tests pinned
 * the currently observed sentence. The tolerance is now keyed on the provider's reported STATUS, which no
 * rewording can move. (The exact regexes are preserved in git history and in mutation M5 of
 * tests/payments/paymongo-calls.test.ts, which restores them to measure this claim.)
 *
 * THE `paid` CASE IS EXPLICITLY NEVER SWALLOWED. A superseded session the provider reports as `paid`
 * means money was CAPTURED on a session we were retiring. It THROWS, and the caller's `needs_attention`
 * audit is exactly where that belongs. Reporting it as a successful expire would hide a real capture from
 * the only path that can act on it.
 *
 * GENUINE failures (500, network, an `active` session that is STILL PAYABLE, any status that is not a
 * provider-confirmed `expired`, and a re-probe that itself fails) all THROW through paymongoFetch's
 * descriptive error shape and are NOT swallowed — the caller catches, records a `needs_attention` audit
 * and REFUSES, because proceeding on a session that might still be payable costs an unrefunded double
 * capture.
 *
 * COST: one extra GET, on the ERROR path ONLY. The success path is unchanged and issues no probe.
 */
export async function expireCheckoutSession(id: string): Promise<{ id: string }> {
  try {
    const json = await paymongoFetch<{ data: { id: string } }>(
      `/v1/checkout_sessions/${id}/expire`,
      {
        method: "POST",
        idempotencyKey: `checkout-expire:${id}`,
        // No body — the endpoint takes none.
      },
    );
    return { id: json.data.id };
  } catch (err) {
    // POSTCONDITION-VERIFIED IDEMPOTENT EXPIRE (LW-01). The expire POST failed. Whether that failure is
    // benign turns on exactly ONE fact: is this session actually retired at the provider? So ASK the
    // provider — never infer it from the error's prose. (08-19 case 4, probed live: a repeat expire of a
    // previously-expired session comes back HTTP 400, so this is the recovery path.)
    let probed: CheckoutSessionState;
    try {
      probed = await getCheckoutSession(id);
    } catch {
      // The re-probe itself failed (network / 500 / timeout): we learned NOTHING, so we fail closed on
      // the ORIGINAL expire error — never the probe's. It is deliberately not wrapped, chained,
      // `cause`-attached, or logged: both callers discard the caught error on purpose (T-05-15 /
      // T-08-44), and PayMongo prose must not gain a new route into an audit row or a booker response.
      throw err;
    }

    // The ONLY tolerated outcome: the provider ITSELF reports the session retired, so expire's
    // postcondition — this session can never be paid — demonstrably holds, whatever the error said.
    // Strict equality on the RAW string: no trimming, no toLowerCase, no includes. Any normalization
    // would widen the tolerance; a differently-cased or padded status is drift and must fail closed.
    if (probed.status === "expired") {
      // No 200 body on this path, so the id is echoed from the argument.
      return { id };
    }

    // EVERY OTHER STATUS FALLS THROUGH TO THE THROW BELOW — deliberately NOT an enumerated reject-list.
    // The two cases this fall-through exists to protect are `active` (the session is STILL PAYABLE — the
    // double-charge case the callers' fail-closed refusal exists for) and `paid` (money was CAPTURED on a
    // session we were retiring; it must reach the caller's `needs_attention` path and must NEVER be
    // reported as a clean expire). Do NOT "helpfully" add them as explicit branches: an enumerated
    // reject-list silently TOLERATES every status PayMongo adds later, whereas an `expired`-only allow
    // with a fall-through throw can never go stale.
    throw err;
  }
}

export type CheckoutSessionState = {
  id: string;
  status: string;
  /** The RAIL the session was paid on ("card" | "gcash" | "paymaya" | "qrph"), or null if unpaid/absent. */
  sourceType: string | null;
  /** The instant PayMongo says it was paid, or null. NEVER a proxy — D-85 forbids inventing one. */
  paidAt: Date | null;
  /**
   * The CAPTURED payment id (`pay_...`) for this session, or null when the session carries no payment.
   *
   * WHY THIS FIELD EXISTS (13.1-01). A confirm driven by a SERVER-SIDE PROBE rather than by a webhook
   * event has no other source for the `pay_...`: the webhook carries it on the event resource, the probe
   * carries it only here. Without it a reconciled booking lands `payment_id = NULL`, and
   * `isApiRefundable` FAILS CLOSED (src/lib/payments/refund-rail.ts) — so every later cancellation refund
   * on that booking would be judged unrefundable and permanently routed to the manual-return path, with
   * the booker's money surfaced to an operator instead of actually moving. That is a silent money bug
   * this phase would otherwise create, which is why the read is widened rather than the caller patched.
   *
   * ADDITIVE ONLY. `status`, `sourceType` and `paidAt` keep their exact semantics, and NO column is added
   * anywhere — `booking.payment_id` already exists, so 13.1-CONTEXT D-112 stays satisfied (this phase
   * ships zero migrations and `drizzle/` still ends at 0025_audit_resolved_by.sql).
   */
  paymentId: string | null;
};

/**
 * Read a hosted Checkout Session (GET /v1/checkout_sessions/{id}). Returns the id + the provider's
 * `attributes.status` ("active" while payable, "expired" once retired), plus (D-84) the rail the
 * session was paid on and the instant it was paid. Used to PROVE a superseded session is no longer
 * payable after expireCheckoutSession — the guarantee the confirm webhook (which keys on
 * reference_number alone, D-57) cannot enforce on its own — and, since plan 13-03, to recover the two
 * money facts `booking` has no column for. Throws through paymongoFetch on non-2xx.
 *
 * ── THE RESPONSE SHAPE, AS THE FIXTURES ENCODE IT ────────────────────────────────────────────────────
 * `attributes.payments` is an array of FULL Payment resources, so the rail sits TWO `attributes` deep —
 * do not flatten it to `payments[0].source.type`, which is the nesting depth this reads like and is not:
 *
 *   { data: { id, attributes: { status, paid_at,
 *             payments: [ { id, attributes: { source: { type }, status } } ] } } }
 *
 * `paid_at` is Unix SECONDS (PayMongo's convention for every timestamp it returns), hence the ×1000.
 *
 * ── WHERE THE `pay_...` LIVES, AND A RECORDED SPEC-VS-FIXTURE COLLISION (13.1-01) ────────────────────
 * The captured payment id sits on the payment resource's ENVELOPE (`payments[0].id`) — the `{ id, type,
 * attributes }` shape every PayMongo resource uses, which is also where the fixtures above put it and
 * where `src/app/api/paymongo/webhook/route.ts` reads it off the verified event. The 13.1-01 plan's
 * prose instead specified `payments[0].attributes.id`. Reading ONLY the plan's path would have returned
 * `null` for the very fixture that pins this contract — i.e. it would have shipped exactly the
 * `payment_id = NULL` money bug the field was added to prevent. So BOTH are read, envelope first:
 * the collision is recorded rather than resolved by guessing, and neither reading can regress. Both
 * placements are pinned by a case in tests/payments/paymongo-calls.test.ts.
 *
 * ⚠ Still NOT live-observed (13-03 recorded the same caveat for the rail and `paid_at`): confirming the
 * `pay_...` against a real paid session is a named UAT item, and the defensive `?? null` below is what
 * keeps a wrong guess from fabricating an id.
 *
 * The shape is PayMongo's DOCUMENTED contract, pinned by fixtures in
 * tests/payments/paymongo-calls.test.ts; it is NOT a live-observed body, and confirming it against a
 * real paid session is a named UAT item. Every field defaults defensively (`?? ""` / `?? null`, the
 * idiom the pre-D-84 line already used) because a fabricated rail would print a payment method the
 * booker never used, and a non-finite `paid_at` would mint an Invalid Date — truthy, and rendered
 * verbatim on a receipt.
 *
 * ── WHY THE DEADLINE IS OPT-IN AND NOT A DEFAULT (D-84) ──────────────────────────────────────────────
 * This function is load-bearing INSIDE expireCheckoutSession's double-charge guard (LW-01), where the
 * ONE tolerated outcome is the provider itself reporting the session retired. A deadline there converts
 * "the provider says this session can never be paid" into a NEW way to fail closed, on the exact path
 * whose failure costs an unrefunded double capture — so that call site passes no options and must keep
 * passing none. The booker-facing surfaces that need a bound are NEW callers (see
 * src/lib/payments/checkout-probe.ts) and they ask for one explicitly.
 */
export async function getCheckoutSession(
  id: string,
  opts?: { timeoutMs?: number },
): Promise<CheckoutSessionState> {
  const json = await paymongoFetch<{
    data: {
      id: string;
      attributes: {
        status?: string;
        paid_at?: unknown;
        payments?: Array<{ id?: string; attributes?: { id?: string; source?: { type?: string } } }>;
      };
    };
  }>(
    `/v1/checkout_sessions/${id}`,
    // No `timeoutMs` ⇒ no `signal` key reaches paymongoFetch at all.
    opts?.timeoutMs !== undefined ? { signal: AbortSignal.timeout(opts.timeoutMs) } : {},
  );
  const attributes = json.data.attributes;
  const paidAtSeconds = attributes.paid_at;
  return {
    id: json.data.id,
    status: attributes.status ?? "",
    sourceType: attributes.payments?.[0]?.attributes?.source?.type ?? null,
    // Envelope id first (the fixture-pinned placement the webhook also reads), then the nested one the
    // 13.1-01 prose named — see the collision note in the header. `?? null` keeps a missing/absent
    // payments array a STRICT null rather than an `undefined` a caller could read as "not asked".
    paymentId: attributes.payments?.[0]?.id ?? attributes.payments?.[0]?.attributes?.id ?? null,
    paidAt:
      typeof paidAtSeconds === "number" && Number.isFinite(paidAtSeconds)
        ? new Date(paidAtSeconds * 1000)
        : null,
  };
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
  const sourceAccount = platformWallet();
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
            number: sourceAccount.number,
            name: sourceAccount.name,
            bic: sourceAccount.bic,
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
  const sourceAccount = platformWallet();
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
            number: sourceAccount.number,
            name: sourceAccount.name,
            bic: sourceAccount.bic,
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
