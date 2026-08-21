"use client";

// The D-72 refund destination form (Plan 07-16, Branch B) — rendered on the cancel review page ONLY when
// `!isApiRefundable(paymentMethod)` and money is owed (the RSC makes that call; this component never
// decides it). QRPh cannot be API-refunded (settled 2026-07-23 — src/lib/payments/refund-rail.ts), so the
// refund goes out as an InstaPay transfer to an account the booker names HERE, once, for THIS refund.
//
// COLLECT AND NEVER STORE (the load-bearing D-72 rule, stated in full in src/lib/validation/qrph-refund.ts):
// these fields pass straight through to the transfer call and are never persisted — the copy below says so
// to the booker in plain words, and the server keeps only the transfer id and a masked last-4.
//
// Client RHF + zodResolver over the SAME schema the server re-validates with (UX only — the server's
// re-validation is the one that counts; it also checks the BIC against the live institution list, T-07-99).
// The institution Select is populated SERVER-SIDE from `listReceivingInstitutions()` and passed down as a
// prop, so the picker can only ever offer institutions the transfer endpoint accepts.
//
// COLOUR: neutral, deliberately — same rationale as cancel-confirm.tsx (07-UI-SPEC § 3). Cancelling is an
// expected lifecycle outcome; no coral, no destructive-red.

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  qrphRefundDestinationSchema,
  type QrphRefundDestination,
} from "@/lib/validation/qrph-refund";
import { cancelBookingAsBooker } from "@/app/actions/cancel-booking";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function RefundDestinationForm({
  bookingId,
  institutions,
}: {
  bookingId: string;
  /** The live InstaPay receiving institutions, fetched server-side — the ONLY options offered. */
  institutions: Array<{ name: string; bic: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  const form = useForm<QrphRefundDestination>({
    resolver: zodResolver(qrphRefundDestinationSchema),
    defaultValues: { institutionBic: "", accountName: "", accountNumber: "" },
  });

  async function onSubmit(values: QrphRefundDestination) {
    if (pending) return; // double-click guard, before the disabled attribute can apply
    setPending(true);
    try {
      const res = await cancelBookingAsBooker(bookingId, values);
      if (res.ok) {
        // STATE-08 (plan 13-05) — THE SAME CORRECTION AS `cancel-confirm.tsx`, ON THE SAME FLOW'S OTHER
        // BRANCH. This toast used to name the money and the destination account. That is the most
        // re-read sentence in the flow and it cannot ride a surface that removes itself on a timer; the
        // page this line navigates to renders it as durable content on its cancelled branch, with D-79's
        // wording. The toast is now a receipt for the click and nothing more.
        //
        // ⚠️ PLAN 13-18 — THE `notice` PATH USED TO BE EXEMPTED HERE, AND THE EXEMPTION WAS WRONG.
        // It read `res.notice` — set only when the cancellation succeeded but the money could NOT be
        // dispatched — and rendered it as a `toast.warning`, then navigated away from itself. That is
        // the single most must-read sentence this flow can produce: somebody's money did not come back.
        // The old reasoning was that the sentence was "a calm server-composed string rather than a
        // figure to retain", which mistook the ABSENCE of a number for the absence of a fact. STATE-08
        // does not split on whether a sentence contains a figure; it splits on whether the reader must
        // RETAIN it, and a booker who dismissed that toast had no way back to it anywhere in the app.
        //
        // The sentence now lives on the DESTINATION as durable page content — the booking detail page's
        // cancelled branch renders `ManualReturnNotice`, derived server-side from the operator-alert
        // audit rows those paths already write. `res.notice` is gone from the action entirely, so this
        // toast cannot be reintroduced by reading a field that no longer exists.
        //
        // WHAT REMAINS IS CORRECT UNDER THE SAME RULE. "Booking cancelled." is a receipt for the click:
        // non-terminal success, no money named, and the page it lands on states every fact durably. The
        // STATE-08 scan's own allow-list vocabulary is the model — a toast may announce that something
        // happened; it may not be the only place a fact lives.
        toast.success("Booking cancelled.");
        router.push(`/bookings/${bookingId}`);
        router.refresh();
      } else {
        toast.error(res.error);
        setPending(false);
      }
    } catch (e) {
      setPending(false);
      throw e;
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Where should your refund go?</h2>
          {/* The D-72 promise, in the booker's language. Do not soften "aren't stored" — it is the rule. */}
          <p className="text-xs text-muted-foreground">
            QR&nbsp;Ph payments can&apos;t be refunded back the way they came, so we send your refund
            straight to a bank or e-wallet account you choose. These details are used once, for this
            refund only, and aren&apos;t stored.
          </p>
        </div>

        <FormField
          control={form.control}
          name="institutionBic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bank or e-wallet</FormLabel>
              <Select value={field.value || ""} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full" aria-label="Refund bank or e-wallet">
                    <SelectValue placeholder="Pick your bank or e-wallet" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {institutions.map((i) => (
                    <SelectItem key={i.bic} value={i.bic}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="off"
                  placeholder="Name on the account"
                  aria-label="Refund account name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="accountNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account number</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="off"
                  inputMode="numeric"
                  placeholder="Digits only"
                  aria-label="Refund account number"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Neutral outline confirm + ghost back — the cancel-confirm.tsx colour rationale, unchanged. */}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row-reverse sm:justify-start">
          <Button
            type="submit"
            variant="outline"
            disabled={pending}
            aria-disabled={pending}
            className="sm:min-w-40"
          >
            {pending ? "Cancelling…" : "Cancel booking & send refund"}
          </Button>
          <Button asChild variant="ghost" disabled={pending} className="sm:min-w-40">
            <Link href={`/bookings/${bookingId}`}>Keep booking</Link>
          </Button>
        </div>
      </form>
    </Form>
  );
}
