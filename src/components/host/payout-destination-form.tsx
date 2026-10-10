"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { savePayoutDestination } from "@/app/actions/payout-destination";
import type { HostPayoutRecipientInput } from "@/lib/validation/payout-recipient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PayoutInstitutionOption = { name: string; bic: string };
type Notice = { kind: "success" | "error"; message: string };

export function PayoutDestinationForm({
  institutions,
  pendingDestination,
  confirmedDestination,
  hostApproved,
  onAttest,
}: {
  institutions: PayoutInstitutionOption[];
  pendingDestination?: { institutionName: string; accountLast4: string };
  confirmedDestination?: { institutionName: string; accountLast4: string };
  hostApproved: boolean;
  onAttest: (details: HostPayoutRecipientInput) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<"save" | "confirm" | null>(null);
  const [institutionBic, setInstitutionBic] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [attested, setAttested] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [confirmedNow, setConfirmedNow] = useState(false);
  const [savedDetails, setSavedDetails] = useState<HostPayoutRecipientInput | null>(null);
  const [editing, setEditing] = useState(!confirmedDestination);
  const reviewMatchesSaved = savedDetails?.institutionBic === institutionBic && savedDetails.accountName === accountName && savedDetails.accountNumber === accountNumber;
  const isConfirmed = confirmedNow || Boolean(confirmedDestination);

  function changeDetails() {
    setSavedDetails(null);
    setAttested(false);
    setNotice(null);
    setReviewError(null);
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    setBusyAction("save");
    startTransition(async () => {
      try {
        const details = { institutionBic, accountName, accountNumber };
        const result = await savePayoutDestination(details);
        if (result.ok) {
          setSavedDetails(details);
          setAttested(false);
          setReviewError(null);
          setReviewOpen(true);
          router.refresh();
        } else {
          setNotice({ kind: "error", message: result.error });
        }
      } catch {
        setNotice({ kind: "error", message: "We couldn't save the payout destination. Please try again." });
      } finally {
        setBusyAction(null);
      }
    });
  }

  function attestDestination() {
    if (!attested || !reviewMatchesSaved) return;
    setReviewError(null);
    setBusyAction("confirm");
    startTransition(async () => {
      try {
        const result = await onAttest({ institutionBic, accountName, accountNumber });
        if (result.ok) {
          setReviewOpen(false);
          setInstitutionBic("");
          setAccountName("");
          setAccountNumber("");
          setSavedDetails(null);
          setAttested(false);
          setConfirmedNow(true);
          setEditing(false);
          setNotice({ kind: "success", message: "Payout destination confirmed. It can receive an eligible payout after the booking and payout checks are complete." });
          router.refresh();
        } else {
          setReviewError(result.error ?? "We couldn't confirm the destination. Please try again.");
        }
      } catch {
        setReviewError("We couldn't confirm the destination. Please try again.");
      } finally {
        setBusyAction(null);
      }
    });
  }

  return (
    <div className="space-y-5">
      {notice && (notice.kind === "error" || !confirmedDestination) ? (
        <Alert variant={notice.kind === "error" ? "destructive" : "default"} role={notice.kind === "error" ? "alert" : "status"}>
          <AlertTitle>{notice.kind === "error" ? "Destination not saved" : "Destination confirmed"}</AlertTitle>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}
      {isConfirmed && !editing ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Need to use a different bank or e-wallet? Replacing this destination pauses payouts until you confirm the new details.</p>
          <Button type="button" variant="outline" onClick={() => setEditing(true)}>Change payout destination</Button>
        </div>
      ) : null}
      {editing ? (
        <form onSubmit={submit} className="space-y-5">
          {isConfirmed ? <p className="text-sm text-muted-foreground">Saving new details replaces this destination. The replacement will need your confirmation before it can be used.</p> : null}
          {pendingDestination && !savedDetails ? <p className="text-sm text-muted-foreground">A destination is saved, but its full number is hidden. Enter and save the complete details again to review and confirm it.</p> : null}
          <div className="space-y-2">
            <Label htmlFor="payout-institution">Bank or e-wallet</Label>
            <Select value={institutionBic} onValueChange={(value) => { setInstitutionBic(value); changeDetails(); }} disabled={pending}>
              <SelectTrigger id="payout-institution"><SelectValue placeholder="Choose your bank or e-wallet" /></SelectTrigger>
              <SelectContent>{institutions.map((institution) => <SelectItem key={institution.bic} value={institution.bic}>{institution.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-account-name">Name on the account</Label>
            <Input id="payout-account-name" value={accountName} onChange={(event) => { setAccountName(event.target.value); changeDetails(); }} autoComplete="name" disabled={pending} maxLength={100} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout-account-number">Account or wallet number</Label>
            <Input id="payout-account-number" value={accountNumber} onChange={(event) => { setAccountNumber(event.target.value.replace(/\D/g, "")); changeDetails(); }} inputMode="numeric" autoComplete="off" disabled={pending} minLength={6} maxLength={20} required />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={pending || institutions.length === 0}>{busyAction === "save" ? "Saving…" : "Save payout destination"}</Button>
            {savedDetails && reviewMatchesSaved ? <Button type="button" variant="outline" onClick={() => { setReviewError(null); setReviewOpen(true); }} disabled={pending}>Review saved details</Button> : null}
            {isConfirmed ? <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>Cancel</Button> : null}
          </div>
        </form>
      ) : null}
      <Dialog open={reviewOpen} onOpenChange={(open) => { if (!pending) setReviewOpen(open); }}>
        <DialogContent className="sm:max-w-lg" showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Review payout destination</DialogTitle>
            <DialogDescription>Check every detail before confirming. If anything is wrong, go back and edit it.</DialogDescription>
          </DialogHeader>
          <dl className="space-y-3 rounded-lg border p-4 text-sm">
            <div><dt className="text-muted-foreground">Bank or e-wallet</dt><dd className="font-medium">{institutions.find((institution) => institution.bic === institutionBic)?.name}</dd></div>
            <div><dt className="text-muted-foreground">Name on the account</dt><dd className="font-medium">{accountName}</dd></div>
            <div><dt className="text-muted-foreground">Account or wallet number</dt><dd className="font-medium break-all">{accountNumber}</dd></div>
          </dl>
          <div className="flex items-start gap-3">
            <Checkbox id="payout-destination-attestation" checked={attested} onCheckedChange={(checked) => setAttested(checked === true)} disabled={pending} />
            <Label htmlFor="payout-destination-attestation" className="leading-5">I reviewed the complete bank or e-wallet, account name, and account number above. They belong to me and are correct. Incorrect details may delay or prevent payment, and some transfers cannot be recovered.</Label>
          </div>
          {!hostApproved ? <Alert><AlertTitle>Hosting approval needed</AlertTitle><AlertDescription>Your details are saved. You can confirm them after your hosting account is approved. <Link href="/host/verify">Check verification status</Link>.</AlertDescription></Alert> : null}
          {reviewError ? <Alert variant="destructive" role="alert"><AlertTitle>Destination not confirmed</AlertTitle><AlertDescription>{reviewError}</AlertDescription></Alert> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)} disabled={pending}>Back to edit</Button>
            <Button type="button" onClick={attestDestination} disabled={pending || !hostApproved || !attested || !reviewMatchesSaved}>{busyAction === "confirm" ? "Confirming…" : "Confirm payout destination"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
