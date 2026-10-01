"use server";

import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { recordAudit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hostPayout, hostPayoutDestination, hostVerification, user } from "@/lib/db/schema";
import { decryptPayoutRecipientValue, encryptPayoutRecipientValue } from "@/lib/payout-recipient-crypto";
import { listReceivingInstitutions } from "@/lib/paymongo";
import { rateLimit } from "@/lib/rate-limit";
import { hostPayoutRecipientSchema, type HostPayoutRecipientInput } from "@/lib/validation/payout-recipient";

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
        .set({ payoutsEnabled: false, onboardingComplete: false })
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
 * The host confirms the complete values they just entered. The stored ciphertext must still match
 * those values, the institution must remain supported, and host identity must be approved. This
 * opens the destination gate, but does not create a PayMongo transfer.
 */
export async function attestPayoutDestination(raw: HostPayoutRecipientInput): Promise<PayoutDestinationResult> {
  const host = await currentHost();
  if (!host) return { ok: false, error: "Start hosting before confirming a payout destination." };

  const limit = rateLimit(`payout-destination-attest:${host.userId}`, DESTINATION_RATE_LIMIT);
  if (!limit.ok) return { ok: false, error: "Too many attempts. Please try again in a moment." };

  const parsed = hostPayoutRecipientSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Review all payout details and try again." };

  const [destination] = await db
    .select({
      institutionBic: hostPayoutDestination.institutionBic,
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
    if (
      destination.institutionBic !== parsed.data.institutionBic ||
      decryptPayoutRecipientValue(destination.accountNameCiphertext) !== parsed.data.accountName ||
      decryptPayoutRecipientValue(destination.accountNumberCiphertext) !== parsed.data.accountNumber
    ) {
      return { ok: false, error: "The saved destination changed. Review and save the details again." };
    }
  } catch {
    await recordAudit({ actorId: host.userId, action: "attestPayoutDestination", outcome: "error", meta: { reason: "invalid_ciphertext" } });
    return { ok: false, error: "The stored destination could not be confirmed. Please save it again." };
  }

  try {
    const institutions = await listReceivingInstitutions();
    if (!institutions.some((institution) => institution.bic === destination.institutionBic)) {
      return { ok: false, error: "That bank or e-wallet is no longer available. Choose another destination." };
    }
  } catch {
    return { ok: false, error: "We can't check payout institutions right now. Please try again later." };
  }

  const enabled = await db.transaction(async (tx) => {
    const updated = (await tx.execute(sql`
      UPDATE host_payout_destination destination
      SET verification_status = 'host_attested',
          verification_reference = 'host_attestation',
          updated_at = now()
      WHERE destination.user_id = ${host.userId}
        AND destination.verification_status = 'pending'
        AND destination.institution_bic = ${destination.institutionBic}
        AND destination.account_name_ciphertext = ${destination.accountNameCiphertext}
        AND destination.account_number_ciphertext = ${destination.accountNumberCiphertext}
        AND EXISTS (
          SELECT 1 FROM host_verification verification
          WHERE verification.user_id = destination.user_id
            AND verification.status IN ('approved', 'grandfathered')
        )
        AND NOT EXISTS (
          SELECT 1 FROM host_payout payout
          WHERE payout.user_id = destination.user_id AND payout.activation_status = 'declined'
        )
      RETURNING destination.user_id AS "userId"
    `)) as unknown as { userId: string }[];
    if (!updated[0]) return false;
    await tx.insert(hostPayout).values({ userId: host.userId, payoutsEnabled: true, onboardingComplete: true })
      .onConflictDoUpdate({ target: hostPayout.userId, set: { payoutsEnabled: true, onboardingComplete: true } });
    return true;
  });
  if (!enabled) {
    // Keep the guarded UPDATE as the authority. These owner-scoped reads only explain why it
    // matched no row, so a host is not left retrying an approval gate they cannot fix here.
    const [[verification], [payout]] = await Promise.all([
      db.select({ status: hostVerification.status }).from(hostVerification).where(eq(hostVerification.userId, host.userId)),
      db.select({ activationStatus: hostPayout.activationStatus }).from(hostPayout).where(eq(hostPayout.userId, host.userId)),
    ]);
    if (verification?.status !== "approved" && verification?.status !== "grandfathered") {
      return { ok: false, error: "Your payout details were saved, but your hosting account must be approved before you can confirm them. Check your hosting verification status." };
    }
    if (payout?.activationStatus === "declined") {
      return { ok: false, error: "Your payout details were saved, but payouts are unavailable for this account. Contact support for help." };
    }
    return { ok: false, error: "Your saved payout details changed. Review and save them again before confirming." };
  }

  await recordAudit({ actorId: host.userId, action: "attestPayoutDestination", outcome: "ok", meta: { status: "host_attested" } });
  revalidatePath("/host");
  revalidatePath("/host/earnings");
  revalidatePath("/host/payouts");
  return { ok: true };
}
