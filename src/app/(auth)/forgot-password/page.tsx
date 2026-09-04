"use client";

// Forgot-password page (logged-out) — AUTH-03 entry point.
//
// Submits the email to authClient.requestPasswordReset({ email, redirectTo: "/reset-password" }).
// Better Auth emails a link landing at /reset-password?token=... (in dev, with no RESEND_API_KEY,
// the Plan-02 email helper logs the link to the console instead of sending).
//
// ANTI-ENUMERATION (T-03-02): we ALWAYS show the same "if an account exists…" message after submit,
// regardless of whether the email exists or the request errored. We never reveal account existence.
// Better Auth's requestPasswordReset is itself enumeration-safe (uniform response + fire-and-forget
// email); this UI never branches on the result.
//
// ⚠ GATE-NOREG #2 BINDS ON THIS FILE. Plan 15-07 restyled the box and moved nothing else: there is
// still exactly ONE post-submit branch, reached identically whether or not the account exists, and
// the sentence is a module constant with one reader. A second post-submit state — "check your inbox"
// on the hit, this one on the miss — is the enumeration oracle the constant exists to prevent, and
// it would be reachable by timing even if the copy were identical.
//
// THE BOX IS `PanelCard` SINCE PLAN 15-07. This file was one of four `ALLOWED_RAW_CARD` rows in
// `tests/design/card-pattern-coverage.test.ts` excused with "Phase 15 owns this"; the row is deleted
// and this page is a declared `panel-card` adopter in the same commit (13-08's finding: an
// allow-list row exempts a file in BOTH directions, so one left behind licenses the next raw box).
//
// ⚠ ADD NO PADDING AND NO VERTICAL-RHYTHM UTILITY AT THIS CALL SITE — `PanelCard`'s own CardContent
// carries both, and this tree's Card puts block padding on Card itself, so a child that asks again
// pays it twice (`cancel-page-shell.test.tsx:222-227`).
//
// The wordmark and the `<main>` landmark are the layout's (plan 15-06, D-162); this page renders
// neither.

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth-client";
import { requestResetSchema, type RequestResetInput } from "@/lib/validation/auth";
import { PanelCard } from "@/components/patterns/panel-card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const UNIFORM_MESSAGE =
  "If an account exists for that email, a reset link is on its way.";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<RequestResetInput>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: RequestResetInput) {
    // Fire the request; intentionally ignore the result so we never leak existence (T-03-02).
    await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });
    setSubmitted(true);
  }

  return (
    <PanelCard
      title="Reset your password"
      titleAs="h1"
      description="Enter your email and we'll send you a reset link."
    >
      {submitted ? (
        // THE ONE GENUINE ANNOUNCED REGION ON THE FOUR AUTH SCREENS, and it keeps its role for the
        // reason the other two lost theirs: this text is NOT present at first paint. It replaces the
        // form in response to the visitor's own submit, which is a change, which is what an
        // announcement is for.
        //
        // It gains an author-supplied accessible name because a region that resolves to an EMPTY
        // name is announced as an unlabelled landmark by some screen readers — the row plan 15-09
        // declares for this element is the name below, and the markup lands here so the declaration
        // has something to be true about.
        //
        // ⚠ THIS BRANCH RENDERS ZERO ACCENT-FILLED ELEMENTS, and that is measured rather than
        // assumed: the ternary REPLACES the form (and with it the one brand-variant submit) — it
        // does not sit beside it. The only elements left in the card are this paragraph and the
        // `Back to log in` cross-link below, neither of them a filled control. D-162 puts coral on
        // the primary action only; once there is no primary action there is no coral.
        <p
          role="status"
          aria-label="Reset request result"
          className="text-sm text-muted-foreground"
        >
          {UNIFORM_MESSAGE}
        </p>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* THE ONE CORAL ON THIS VIEWPORT (D-162, D-21) — and this screen has no secondary
                action at all, so it is also the only control. The touch size is AUTHUI-03 gate 1's
                44px floor, an explicit opt-in rather than a responsive default (D-22). */}
            <Button
              type="submit"
              variant="brand"
              size="touch"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </Form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium underline">
          Back to log in
        </Link>
      </p>
    </PanelCard>
  );
}
