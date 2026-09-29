import type { DbConn } from "@/lib/availability/read-model";
export type SettlementObservation = {
  paymentId: string; payoutId: string; transactionId: string; transactionType: "payment" | "split_payment";
  currency: string; liveMode: boolean; providerStatus: string; destinationMatched: boolean;
  paginationComplete: boolean; mappingVerified: boolean; providerStatusAt: Date; verifiedAt: Date;
};
export function isCorrelatedSettlement(_observation: SettlementObservation, _paymentId: string, _currency: string, _liveMode: boolean): boolean { return false; }
export async function recordSettlementObservation(_bookingId: string, _observation: SettlementObservation, _dbConn: DbConn): Promise<void> { throw new Error("not implemented"); }
export async function currentSettlementProof(_bookingId: string, _dbConn: DbConn): Promise<null> { throw new Error("not implemented"); }
