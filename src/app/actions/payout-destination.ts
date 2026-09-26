"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hostPayout, hostPayoutDestination, user } from "@/lib/db/schema";
import { decryptPayoutRecipientValue, encryptPayoutRecipientValue } from "@/lib/payout-recipient-crypto";
import { listReceivingInstitutions } from "@/lib/paymongo";
import { rateLimit } from "@/lib/rate-limit";
import { hostPayoutRecipientSchema, type HostPayoutRecipientInput } from "@/lib/validation/payout-recipient";
import { requireOpsMutationOrigin, requireStaff } from "@/lib/ops/staff";
import { z } from "zod";

export type PayoutDestinationResult = { ok: true } | { ok: false; error: string };

const DESTINATION_RATE_LIMIT = { window: 60, max: 5 } as const;

async function currentHost(): Promise<{ userId: string } | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;
  if (!userId) return null;
  const [row] = await db.select({ canHost: user.canHost }).from(user).where(eq(user.id, userId));
  return row?.canHost ? { userId } : null;
}

/**
 * Stores a host-selected bank/e-wallet destination in encrypted form.  The provider directory is
 * consulted before any write so a free-form BIC never becomes a release target. This action always
 * resets the destination to pending: the host must explicitly attest after every change.
 */
export async function savePayoutDestination(
  raw: HostPayoutRecipientInput,
): Promise<PayoutDestinationResult> {
  const host = await currentHost();
  if (!host) return { ok: false, error: "Start hosting before setting up payouts." };

  const limit = rateLimit(`payout-destination:${host.userId}`, DESTINATION_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: host.userId,
      action: "savePayoutDestination",
      outcome: "denied",
      meta: { reason: "rate_limit", retryAfter: limit.retryAfter },
    });
    return { ok: false, error: "Too many attempts. Please try again in a moment." };
  }

  const parsed = hostPayoutRecipientSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Check the payout details and try again." };

  let institution: { name: string; bic: string } | undefined;
  try {
    institution = (await listReceivingInstitutions()).find(
      (candidate) => candidate.bic === parsed.data.institutionBic,
    );
  } catch {
    // A directory outage must not leave a destination that cannot be confidently released to.
    return { ok: false, error: "We can't verify payout institutions right now. Please try again later." };
  }
  if (!institution) return { ok: false, error: "Choose a bank or e-wallet from the list." };

  try {
    const accountNameCiphertext = encryptPayoutRecipientValue(parsed.data.accountName);
    const accountNumberCiphertext = encryptPayoutRecipientValue(parsed.data.accountNumber);
    await db.transaction(async (tx) => {
      await tx.insert(hostPayout).values({ userId: host.userId }).onConflictDoNothing();
      await tx
        .insert(hostPayoutDestination)
        .values({
          userId: host.userId,
          institutionBic: institution.bic,
          institutionName: institution.name,
          accountNameCiphertext,
          accountNumberCiphertext,
          accountLast4: parsed.data.accountNumber.slice(-4),
          verificationStatus: "pending",
          verifiedAt: null,
          verifiedBy: null,
        })
        .onConflictDoUpdate({
          target: hostPayoutDestination.userId,
          set: {
            institutionBic: institution.bic,
            institutionName: institution.name,
            accountNameCiphertext,
            accountNumberCiphertext,
            accountLast4: parsed.data.accountNumber.slice(-4),
            verificationStatus: "pending",
            verifiedAt: null,
            verifiedBy: null,
            updatedAt: new Date(),
          },
        });
      // A changed destination immediately stops new booking acceptance.  Never derive an enabled
      // state from a redirect, UI value, or bank-directory membership alone.
      await tx
        .update(hostPayout)
        .set({ payoutsEnabled: false, activationStatus: "pending", onboardingComplete: false })
        .where(eq(hostPayout.userId, host.userId));
    });
  } catch {
    await recordAudit({ actorId: host.userId, action: "savePayoutDestination", outcome: "error", meta: { reason: "storage" } });
    return { ok: false, error: "We couldn't save the payout destination. Please try again." };
  }

  await recordAudit({ actorId: host.userId, action: "savePayoutDestination", outcome: "ok" });
  revalidatePath("/host");
  revalidatePath("/host/earnings");
  revalidatePath("/host/payouts");
  return { ok: true };
}

/**
 * Records the host's explicit confirmation that the encrypted destination they entered is their own
 * and accurate. This is deliberately distinct from staff verification: it enables no bookings and
 * does not move money. A later bounded-release decision still controls `payoutsEnabled`.
 */
export async function attestPayoutDestination(): Promise<PayoutDestinationResult> {
  const host = await currentHost();
  if (!host) return { ok: false, error: "Start hosting before confirming a payout destination." };

  const limit = rateLimit(`payout-destination-attest:${host.userId}`, DESTINATION_RATE_LIMIT);
  if (!limit.ok) return { ok: false, error: "Too many attempts. Please try again in a moment." };

  const [destination] = await db
    .select({
      accountNameCiphertext: hostPayoutDestination.accountNameCiphertext,
      accountNumberCiphertext: hostPayoutDestination.accountNumberCiphertext,
      verificationStatus: hostPayoutDestination.verificationStatus,
    })
    .from(hostPayoutDestination)
    .where(eq(hostPayoutDestination.userId, host.userId));
  if (!destination || destination.verificationStatus !== "pending") {
    return { ok: false, error: "That payout destination is no longer awaiting confirmation." };
  }

  try {
    // Integrity check only. The recipient values remain server-local and never cross this boundary.
    decryptPayoutRecipientValue(destination.accountNameCiphertext);
    decryptPayoutRecipientValue(destination.accountNumberCiphertext);
  } catch {
    await recordAudit({ actorId: host.userId, action: "attestPayoutDestination", outcome: "error", meta: { reason: "invalid_ciphertext" } });
    return { ok: false, error: "The stored destination could not be confirmed. Please save it again." };
  }

  const updated = await db
    .update(hostPayoutDestination)
    .set({ verificationStatus: "host_attested", verificationReference: "host_attestation", updatedAt: new Date() })
    .where(and(eq(hostPayoutDestination.userId, host.userId), eq(hostPayoutDestination.verificationStatus, "pending")))
    .returning({ userId: hostPayoutDestination.userId });
  if (!updated[0]) return { ok: false, error: "That payout destination is no longer awaiting confirmation." };

  await recordAudit({ actorId: host.userId, action: "attestPayoutDestination", outcome: "ok", meta: { status: "host_attested" } });
  revalidatePath("/host");
  revalidatePath("/host/earnings");
  revalidatePath("/host/payouts");
  return { ok: true };
}

/**
 * Staff-only release gate for a destination that FitOut has independently confirmed with its host.
 * The action reads the encrypted fields only to prove the ciphertext is intact; it never returns,
 * logs, audits, or renders either value.  The status flip and bookability gate update share one
 * transaction, so an enabled host always has a verified recipient at the same commit boundary.
 */
const payoutDestinationVerificationSchema = z.object({
  hostUserId: z.string().min(1).max(128),
  // A staff member must record the independently checked procedure/ticket/receipt reference. This is
  // deliberately not an account number or holder name and is never supplied by the host.
  verificationReference: z.string().trim().min(8).max(128).regex(/^[A-Za-z0-9._:/-]+$/),
});

export async function verifyPayoutDestination(
  raw: z.infer<typeof payoutDestinationVerificationSchema>,
): Promise<PayoutDestinationResult> {
  await requireOpsMutationOrigin();
  const staff = await requireStaff();
  const parsed = payoutDestinationVerificationSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That payout destination is no longer available." };
  const { hostUserId, verificationReference } = parsed.data;

  const [destination] = await db
    .select({
      accountNameCiphertext: hostPayoutDestination.accountNameCiphertext,
      accountNumberCiphertext: hostPayoutDestination.accountNumberCiphertext,
      verificationStatus: hostPayoutDestination.verificationStatus,
    })
    .from(hostPayoutDestination)
    .where(eq(hostPayoutDestination.userId, hostUserId));
  if (!destination || destination.verificationStatus !== "pending") {
    return { ok: false, error: "That payout destination is no longer available." };
  }

  try {
    // Authentication check only.  Both strings remain lexical locals and intentionally do not cross a
    // log, audit, response, component prop, or provider call on this review path.
    decryptPayoutRecipientValue(destination.accountNameCiphertext);
    decryptPayoutRecipientValue(destination.accountNumberCiphertext);
  } catch {
    await recordAudit({ actorId: staff.id, action: "verifyPayoutDestination", outcome: "error", meta: { reason: "invalid_ciphertext" } });
    return { ok: false, error: "The stored destination could not be verified." };
  }

  const changed = await db.transaction(async (tx) => {
    const updated = await tx
      .update(hostPayoutDestination)
      .set({
        verificationStatus: "verified",
        verificationReference,
        verifiedAt: new Date(),
        verifiedBy: staff.id,
      })
      .where(and(eq(hostPayoutDestination.userId, hostUserId), eq(hostPayoutDestination.verificationStatus, "pending")))
      .returning({ userId: hostPayoutDestination.userId });
    if (!updated[0]) return false;
    await tx
      .insert(hostPayout)
      .values({ userId: hostUserId, payoutsEnabled: true, activationStatus: "activated", onboardingComplete: true })
      .onConflictDoUpdate({
        target: hostPayout.userId,
        set: { payoutsEnabled: true, activationStatus: "activated", onboardingComplete: true },
      });
    return true;
  });
  if (!changed) return { ok: false, error: "That payout destination is no longer available." };

  await recordAudit({ actorId: staff.id, action: "verifyPayoutDestination", outcome: "ok", meta: { targetId: hostUserId, verificationReference } });
  revalidatePath("/host");
  revalidatePath("/host/earnings");
  return { ok: true };
}
