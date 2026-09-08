"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  acceptStaffInviteAction,
  type OpsStaffInviteAcceptanceResult,
} from "@/app/actions/ops-auth";
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
import {
  acceptStaffInvitationInput,
  type AcceptStaffInvitationInput,
} from "@/lib/validation/ops-staff";

const setupInput = acceptStaffInvitationInput.pick({ name: true, password: true });

type SetupInput = Pick<AcceptStaffInvitationInput, "name" | "password">;

const RESULT_COPY: Record<OpsStaffInviteAcceptanceResult["outcome"], string> = {
  invalid: "Check your name and password, then try again.",
  inactive: "This invitation is no longer active. Ask the FitOut staff member who invited you to send a new invitation.",
  refused: "This email can no longer be used for this invitation. Ask for a separate staff invitation.",
};

export function StaffInviteSetupForm({ token }: { token: string }) {
  const [result, setResult] = useState<OpsStaffInviteAcceptanceResult | null>(null);
  const form = useForm<SetupInput>({
    resolver: zodResolver(setupInput),
    defaultValues: { name: "", password: "" },
    shouldFocusError: true,
  });

  async function onSubmit(values: SetupInput) {
    setResult(null);
    const next = await acceptStaffInviteAction({ token, ...values });
    setResult(next);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  placeholder="Your name"
                  disabled={form.formState.isSubmitting}
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
                  disabled={form.formState.isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {result ? (
          <p role="alert" className="text-sm text-destructive">
            {RESULT_COPY[result.outcome]}
          </p>
        ) : null}

        <Button
          type="submit"
          size="touch"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Creating account…" : "Create staff account"}
        </Button>
      </form>
    </Form>
  );
}
