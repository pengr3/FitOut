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

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth-client";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
function ResetNotice() {
  const params = useSearchParams();
  if (params.get("reset") !== "1") return null;
  return (
    <p
      role="status"
      className="rounded-md bg-muted px-3 py-2 text-sm text-foreground"
    >
      Password updated — please sign in.
    </p>
  );
}

// Same-origin return path from ?callbackURL (D-41 resume-checkout). Read from window at call time so no
// extra useSearchParams()/Suspense boundary is needed. Open-redirect guard: only a relative "/..." path is
// honored — an absolute or protocol-relative ("//evil.com") URL falls back to "/".
function safeCallbackUrl(): string {
  if (typeof window === "undefined") return "/";
  const raw = new URLSearchParams(window.location.search).get("callbackURL");
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
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
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Log in to your FitOut account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground underline"
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

            <Button
              type="submit"
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
      </CardContent>
    </Card>
  );
}
