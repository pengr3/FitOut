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

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth-client";
import { signup } from "@/app/actions/auth";
import { signupSchema, type SignupInput } from "@/lib/validation/auth";
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
    <Card>
      <CardHeader>
        <CardTitle>Create your FitOut account</CardTitle>
        <CardDescription>Book a space or list one of your own.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                        className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                          field.value === value
                            ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
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

            <Button
              type="submit"
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
          <div className="absolute inset-x-0 top-1/2 -z-10 border-t" />
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
      </CardContent>
    </Card>
  );
}
