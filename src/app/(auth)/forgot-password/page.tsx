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

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth-client";
import { requestResetSchema, type RequestResetInput } from "@/lib/validation/auth";
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
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {submitted ? (
          <p role="status" className="text-sm text-muted-foreground">
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

              <Button
                type="submit"
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
      </CardContent>
    </Card>
  );
}
