// D-72 COLLECT-AND-NEVER-STORE. The booker supplies these details on the cancellation screen and they pass
// STRAIGHT THROUGH to POST /v2/batch_transfers (createRefundTransfer). They are NEVER persisted — only the
// transfer id and a MASKED last-4 are kept. The no-persistence rule is LOAD-BEARING, not an optimisation:
// it is the user's own design intent ("I don't want to handle these people's financial information"), and
// PayMongo has no hosted recipient form (confirmed in two separate docs — the sender always supplies name,
// number and institution), so the form must be FitOut's and the storage-avoidance is what preserves that
// intent.
//
// RISK PROFILE: not card data, so PCI-DSS does NOT apply. It IS personal financial data under the PH Data
// Privacy Act (RA 10173). The material risk is PAYOUT REDIRECTION — a hijacked session changing the
// destination — mitigated by binding the destination to the authenticated booker AND that specific booking,
// and by server-freezing the amount.
//
// TWO validation layers, deliberately split:
//   - THIS schema is the SHAPE contract, shared by the client form (RHF + zodResolver, UX only) and the
//     server action (the re-validation that counts — never trust the client).
//   - `institutionBic` membership in the LIVE `listReceivingInstitutions()` set (T-07-99: never a free
//     string) is enforced SERVER-SIDE in cancelBookingAsBooker against the fetched list, and in the UI by
//     a Select populated only from that same list. A Zod schema cannot hold a live remote set, so the
//     membership check lives at the one boundary that fires the transfer.
//
// The 07-09 grep-tripwire discipline holds here too: there is NO money field in this schema — the refund
// amount is server-frozen at the quote, and a schema field for it would be the exact tampering vector
// T-07-94 names.

import { z } from "zod";

/** The D-72 refund destination — institution + account name + account number, nothing else. */
export const qrphRefundDestinationSchema = z.object({
  /** The receiving institution's BIC, picked from the live InstaPay list (membership checked server-side). */
  institutionBic: z.string().min(1, "Pick your bank or e-wallet."),
  /** The account holder's name as the institution knows it (1..100 — InstaPay carries it verbatim). */
  accountName: z
    .string()
    .trim()
    .min(1, "Enter the name on the account.")
    .max(100, "Account names are at most 100 characters."),
  /** Digits only, 6..20 — covers PH bank account numbers and e-wallet mobile-number formats. */
  accountNumber: z
    .string()
    .regex(/^\d{6,20}$/, "Enter the account number as 6–20 digits, no spaces or dashes."),
});

export type QrphRefundDestination = z.infer<typeof qrphRefundDestinationSchema>;
