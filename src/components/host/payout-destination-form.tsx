"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePayoutDestination } from "@/app/actions/payout-destination";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PayoutInstitutionOption = { name: string; bic: string };

export function PayoutDestinationForm({
  institutions,
  pendingDestination,
  confirmedDestination,
  onAttest,
}: {
  institutions: PayoutInstitutionOption[];
  pendingDestination?: { institutionName: string; accountLast4: string };
  confirmedDestination?: { institutionName: string; accountLast4: string };
  onAttest?: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [institutionBic, setInstitutionBic] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [attested, setAttested] = useState(false);
  const [editing, setEditing] = useState(!confirmedDestination);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await savePayoutDestination({ institutionBic, accountName, accountNumber });
      if (result.ok) {
        setAccountName("");
        setAccountNumber("");
        setNotice("Saved. Confirm the destination below before it can be used in an approved payout.");
        router.refresh();
      } else {
        setNotice(result.error);
      }
    });
  }

  function attestDestination() {
    if (!onAttest || !attested) return;
    setNotice(null);
    startTransition(async () => {
      const result = await onAttest();
      if (result.ok) {
        setNotice("Confirmed. This destination is available for an approved payout.");
        router.refresh();
      } else {
        setNotice(result.error ?? "We couldn't confirm the destination. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-5">
      {confirmedDestination && !editing ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Need to use a different bank or e-wallet? Replacing this destination pauses it until you confirm the new details.</p>
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>Change payout destination</Button>
        </div>
      ) : null}
      {editing ? (
        <form onSubmit={submit} className="space-y-5">
          {confirmedDestination ? <p className="text-sm text-muted-foreground">Saving new details replaces this destination. The replacement will need your confirmation before it can be used.</p> : null}
          <div className="space-y-2">
            <Label htmlFor="payout-institution">Bank or e-wallet</Label>
            <Select value={institutionBic} onValueChange={setInstitutionBic} disabled={pending}>
              <SelectTrigger id="payout-institution">
                <SelectValue placeholder="Choose your bank or e-wallet" />
              </SelectTrigger>
              <SelectContent>
                {institutions.map((institution) => (
                  <SelectItem key={institution.bic} value={institution.bic}>
                    {institution.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-account-name">Name on the account</Label>
            <Input id="payout-account-name" value={accountName} onChange={(event) => setAccountName(event.target.value)} autoComplete="name" disabled={pending} maxLength={100} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-account-number">Account or wallet number</Label>
            <Input id="payout-account-number" value={accountNumber} onChange={(event) => setAccountNumber(event.target.value.replace(/\D/g, ""))} inputMode="numeric" autoComplete="off" disabled={pending} minLength={6} maxLength={20} required />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending || institutions.length === 0}>
              {pending ? "Saving…" : "Save payout destination"}
            </Button>
            {confirmedDestination ? <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>Cancel</Button> : null}
          </div>
          {pendingDestination && onAttest ? (
            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Checkbox id="payout-destination-attestation" checked={attested} onCheckedChange={(checked) => setAttested(checked === true)} disabled={pending} />
                <Label htmlFor="payout-destination-attestation" className="leading-5">
                  I confirm that {pendingDestination.institutionName} ending in {pendingDestination.accountLast4} is my payout destination and that its account details are correct. I understand FitOut cannot recover a payout sent to incorrect details.
                </Label>
              </div>
              <Button type="button" variant="secondary" onClick={attestDestination} disabled={pending || !attested}>
                {pending ? "Confirming…" : "Confirm payout destination"}
              </Button>
            </div>
          ) : null}
        </form>
      ) : null}
      {notice ? <p className="text-sm text-muted-foreground" role="status">{notice}</p> : null}
    </div>
  );
}
