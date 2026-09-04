"use client";

// Profile edit form (client) — RHF + the SHARED profileSchema (UX validation), submitting to the
// updateProfile server action which RE-VALIDATES with the same schema (the client is never trusted).
// The avatar control is `<AvatarField />` (`src/components/profile/avatar-field.tsx`) as of plan
// 16-11 — it owns the picker, the four pre-dialog guards, the framing dialog and the save, and both
// type and size are STILL re-checked server-side (T-04-04). Nothing about that extraction reaches
// this form: the field registers no react-hook-form value and carries no `name`, which is the
// property the comment above the `<form>` element records and the reason it must stay there.
// The form is visually split into "Public profile" vs "Private account info"
// (D-09/D-10) so the user sees exactly what other people can see.
//
// THE SPLIT IS TWO `PanelCard`s AS OF PLAN 15-08, and that is the whole of what that plan changed
// here. Each group used to be a bare section with a hand-sized heading and a muted sentence, drawing
// no box at all while this route's own loading plate drew one. The two groups keep EXACTLY the field
// membership they shipped with — the D-09/D-10 boundary is enforced server-side by `publicProfile()`
// and a restyle that moved a private field into the public panel would make this surface lie about a
// boundary it does not own. Both group sentences are byte-identical to the ones that shipped.
//
// ⚠ THE SAVE-STATE MACHINE IS NOT PART OF THAT CHANGE, and it is the reason to read before editing.
// `saved` is set from the ACTUAL `updateProfile` result and cleared at the top of the next submit;
// there is no timer on the save path, no optimistic flag, and nothing derived from "probably worked".
// 14-CONTEXT D-150 copied this file as the reference truthful-save model. Restyle around it.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { updateProfile } from "@/app/actions/profile";
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
import { AvatarField } from "@/components/profile/avatar-field";
import { PanelCard } from "@/components/patterns/panel-card";

export function ProfileForm({
  initial,
  avatarUrl,
  displayName,
}: {
  initial: ProfileInput;
  avatarUrl: string | null;
  displayName: string;
}) {
  const router = useRouter();
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

  return (
    <Form {...form}>
      {/* The panels sit INSIDE the form element now, which is what lets one box hold the avatar
          control and the public fields together — they were two siblings before, one outside the form
          and one in, because there was no box asking them to be one thing. Nothing about the submit
          changes: the file input carries no `name` and is not registered, so the values the action
          receives are the same five it always received. */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* ---- Public profile ---- */}
        {/* The pattern renders the heading and the sentence itself, so the heading id and the
            reference that pointed the old section at it retire with the section — a labelled region
            naming a heading the pattern now owns would be two names for one box. `titleAs` is passed
            explicitly at both call sites even though `h2` is the default: the level is a fact about
            this document's outline (the page's `<h1>` is `PageHeader`'s), not a default to inherit
            silently. NO padding and NO vertical-rhythm utility is added at either call site — the
            pattern's own content box supplies both, and this tree puts block padding on the card
            itself, so a child that asks again pays it twice. */}
        <PanelCard
          title="Public profile"
          titleAs="h2"
          description="What other people on FitOut can see."
        >
          {/* Avatar (optional — D-09) */}
          {/* STILL ONE CONTROL, AND HALF THE REASON IS NOW DISCHARGED. The row used to carry the
              whole avatar interaction inline; plan 16-11 replaced it with one element, and the
              picker, the four guards, the framing dialog and the save all live in
              `avatar-field.tsx` now — that is CROP-01, landed. AVATAR TEARDOWN HAS NOT LANDED. It
              is CROP-03 and it arrives in plan 16-12, in that same file rather than in this one,
              and until then this row is still given no second control — because a destructive
              affordance shipped ahead of the action behind it is a button that lies. */}
          <AvatarField avatarUrl={avatarUrl} displayName={displayName} />

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
        </PanelCard>

        {/* ---- Private account info ---- */}
        <PanelCard
          title="Private account info"
          titleAs="h2"
          description="Only you can see this. Never shown to other people."
        >
          <div className="space-y-5">
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
          </div>
        </PanelCard>

        {/* THE SAVE ROW SITS BELOW BOTH PANELS AND INSIDE NEITHER. It acts on the whole form, so a
            box around it would say it belonged to the group it was nearest. The submit is the NEUTRAL
            solid, never the accent: a profile edit is a form somebody is finishing, not a conversion
            the page is asking for, and the one accent per viewport belongs to the latter. */}
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
        {/* THE NAME IS THE WIZARD'S PRECEDENT, two words that say WHICH line moved rather than a
            paraphrase of the sentence inside it — a status region takes no name from its content, so
            without one it announces as the empty string. This is the only markup change any of this
            file's three live regions receives; both refusal regions keep their role and their
            classes exactly. */}
        {saved && (
          <p
            role="status"
            aria-label="Save state"
            className="text-sm text-muted-foreground"
          >
            Profile saved.
          </p>
        )}

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </Form>
  );
}
