"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { resetOpsPassword } from "@/app/actions/ops-auth";
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
import { resetSchema, type ResetInput } from "@/lib/validation/auth";

const RESET_REFUSAL = "That reset link is invalid or has expired. Request a new one.";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [refused, setRefused] = useState(false);
  const form = useForm<ResetInput>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token, password: "" },
    shouldFocusError: true,
  });

  async function onSubmit(values: ResetInput) {
    setRefused(false);
    const result = await resetOpsPassword(values);
    if (!result.ok) {
      setRefused(true);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  if (!token) {
    return (
      <p className="text-sm text-destructive">
        {RESET_REFUSAL}{" "}
        <Link href="/forgot-password" className="font-medium underline">
          Request a new link
        </Link>
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

        {refused ? (
          <p role="alert" className="text-sm text-destructive">
            {RESET_REFUSAL}{" "}
            <Link href="/forgot-password" className="font-medium underline">
              Request a new link
            </Link>
          </p>
        ) : null}

        <Button
          type="submit"
          size="touch"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Saving…" : "Set new password"}
        </Button>
      </form>
    </Form>
  );
}

export default function OpsResetPasswordPage() {
  return (
    <PanelCard
      title="Set a new password"
      titleAs="h1"
      description="Choose a strong password you don't reuse."
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium underline">
          Back to sign in
        </Link>
      </p>
    </PanelCard>
  );
}
