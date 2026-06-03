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

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { authClient } from "@/lib/auth-client";
import { resetSchema, type ResetInput } from "@/lib/validation/auth";
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
  if (!token) {
    return (
      <p role="alert" className="text-sm text-destructive">
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
        {/* token travels with the form so the shared resetSchema validates it client-side too. */}
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
          {form.formState.isSubmitting ? "Updating…" : "Set new password"}
        </Button>
      </form>
    </Form>
  );
}

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a strong password you don&apos;t reuse.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium underline">
            Back to log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
