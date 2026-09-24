"use client";

import { useState, useTransition } from "react";
import { savePayoutDestination } from "@/app/actions/payout-destination";
import { Button } from "@/components/ui/button";
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

export function PayoutDestinationForm({ institutions }: { institutions: PayoutInstitutionOption[] }) {
  const [pending, startTransition] = useTransition();
  const [institutionBic, setInstitutionBic] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await savePayoutDestination({ institutionBic, accountName, accountNumber });
      if (result.ok) {
        setAccountName("");
        setAccountNumber("");
        setNotice("Saved. FitOut will confirm this destination before your listings can accept bookings.");
      } else {
        setNotice(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
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
      <Button type="submit" disabled={pending || institutions.length === 0}>
        {pending ? "Saving…" : "Save payout destination"}
      </Button>
      {notice ? <p className="text-sm text-muted-foreground" role="status">{notice}</p> : null}
    </form>
  );
}
