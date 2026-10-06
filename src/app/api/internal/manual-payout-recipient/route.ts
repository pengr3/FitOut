import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { MANUAL_TEST_BOOKING_ID } from "@/lib/payments/manual-host-payout";
import {
  frozenRecipientFingerprint, manualRecipientReadbackTokenMatches,
} from "@/lib/payments/manual-payout-recipient-readback";
import { decryptPayoutRecipientValue } from "@/lib/payout-recipient-crypto";

const NO_STORE = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

/** Production-only, one-booking readback. Never returns the encryption key or another host's details. */
export async function POST(request: Request) {
  if (process.env.VERCEL_ENV !== "production" ||
    !manualRecipientReadbackTokenMatches(request.headers.get("authorization"))) {
    return new Response(null, { status: 404, headers: NO_STORE });
  }
  const rows = (await db.execute(sql`
    SELECT a.institution_bic AS bic, a.account_name_ciphertext AS "nameCiphertext",
      a.account_number_ciphertext AS "numberCiphertext"
    FROM manual_host_payout_attempt a
    JOIN host_payout_ledger l ON l.id = a.claim_id
    WHERE a.booking_id = ${MANUAL_TEST_BOOKING_ID} AND l.booking_id = ${MANUAL_TEST_BOOKING_ID}
      AND l.kind = 'payout' AND a.state IN ('prepared', 'submitted')
      AND l.state IN ('held', 'processing', 'paid')
    LIMIT 1
  `)) as unknown as Array<{
    bic: string; nameCiphertext: string; numberCiphertext: string;
  }>;
  const frozen = rows[0];
  if (!frozen) return new Response(null, { status: 404, headers: NO_STORE });
  try {
    return Response.json({
      bic: frozen.bic,
      name: decryptPayoutRecipientValue(frozen.nameCiphertext),
      number: decryptPayoutRecipientValue(frozen.numberCiphertext),
      fingerprint: frozenRecipientFingerprint(frozen),
    }, { headers: NO_STORE });
  } catch {
    return new Response(null, { status: 503, headers: NO_STORE });
  }
}
