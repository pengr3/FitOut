/** Small, strict projection of PayMongo GET responses for a staff-only account readback. */
type Dict = Record<string, unknown>;
const obj = (value: unknown): Dict | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Dict : null;
const str = (value: unknown): string | null => typeof value === "string" && value.length > 0 ? value : null;
const cents = (value: unknown): number | null => Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : null;

export function readbackPage(raw: unknown): { data: Dict[]; next: string | null } | null {
  const root = obj(raw);
  const pagination = obj(root?.pagination);
  if (!Array.isArray(root?.data) || !pagination || !("next_cursor" in pagination)) return null;
  const next = pagination.next_cursor;
  if (next !== null && !str(next)) return null;
  const entries = root.data.map(obj);
  if (entries.some((entry) => !entry)) return null;
  return { data: entries as Dict[], next: next as string | null };
}

export type AccountReadback = {
  accountMappingMatched: boolean;
  reason: string | null;
  payout: {
    id: string; status: string | null; statusUpdatedAt: number | null;
    currency: string | null; organizationId: string | null; bankId: string | null;
    walletAccountNumber: string | null; netAmountCents: number | null;
  };
  transaction: {
    id: string; type: string | null; paymentField: "id" | "attributes.payment_id" | null;
    payoutId: string | null; organizationId: string | null; currency: string | null;
    amountCents: number | null; liveMode: boolean | null;
  } | null;
  wallet: {
    id: string; merchantId: string | null; accountNumber: string | null;
    accountName: string | null; status: string | null; liveMode: boolean | null;
    currency: string | null; provider: string | null; availableCents: number | null;
  } | null;
  transactionPagesComplete: boolean;
};

export function summarizeSettlementReadback(input: {
  paymentId: string; payoutId: string; currency: string; expectedAmountCents: number;
  payoutDetail: unknown; transactions: Dict[]; transactionPagesComplete: boolean; wallets: unknown;
}): AccountReadback | null {
  const payout = obj(obj(input.payoutDetail)?.data);
  const pa = obj(payout?.attributes);
  if (payout?.id !== input.payoutId || payout?.type !== "payout" || !pa) return null;
  const organizationId = str(obj(pa.organization)?.id);
  const walletAccountNumber = str(pa.bank_account_number);
  const bankId = str(pa.bank_id);
  const rawStatusAt = pa.status_updated_at;
  const statusUpdatedAt = Number.isSafeInteger(rawStatusAt) && (rawStatusAt as number) > 0 ? rawStatusAt as number : null;

  const matching = input.transactions.filter((transaction) => {
    const attrs = obj(transaction.attributes);
    return transaction.id === input.paymentId || attrs?.payment_id === input.paymentId;
  });
  const matched = matching.length === 1 ? matching[0] : null;
  const ta = obj(matched?.attributes);
  const paymentField: "id" | "attributes.payment_id" | null = matched?.id === input.paymentId ? "id" :
    ta?.payment_id === input.paymentId ? "attributes.payment_id" : null;
  const transaction = matched ? {
    id: str(matched.id) ?? "", type: str(matched.type), paymentField,
    payoutId: str(ta?.payout_id), organizationId: str(ta?.organization_id),
    currency: str(ta?.currency), amountCents: cents(ta?.amount),
    liveMode: typeof ta?.livemode === "boolean" ? ta.livemode : null,
  } : null;

  const walletRows = obj(input.wallets)?.data;
  if (!Array.isArray(walletRows)) return null;
  const walletMatches = walletRows.map(obj).filter((row) =>
    row && obj(row.account)?.account_number === walletAccountNumber,
  ) as Dict[];
  const walletRow = walletMatches.length === 1 ? walletMatches[0] : null;
  const account = obj(walletRow?.account);
  const balance = obj(walletRow?.balance);
  const wallet = walletRow ? {
    id: str(walletRow.id) ?? "", merchantId: str(walletRow.merchant_id),
    accountNumber: str(account?.account_number), accountName: str(account?.account_name),
    status: str(walletRow.status), liveMode: typeof walletRow.livemode === "boolean" ? walletRow.livemode : null,
    currency: str(account?.currency), provider: str(account?.provider),
    availableCents: cents(balance?.available),
  } : null;

  let reason: string | null = null;
  if (!input.transactionPagesComplete) reason = "transaction_pagination_incomplete";
  else if (matching.length !== 1) reason = matching.length === 0 ? "payment_transaction_missing" : "multiple_payment_transactions";
  else if (walletMatches.length !== 1) reason = "wallet_account_missing_or_ambiguous";
  else if (pa.status !== "deposited" || !statusUpdatedAt) reason = "payout_not_deposited";
  else if (pa.currency !== "PHP" || input.currency.toUpperCase() !== "PHP" || transaction?.currency?.toUpperCase() !== "PHP") reason = "currency_mismatch";
  else if (transaction?.amountCents !== input.expectedAmountCents) reason = "payment_amount_mismatch";
  else if (!organizationId || !bankId || !walletAccountNumber || !transaction?.id ||
    !wallet?.id || !wallet.accountName || wallet.availableCents === null) reason = "account_fields_missing";
  else if (transaction.type !== "payment" && transaction.type !== "split_payment") reason = "transaction_type_unrecognized";
  else if (transaction.payoutId !== input.payoutId || transaction.organizationId !== organizationId ||
    transaction.liveMode !== true || wallet.merchantId !== organizationId || wallet.liveMode !== true ||
    wallet.status !== "activated" || wallet.currency !== "PHP" || wallet.provider !== "paymongo" ||
    wallet.accountNumber !== walletAccountNumber) reason = "account_identity_mismatch";

  return {
    accountMappingMatched: reason === null, reason,
    payout: {
      id: input.payoutId, status: str(pa.status), statusUpdatedAt,
      currency: str(pa.currency), organizationId, bankId, walletAccountNumber,
      netAmountCents: cents(pa.net_amount),
    },
    transaction, wallet, transactionPagesComplete: input.transactionPagesComplete,
  };
}
