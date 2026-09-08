"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { requestOpsPasswordReset } from "@/app/actions/ops-auth";
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
import { requestResetSchema, type RequestResetInput } from "@/lib/validation/auth";

const UNIFORM_MESSAGE =
  "If a staff account exists for that email, a reset link is on its way.";

export default function OpsForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const form = useForm<RequestResetInput>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: { email: "" },
    shouldFocusError: true,
  });

  async function onSubmit(values: RequestResetInput) {
    await requestOpsPasswordReset(values);
    setSubmitted(true);
  }

  return (
    <PanelCard
      title="Reset your password"
      titleAs="h1"
      description="Enter your staff email and we'll send you a reset link."
    >
      {submitted ? (
        <p role="status" aria-label="Reset request result" className="text-sm text-muted-foreground">
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
        <Link href="/login" className="font-medium underline">
          Back to sign in
        </Link>
      </p>
    </PanelCard>
  );
}
