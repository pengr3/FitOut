import "server-only";
import type { DbConn } from "@/lib/availability/read-model";
export type ProviderReader = { listPayouts(after?: string): Promise<unknown>; getPayout(id: string): Promise<unknown>; listTransactions(payoutId: string, after?: string): Promise<unknown>; };
export type SettlementAccountEvidence = { paymentField: "id" | "attributes.payment_id"; transactionType: "payment" | "split_payment"; walletAccountNumber: string; walletBankId: string; organizationId: string; liveMode: true; };
export type RefreshResult = { bookingId: string; state: "proved" | "unproved" | "exception"; reason?: string };
export async function refreshBookingSettlement(bookingId: string, _reader: ProviderReader, _account: SettlementAccountEvidence, _dbConn: DbConn): Promise<RefreshResult> { return { bookingId, state: "exception", reason: "not_implemented" }; }
