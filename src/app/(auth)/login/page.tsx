"use client";

// Login page (logged-out).
//
// Email/password via authClient.signIn.email + "Continue with Google" via
// authClient.signIn.social. The form validates client-side with the shared loginSchema;
// Better Auth re-validates credentials server-side and returns a GENERIC error on failure
// (we never reveal whether the email exists — T-03-06 anti-enumeration).
//
// On success the session cookie is set and we navigate to "/". A "Forgot password?" link
// points at /forgot-password (the AUTH-03 recovery entry point). Only Google is surfaced in v1
// (the second social provider is deferred from Phase 1; no provider button beyond Google).
//
// THE BOX IS `PanelCard` SINCE PLAN 15-07, and the swap SPENT an allow-list row rather than merely
// changing a container. This file was the first of four `ALLOWED_RAW_CARD` entries in
// `tests/design/card-pattern-coverage.test.ts`, each excused with a sentence saying Phase 15 owned
// the surface. That row is deleted and this page is a declared `panel-card` adopter in the SAME
// commit — the pairing plans 14-12/14-13 established, because 13-08's finding is that an allow-list
// row exempts a file in BOTH directions, permanently: a row surviving its own conversion goes on
// licensing the next hand-rolled box somebody adds here.
//
// ⚠ ADD NO PADDING AND NO VERTICAL-RHYTHM UTILITY AT THIS CALL SITE. `PanelCard`'s own CardContent
// already carries both, and this tree puts block padding on Card itself — a child that asks again
// pays it twice (`cancel-page-shell.test.tsx:222-227` states the rule in its failure message).
//
// THE DOCUMENT'S `<h1>` IS THE CARD TITLE. This page rendered no h1 at all before 15-07: `CardTitle`
// is a `<div>`. `titleAs="h1"` is the widening plan 15-06 made to `PanelCard`, and the argument is
// the pattern's own — an auth card IS the document, so its title is that document's heading.
//
// THE WORDMARK AND THE `<main>` LANDMARK BOTH LIVE IN `(auth)/layout.tsx` (plan 15-06, D-162). This
// page renders neither, and must not: a second wordmark on an auth screen recreates byte-for-byte
// the SHELL-01 duplication the composition exists to end.

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth-client";
import { safeCallbackPath } from "@/lib/safe-callback-url";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
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

// Shows the "password updated" confirmation after a successful reset (?reset=1).
// In its own Suspense-wrapped component because useSearchParams() needs a boundary.
//
// COLOUR (DS-10 / D-14 / D-15): this was a numbered-green tint carrying numbered-green ink, plus a
// dark-mode twin — four frozen values on one element. It is now the neutral tint with full-contrast
// ink, a declared pairing (18.16 court / 16.89 grove). NO hue is added back: D-14 puts status hue in
// an ICON and never in text, and the semantic green has no text-bar row in contrast-pairs.ts because
// it cannot clear 4.5 on a light surface. Nothing is lost here — this notice renders ONLY on success
// and its own sentence is the whole signal, so the colour was decoration rather than meaning.
//
// NOT AN ANNOUNCED REGION SINCE PLAN 15-07, and the demotion is Phase 14's rule applied verbatim
// rather than a preference: *a live region announces a CHANGE, and a freshly rendered page is not a
// change — it is a page.* This notice mounts WITH the document (the visitor ARRIVES on
// `/login?reset=1`, sent here by the reset page's redirect) and never changes afterwards, so the
// announcement role it used to carry announced either nothing or a duplicate of the sentence a
// screen reader was about to read anyway.
//
// The role is named descriptively here rather than quoted, following `booking-row.tsx:112`'s
// precedent: this plan's own acceptance scan counts that string in this file, and a comment
// explaining a removal must not trip the gate that measures it.
//
// Its class list and its sentence are byte-identical across the demotion, and
// `e2e/password-reset.spec.ts` asserts that sentence BY TEXT rather than by role, so the spec passes
// unmodified. Do not reintroduce the role here or on any of the four auth screens.
function ResetNotice() {
  const params = useSearchParams();
  if (params.get("reset") !== "1") return null;
  return (
    <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">
      Password updated — please sign in.
    </p>
  );
}

// Same-origin return path from ?callbackURL (D-41 resume-checkout). Read from window at call time so no
// extra useSearchParams()/Suspense boundary is needed.
//
// The guard itself lives in `@/lib/safe-callback-url` and is tested there (WR-12). It used to be
// inline here as a prefix match — `startsWith("/") && !startsWith("//")` — which a BACKSLASH
// defeats: the URL parser reads `\` as `/` for special schemes, so `/\evil.com` passed both
// conditions and resolved to `https://evil.com/`. The value reaches `router.push()` below and
// `authClient.signIn.social({ callbackURL })`, the latter surviving a full OAuth round-trip, from a
// query parameter in a link an attacker controls. Read that module's header before changing this.
function safeCallbackUrl(): string {
  if (typeof window === "undefined") return "/";
  const raw = new URLSearchParams(window.location.search).get("callbackURL");
  return safeCallbackPath(raw, window.location.origin);
}

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    if (error) {
      // Generic, non-enumerating message regardless of the underlying cause (T-03-06).
      setFormError("Invalid email or password.");
      return;
    }
    // Resume checkout (or any return path) after sign-in (D-41); defaults to "/" when none was threaded.
    router.push(safeCallbackUrl());
    router.refresh();
  }

  async function onGoogle() {
    setFormError(null);
    await authClient.signIn.social({ provider: "google", callbackURL: safeCallbackUrl() });
  }

  return (
    <PanelCard
      title="Welcome back"
      titleAs="h1"
      description="Log in to your FitOut account."
    >
      <Suspense fallback={null}>
        <ResetNotice />
      </Suspense>
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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  {/* 14px since plan 15-07, matching every other link inside this card. It was the
                      12px step, which made the one recovery route out of a failed login the smallest
                      text on the screen — the inverse of its importance. The "or" divider below
                      keeps the smaller step, and that is a distinction rather than an oversight: the
                      divider is chrome, not a control. */}
                  <Link
                    href="/forgot-password"
                    className="text-sm text-muted-foreground underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
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
              outline and every link stays neutral — a second accent-filled control here would make
              one screen ask twice, which is the defect D-162's "coral on the primary action only"
              names. The touch size is the 44px floor AUTHUI-03's first gate requires, and it is an
              explicit opt-in rather than a responsive default (D-22). */}
          <Button
            type="submit"
            variant="brand"
            size="touch"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Logging in…" : "Log in"}
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
        New to FitOut?{" "}
        <Link href="/signup" className="font-medium underline">
          Create an account
        </Link>
      </p>
    </PanelCard>
  );
}
