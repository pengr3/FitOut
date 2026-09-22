import "server-only";

export type CheckoutStopCommand =
  | { kind: "inspect"; checkoutSessionId: string }
  | { kind: "expire"; checkoutSessionId: string; confirmed: true };

export type CheckoutStopParseResult =
  | { ok: true; command: CheckoutStopCommand }
  | { ok: false; error: string };

export type CheckoutStopDependencies = {
  getCheckoutSession: (id: string) => Promise<{ status: string }>;
  expireCheckoutSession: (id: string) => Promise<{ id: string }>;
};

export type CheckoutStopOutcome =
  | { kind: "inspected"; status: string }
  | { kind: "not-active"; status: string }
  | { kind: "expired" }
  | { kind: "verification-failed"; status: string };

const CHECKOUT_SESSION_ID = /^cs_[A-Za-z0-9]+$/;

/**
 * Parse the deliberately tiny operator interface for stopping one known Checkout Session.
 *
 * `expire` has no implicit confirmation: an operator must write `--confirm` after reviewing the
 * read-only `inspect` output. This command is intentionally session-scoped. It cannot enumerate,
 * select, or stop more than one Checkout Session.
 */
export function parseCheckoutStopArgs(argv: string[]): CheckoutStopParseResult {
  const [verb, checkoutSessionId, confirmation, ...extra] = argv;
  if (extra.length > 0 || !verb || !checkoutSessionId || !CHECKOUT_SESSION_ID.test(checkoutSessionId)) {
    return {
      ok: false,
      error: "Usage: inspect <checkout-session-id> | expire <checkout-session-id> --confirm",
    };
  }

  if (verb === "inspect" && confirmation === undefined) {
    return { ok: true, command: { kind: "inspect", checkoutSessionId } };
  }
  if (verb === "expire" && confirmation === "--confirm") {
    return { ok: true, command: { kind: "expire", checkoutSessionId, confirmed: true } };
  }

  return {
    ok: false,
    error: "Usage: inspect <checkout-session-id> | expire <checkout-session-id> --confirm",
  };
}

/**
 * Perform one read-only inspection or one explicitly-confirmed provider expiry, then read back the
 * provider state. A non-active or unrecognised state is never treated as proof of expiry.
 */
export async function runCheckoutStop(
  command: CheckoutStopCommand,
  deps: CheckoutStopDependencies,
): Promise<CheckoutStopOutcome> {
  if (command.kind === "inspect") {
    const session = await deps.getCheckoutSession(command.checkoutSessionId);
    return { kind: "inspected", status: session.status };
  }

  const before = await deps.getCheckoutSession(command.checkoutSessionId);
  if (before.status !== "active") return { kind: "not-active", status: before.status };

  await deps.expireCheckoutSession(command.checkoutSessionId);
  const after = await deps.getCheckoutSession(command.checkoutSessionId);
  if (after.status !== "expired") return { kind: "verification-failed", status: after.status };

  return { kind: "expired" };
}
