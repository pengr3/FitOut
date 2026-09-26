// A shell-only operator tool for the one-use PHP 20 controlled-checkout grant. It never calls PayMongo,
// changes host payout state, or opens broad availability. Expiring a provider checkout, if one was already
// created, is a separate deliberate operation through `ops:stop-checkout`.

import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, gt, isNull } from "drizzle-orm";

import { audit, controlledCheckoutGrant } from "@/lib/db/schema";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";
const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
const db = drizzle(sql);

const MAX_AMOUNT_CENTS = 2_000;
const MAX_WINDOW_MS = 60 * 60 * 1_000;

const USAGE = `Usage:
  npm run ops:controlled-checkout -- grant --listing-id <id> --booker-id <id> --expires-at <ISO> --authorization-ref <opaque-reference> --by "<operator>"
  npm run ops:controlled-checkout -- revoke --grant-id <id> --by "<operator>"

Grant creates exactly one PHP 20.00 maximum, one-use exception. It is only valid for a published,
ops-approved exclusive listing and an approved host; it substitutes solely for host payout activation.
The expiration must be in the future and no more than 60 minutes away. It does not send money or create
a PayMongo checkout. Do not place or confirm the hold without fresh action-time authorization.`;

type Flags = Record<string, string>;

function parseFlags(argv: string[]): Flags | null {
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--") || flags[key]) return null;
    flags[key] = value;
  }
  return flags;
}

function validOpaqueReference(value: string): boolean {
  return value.length >= 6 && value.length <= 160 && !/[\r\n]/.test(value);
}

async function grant(flags: Flags): Promise<void> {
  const listingId = flags["--listing-id"];
  const bookerId = flags["--booker-id"];
  const expiresRaw = flags["--expires-at"];
  const authorizationReference = flags["--authorization-ref"];
  const by = flags["--by"];
  if (!listingId || !bookerId || !expiresRaw || !authorizationReference || !by || !validOpaqueReference(authorizationReference)) {
    throw new Error("Missing or invalid grant fields.");
  }
  const expiresAt = new Date(expiresRaw);
  const now = Date.now();
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= now || expiresAt.getTime() > now + MAX_WINDOW_MS) {
    throw new Error("Expiry must be a valid future instant within 60 minutes.");
  }

  const id = randomUUID();
  await db.transaction(async (tx) => {
    const active = await tx
      .select({ id: controlledCheckoutGrant.id })
      .from(controlledCheckoutGrant)
      .where(
        and(
          eq(controlledCheckoutGrant.listingId, listingId),
          eq(controlledCheckoutGrant.bookerId, bookerId),
          isNull(controlledCheckoutGrant.consumedAt),
          isNull(controlledCheckoutGrant.revokedAt),
          gt(controlledCheckoutGrant.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (active.length > 0) throw new Error("An active controlled-checkout grant already exists for this listing and booker.");

    await tx.insert(controlledCheckoutGrant).values({
      id,
      listingId,
      bookerId,
      authorizationReference,
      maxAmountCents: MAX_AMOUNT_CENTS,
      expiresAt,
    });
    await tx.insert(audit).values({
      id: randomUUID(),
      actorId: `operator:${by}`,
      action: "controlled_checkout_grant",
      outcome: "ok",
      meta: { authorizationReference, maxAmountCents: MAX_AMOUNT_CENTS },
    });
  });
  console.log(`Created one PHP 20.00 maximum controlled-checkout grant; it expires at ${expiresAt.toISOString()}.`);
}

async function revoke(flags: Flags): Promise<void> {
  const grantId = flags["--grant-id"];
  const by = flags["--by"];
  if (!grantId || !by) throw new Error("Missing revoke fields.");
  const updated = await db
    .update(controlledCheckoutGrant)
    .set({ revokedAt: new Date() })
    .where(and(eq(controlledCheckoutGrant.id, grantId), isNull(controlledCheckoutGrant.consumedAt), isNull(controlledCheckoutGrant.revokedAt)))
    .returning({ id: controlledCheckoutGrant.id });
  await db.insert(audit).values({
    id: randomUUID(),
    actorId: `operator:${by}`,
    action: "controlled_checkout_grant_revoke",
    outcome: updated.length === 1 ? "ok" : "denied",
    meta: { grantId },
  });
  if (updated.length !== 1) throw new Error("Grant was not active; nothing changed.");
  console.log("Controlled-checkout grant revoked. If a provider checkout already exists, expire it separately.");
}

async function main(): Promise<void> {
  const [command, ...tail] = process.argv.slice(2);
  const flags = parseFlags(tail);
  if (!flags || (command !== "grant" && command !== "revoke")) throw new Error(USAGE);
  if (command === "grant") await grant(flags);
  else await revoke(flags);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Controlled-checkout operator command failed.");
  process.exitCode = 1;
}).finally(async () => {
  await sql.end({ timeout: 5 });
});
