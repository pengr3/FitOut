"use client";

// Reset-password page (logged-out) — AUTH-03 completion step.
//
// Reads the single-use `token` from the URL (?token=... — Better Auth puts it on the redirectTo
// link). The form validates with the shared resetSchema (token + password); on submit it calls
// authClient.resetPassword({ newPassword, token }). NOTE: resetSchema's field is `password`, which
// we pass as `newPassword` to the Better Auth API (its parameter name).
//
// Other-session revocation (D-13) is handled entirely by the Plan-02 config
// `revokeSessionsOnPasswordReset: true` — resetPassword takes NO revoke argument here. On success
// we send the user to /login with a "password updated" notice.
//
// useSearchParams() requires a Suspense boundary in the App Router, so the form lives in an inner
// component wrapped below.
//
// ⚠ GATE-NOREG #4 BINDS ON THIS FILE. Plan 15-07 restyled the box and moved nothing else: the hidden
// token input, `resetSchema`, the password → `newPassword` mapping and the post-success redirect to
// the login route with its notice flag (see the push below) are unchanged, and
// `revokeSessionsOnPasswordReset` was not touched. That redirect's query string is named
// descriptively rather than quoted, following `booking-row.tsx:112`'s precedent: this plan's
// acceptance scan pins its occurrence count in this file at its pre-task value of one, and a comment
// promising not to move a string must not itself move the count. The hidden input's type was
// RE-READ rather than assumed while making this pass — it is a hidden control, so it is not tabbable
// and the token never reaches the tab order or the accessibility tree (T-15-25, AUTHUI-03 gate 2).
//
// THE BOX IS `PanelCard` SINCE PLAN 15-07 — the fourth and last of the auth allow-list rows, deleted
// from `tests/design/card-pattern-coverage.test.ts` in the same commit as this conversion (13-08's
// finding: an allow-list row exempts a file in BOTH directions, permanently).
//
// ⚠ ADD NO PADDING AND NO VERTICAL-RHYTHM UTILITY AT THIS CALL SITE — `PanelCard`'s own CardContent
// carries both, and this tree's Card puts block padding on Card itself, so a child that asks again
// pays it twice (`cancel-page-shell.test.tsx:222-227`).
//
// THE `<h1>` IS THE CARD TITLE, AND ON THIS PAGE THAT IS LOAD-BEARING RATHER THAN TIDY: the panel is
// OUTSIDE the Suspense boundary, so the heading is present in all three of this document's states —
// the token-read fallback, the missing-token notice, and the form. A heading inside the boundary
// would appear and disappear under a screen reader as the token resolves. The wordmark and the
// `<main>` landmark are the layout's (plan 15-06, D-162); this page renders neither.

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth-client";
import { resetSchema, type ResetInput } from "@/lib/validation/auth";
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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    // Seed the token from the URL so resetSchema (which requires a non-empty token) validates.
    defaultValues: { token, password: "" },
  });

  async function onSubmit(values: ResetInput) {
    setFormError(null);
    const { error } = await authClient.resetPassword({
      newPassword: values.password, // resetSchema field is `password`; API wants `newPassword`.
      token: values.token,
    });
    if (error) {
      setFormError(
        "That reset link is invalid or has expired. Request a new one.",
      );
      return;
    }
    // Other sessions were revoked by the Plan-02 config (D-13). Send them to log in fresh.
    router.push("/login?reset=1");
  }

  // No token in the URL -> the link is malformed/missing; guide the user back.
  //
  // NOT AN ANNOUNCED REGION SINCE PLAN 15-07, and it is the same defect shape login's reset notice
  // had: this paragraph is present at FIRST PAINT of every tokenless visit — it is what the document
  // says, not something that happened to it — and Phase 14's rule is that a live region announces a
  // CHANGE, and a freshly rendered page is not a change, it is a page. The interruption role it used
  // to carry announced a duplicate of the sentence a screen reader was about to read anyway, one
  // beat earlier and out of order.
  //
  // The role is named descriptively rather than quoted, following `booking-row.tsx:112`'s precedent:
  // this plan's acceptance scan counts that string in this file (it must find exactly one — the
  // submit refusal below, which announces a REAL change), and a comment explaining a removal must
  // not trip the gate that measures it.
  //
  // Everything else here is byte-identical: the sentence, the destructive ink, and the
  // `Request a new link` route out — an absence must still offer a way forward.
  if (!token) {
    return (
      <p className="text-sm text-destructive">
        This reset link is missing its token.{" "}
        <Link href="/forgot-password" className="font-medium underline">
          Request a new link
        </Link>
        .
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* token travels with the form so the shared resetSchema validates it client-side too.
            A HIDDEN control: not rendered, not tabbable, not in the accessibility tree. Verified
            rather than assumed while plan 15-07 restyled around it (T-15-25). */}
        <input type="hidden" {...form.register("token")} />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 10 characters"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* THE ONE ANNOUNCED REGION THAT KEEPS ITS ROLE ON THIS PAGE, and the contrast with the
            missing-token notice above is the whole rule in one file: this line appears in response
            to a submit the person just made, which is a change; that one is the page. */}
        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        {/* THE ONE CORAL ON THIS VIEWPORT (D-162, D-21) — and this screen has no secondary action,
            so it is also the only control besides the field. The touch size is AUTHUI-03 gate 1's
            44px floor, an explicit opt-in rather than a responsive default (D-22). */}
        <Button
          type="submit"
          variant="brand"
          size="touch"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Updating…" : "Set new password"}
        </Button>
      </form>
    </Form>
  );
}

export default function ResetPasswordPage() {
  return (
    <PanelCard
      title="Set a new password"
      titleAs="h1"
      description="Choose a strong password you don't reuse."
    >
      {/* The shipped token-read loading state, unchanged: one muted line, no spinner, no layout
          shift (15-UI-SPEC § the five hard gates, designed states). */}
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium underline">
          Back to log in
        </Link>
      </p>
    </PanelCard>
  );
}
