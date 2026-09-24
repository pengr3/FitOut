import { z } from "zod";

/** Host-owned external payout destination. The amount is intentionally absent: it is ledger-frozen. */
export const hostPayoutRecipientSchema = z.object({
  institutionBic: z.string().trim().min(1).max(32),
  accountName: z.string().trim().min(1, "Enter the name on the account.").max(100),
  accountNumber: z
    .string()
    .regex(/^\d{6,20}$/, "Enter the account number as 6–20 digits, with no spaces or dashes."),
});

export type HostPayoutRecipientInput = z.infer<typeof hostPayoutRecipientSchema>;
