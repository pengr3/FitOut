"use client";

// Signup page (logged-out).
//
// Email/password + first name + an `intent` choice ("I'm here to book" vs "I'm here to host").
// The form validates client-side with the SHARED signupSchema (via @hookform/resolvers/zod);
// the SAME schema re-validates inside the `signup` server action — the client is never trusted.
//
// `intent` (D-02) is sent to the server, which maps it to the canBook/canHost capability flag
// SERVER-SIDE (those flags are input:false; the client cannot self-grant — T-03-01). On success
// the server returns a redirect target (book -> "/", host -> "/host" per D-05), which we follow.
//
// "Continue with Google" uses authClient.signIn.social — Better Auth handles the OAuth PKCE/state
// dance (do NOT hand-roll it). Only Google is surfaced in v1 (the second social provider is
// deferred from Phase 1 per RESEARCH; no provider button beyond Google).
//
// ⚠ GATE-NOREG #5 BINDS ON THIS FILE. Plan 15-07 restyled the box and moved nothing else: `intent`
// is still a form value POSTed to the `signup` server action, and the capability flags are still
// assigned there. Do not map intent → capability in this component, and do not add a client-side
// default beyond the `"book"` the form already seeds — a client that can name its own capability is
// T-03-01, not a convenience.
//
// THE BOX IS `PanelCard` SINCE PLAN 15-07. This file was one of four `ALLOWED_RAW_CARD` rows in
// `tests/design/card-pattern-coverage.test.ts` excused with "Phase 15 owns this"; the row is deleted
// and this page is a declared `panel-card` adopter in the same commit (13-08's finding: an
// allow-list row exempts a file in BOTH directions, permanently, so one left behind licenses the
// next raw box somebody adds to a file that had just been pattern-ised).
//
// ⚠ ADD NO PADDING AND NO VERTICAL-RHYTHM UTILITY AT THIS CALL SITE — `PanelCard`'s own CardContent
// carries both, and this tree's Card puts block padding on Card itself, so a child that asks again
// pays it twice (`cancel-page-shell.test.tsx:222-227` states the rule in its failure message).
//
// THE DOCUMENT'S `<h1>` IS THE CARD TITLE — the heading-level prop on the call below carries the top
// level, via the union widening plan 15-06 made. This page rendered no heading element at all before
// 15-07: `CardTitle` is a `<div>`. The prop and its value are named descriptively here rather than
// quoted (`booking-row.tsx:112`'s precedent) because this plan's acceptance scan counts that string
// in this file and expects exactly one occurrence — the call site.
//
// The wordmark and the `<main>` landmark are the layout's (plan 15-06, D-162); this page renders
// neither.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth-client";
import { signup } from "@/app/actions/auth";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
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

export default function SignupPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", firstName: "", intent: "book" },
  });

  const intent = form.watch("intent");

  async function onSubmit(values: SignupInput) {
    setFormError(null);
    const result = await signup(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    // Session cookie was set by the server action (autoSignIn + nextCookies); navigate.
    router.push(result.redirectTo);
    router.refresh();
  }

  async function onGoogle() {
    setFormError(null);
    await authClient.signIn.social({ provider: "google", callbackURL: "/" });
  }

  return (
    <PanelCard
      title="Create your FitOut account"
      titleAs="h1"
      description="Book a space or list one of your own."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Intent (D-02) — maps to canBook/canHost server-side. */}
          <FormField
            control={form.control}
            name="intent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I&apos;m here to…</FormLabel>
                <div
                  role="radiogroup"
                  aria-label="Signup intent"
                  className="grid grid-cols-2 gap-2"
                >
                  {(["book", "host"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={field.value === value}
                      data-intent={value}
                      onClick={() => field.onChange(value)}
                      // DS-13 / D-15 / THEME-05: the selected branch used to be an absolute-black
                      // fill with absolute-white ink and an inverted dark-mode twin — six frozen
                      // values on one element. It is now the neutral CONTROL fill (D-21: the same
                      // token an un-varianted <Button> paints, never the accent), whose label
                      // pairing is declared in contrast-pairs.ts at the 4.5 text bar.
                      //
                      // ⚠ BYTE-IDENTICAL ACROSS PLAN 15-07's RESTYLE, deliberately. The one coral on
                      // this screen is the submit below; a selected intent is a CHOICE the person has
                      // made, not the action the page is asking for, and painting it with the accent
                      // would make the card ask twice. Do not give this pair a Button variant either
                      // — it is a radio group by role, and a <Button> here would be a control that
                      // announces itself as the wrong thing.
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                        field.value === value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-accent"
                      }`}
                    >
                      {value === "book" ? "Book a space" : "Host a space"}
                    </button>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="given-name"
                    placeholder="Alex"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
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

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          {/* THE ONE CORAL ON THIS VIEWPORT (D-162, D-21). `Continue with Google` below stays
              outline, the intent pair keeps the neutral control fill, and every link stays neutral.
              The touch size is AUTHUI-03 gate 1's 44px floor, an explicit opt-in rather than a
              responsive default (D-22). Both shipped labels and the in-flight one are unchanged —
              `e2e/login-persistence.spec.ts` matches `/sign up to book/i` and must pass unedited. */}
          <Button
            type="submit"
            variant="brand"
            size="touch"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? "Creating account…"
              : intent === "host"
                ? "Sign up to host"
                : "Sign up to book"}
          </Button>
        </form>
      </Form>

      <div className="relative text-center text-xs text-muted-foreground">
        <span className="bg-card px-2">or</span>
        <div className="absolute inset-x-0 top-1/2 -z-(--z-sticky) border-t" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogle}
      >
        Continue with Google
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline">
          Log in
        </Link>
      </p>
    </PanelCard>
  );
}
