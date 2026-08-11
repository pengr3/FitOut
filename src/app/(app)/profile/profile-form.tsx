"use client";

// Profile edit form (client) — RHF + the SHARED profileSchema (UX validation), submitting to the
// updateProfile server action which RE-VALIDATES with the same schema (the client is never trusted).
// The avatar control posts a FormData to uploadAvatarAction; both type and size are re-checked
// server-side (T-04-04). The form is visually split into "Public profile" vs "Private account info"
// (D-09/D-10) so the user sees exactly what other people can see.

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updateProfile } from "@/app/actions/profile";
import { uploadAvatarAction } from "@/app/actions/avatar";
import { profileSchema, type ProfileInput } from "@/lib/validation/profile";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ProfileForm({
  initial,
  avatarUrl: initialAvatarUrl,
  displayName,
}: {
  initial: ProfileInput;
  avatarUrl: string | null;
  displayName: string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: initial,
  });

  async function onSubmit(values: ProfileInput) {
    setFormError(null);
    setSaved(false);
    const result = await updateProfile(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarBusy(true);
    const fd = new FormData();
    fd.set("avatar", file);
    const result = await uploadAvatarAction(fd);
    setAvatarBusy(false);
    if (!result.ok) {
      setAvatarError(result.error);
      return;
    }
    setAvatarUrl(result.avatarUrl);
    router.refresh();
  }

  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="space-y-10">
      {/* ---- Public profile ---- */}
      <section aria-labelledby="public-heading" className="space-y-5">
        <div>
          <h2 id="public-heading" className="text-lg font-medium">
            Public profile
          </h2>
          <p className="text-sm text-muted-foreground">
            What other people on FitOut can see.
          </p>
        </div>

        {/* Avatar (optional — D-09) */}
        <div className="flex items-center gap-4">
          <Avatar size="lg" className="size-16">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt="Your avatar" />
            ) : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              aria-label="Upload avatar"
              onChange={onAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={avatarBusy}
              onClick={() => fileInput.current?.click()}
            >
              {avatarBusy ? "Uploading…" : "Upload photo"}
            </Button>
            <p className="text-xs text-muted-foreground">
              JPG or PNG, up to 5 MB. Optional.
            </p>
            {avatarError && (
              <p role="alert" className="text-xs text-destructive">
                {avatarError}
              </p>
            )}
          </div>
        </div>
      </section>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          <div className="space-y-5">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First name</FormLabel>
                  <FormControl>
                    <Input autoComplete="given-name" {...field} />
                  </FormControl>
                  <FormDescription>
                    Shown publicly as your display name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>About</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="A little about you…"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>Public. Keep it short.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Austin"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>Public, general area.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* ---- Private account info ---- */}
          <section aria-labelledby="private-heading" className="space-y-5">
            <div>
              <h2 id="private-heading" className="text-lg font-medium">
                Private account info
              </h2>
              <p className="text-sm text-muted-foreground">
                Only you can see this. Never shown to other people.
              </p>
            </div>

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last name</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="family-name"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Private (used later for payouts). Never shown publicly.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      autoComplete="tel"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>Private. Optional.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          {/* COLOUR (DS-10 / D-14 / D-15): was a numbered-green ink — a frozen value AND hue carried
              by TEXT, which D-14 forbids: the semantic green has no text-bar row in contrast-pairs.ts
              because it cannot clear 4.5 on a light surface. This is a bare inline line beside the
              bare inline error line above it, with no chip surface to tint and no glyph to hold a
              hue, and it renders only after a successful save — so its sentence is the whole signal
              and the colour was decoration. Secondary ink on the page: a declared pairing. */}
          {saved && (
            <p role="status" className="text-sm text-muted-foreground">
              Profile saved.
            </p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
