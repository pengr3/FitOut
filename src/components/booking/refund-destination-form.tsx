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
        // ⚠️ THE `notice` PATH IS NOT THE SAME CASE AND KEEPS ITS TOAST. A `notice` means the
        // cancellation succeeded but the transfer could not be dispatched (a rail failure or a ceiling) —
        // the operator seam already has the money, and the sentence is a calm server-composed string
        // rather than a figure to retain. It is also not a literal in this file, so the STATE-08 scan in
        // `tests/design/status-vocab.test.ts` cannot see it either way; that is recorded as a stated
        // blind spot there rather than claimed as coverage.
        //
        // D-57 still decides the DESTINATION's tense: the POST records intent, so the sentence there is
        // "on its way" and never a completed past tense.
        if (res.notice) {
          toast.warning(res.notice);
        } else {
          toast.success("Booking cancelled.");
        }
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
