"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { signInOps, type OpsSignInResult } from "@/app/actions/ops-auth";
import { PanelCard } from "@/components/patterns/panel-card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

const REFUSAL_COPY: Record<Exclude<OpsSignInResult, { ok: true }>["reason"], string> = {
  "invalid-input": "Invalid email or password.",
  "invalid-credentials": "Invalid email or password.",
  "no-ops-access": "This account does not have access to FitOut Ops.",
};

function ArrivalNotice() {
  const params = useSearchParams();
  const copy =
    params.get("signedOut") === "1"
      ? "Staff session ended."
      : params.get("created") === "1"
        ? "Staff account created. Sign in to continue."
        : null;

  if (!copy) return null;
  return <p className="rounded-md bg-muted px-3 py-2 text-sm text-foreground">{copy}</p>;
}

function requestedCallback(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("callbackURL");
}

export default function OpsLoginPage() {
  const router = useRouter();
  const [refusal, setRefusal] = useState<Exclude<OpsSignInResult, { ok: true }>["reason"] | null>(
    null,
  );
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    shouldFocusError: true,
  });

  async function onSubmit(values: LoginInput) {
    setRefusal(null);
    const result = await signInOps({ ...values, callbackURL: requestedCallback() });
    if (!result.ok) {
      setRefusal(result.reason);
      return;
    }
    router.push(result.redirectTo);
    router.refresh();
  }

  return (
    <PanelCard title="Sign in" titleAs="h1" description="Sign in with your staff account.">
      <Suspense fallback={null}>
        <ArrivalNotice />
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
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>Password</FormLabel>
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

          {refusal ? (
            <p role="alert" className="text-sm text-destructive">
              {REFUSAL_COPY[refusal]}
            </p>
          ) : null}

          <Button
            type="submit"
            size="touch"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Form>
    </PanelCard>
  );
}
