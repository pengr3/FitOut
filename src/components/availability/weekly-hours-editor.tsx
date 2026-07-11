"use client";

// Host weekly operating-hours editor (AVAIL-01 · D-25). Client RHF + Zod for UX; the Plan-03
// saveOperatingHours server action re-validates with the SAME weeklyHoursSchema and owns the write —
// the client form is NEVER the authority (CLAUDE.md "never trust the client"; mirrors edit/wizard.tsx).
//
// D-25: multiple open-close windows per weekday. Seven weekday rows; each lists its windows (open Select
// + close Select + a neutral remove ×); "Add hours" appends a window; a day with zero windows is "Closed".
// Save is a "replace the set" full-state save, so the flat `windows` array IS the whole schedule.
//
// The page (Task 3) passes openTime/closeTime already normalized to "HH:mm" (Postgres `time` round-trips
// as "HH:mm:ss") so the seeded values line up with the on-the-hour Select options and the shared schema —
// an untouched, DB-origin window re-saves cleanly after a reload (the 03-04 round-trip seam).

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon, XIcon } from "lucide-react";

import { weeklyHoursSchema, type WeeklyHoursInput } from "@/lib/validation/availability";
import { saveOperatingHours } from "@/app/actions/operating-hours";
import {
  Form,
  FormControl,
  FormItem,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";

export type WeeklyHoursWindow = {
  dayOfWeek: number;
  openTime: string; // "HH:mm" (page normalizes the DB "HH:mm:ss" via .slice(0, 5))
  closeTime: string; // "HH:mm"
};

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** On-the-hour "HH:mm" options (00:00..23:00) — values line up with the shared schema's on-the-hour rule. */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const value = `${String(h).padStart(2, "0")}:00`;
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { value, label: `${hour12}:00 ${period}` };
});

/** RHF stores an array-root custom issue (the overlap message) on `windows` — read it defensively. */
type WindowsRootError = { message?: string; root?: { message?: string } } | undefined;

export function WeeklyHoursEditor({
  listingId,
  cityLabel,
  gmtLabel,
  initialWindows,
}: {
  listingId: string;
  timezone: string; // accepted for a consistent editor contract; the tz note uses cityLabel + gmtLabel
  cityLabel: string;
  gmtLabel: string;
  initialWindows: WeeklyHoursWindow[];
}) {
  const [saving, setSaving] = useState(false);

  const form = useForm<WeeklyHoursInput>({
    resolver: zodResolver(weeklyHoursSchema),
    defaultValues: { windows: initialWindows },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "windows",
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setSaving(true);
    const res = await saveOperatingHours(listingId, values);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      // Surface any server field errors the client schema didn't already catch.
      if (res.fieldErrors?.windows?.length) {
        form.setError("windows", { message: res.fieldErrors.windows[0] });
      }
      return;
    }
    toast.success("Hours saved");
    form.reset(values); // clear dirty state; keep the just-saved windows
  });

  const windowsErr = form.formState.errors.windows as WindowsRootError;
  const overlapMessage = windowsErr?.message ?? windowsErr?.root?.message;
  const hasNoWindows = fields.length === 0;

  return (
    <div className="space-y-4">
      <Toaster />

      <p className="text-sm text-muted-foreground">
        {`These hours are in your space's local time — ${cityLabel} (${gmtLabel}).`}
      </p>

      {hasNoWindows && (
        <Card>
          <CardContent className="space-y-1">
            <h3 className="text-base font-semibold">Set your weekly hours</h3>
            <p className="text-sm text-muted-foreground">
              Tell bookers when your space is open. Add open and close times for each day — you can
              add more than one block per day.
            </p>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Card>
            <CardContent className="divide-y">
              {WEEKDAYS.map((label, day) => {
                const dayEntries = fields
                  .map((field, index) => ({ field, index }))
                  .filter(({ field }) => field.dayOfWeek === day);
                return (
                  <div key={label} className="grid gap-3 py-4 sm:grid-cols-[7rem_1fr] sm:items-start">
                    <span className="text-sm font-semibold">{label}</span>
                    <div className="space-y-2">
                      {dayEntries.length === 0 && (
                        <p className="text-sm text-muted-foreground">Closed</p>
                      )}
                      {dayEntries.map(({ index }) => (
                        <div key={index} className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name={`windows.${index}.openTime` as const}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 w-full" aria-label="Open time">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {HOUR_OPTIONS.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <span className="text-sm text-muted-foreground">to</span>
                          <FormField
                            control={form.control}
                            name={`windows.${index}.closeTime` as const}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className="h-11 w-full" aria-label="Close time">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {HOUR_OPTIONS.map((o) => (
                                      <SelectItem key={o.value} value={o.value}>
                                        {o.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            className="size-11"
                            aria-label="Remove hours"
                            onClick={() => remove(index)}
                          >
                            <XIcon className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-h-11"
                        onClick={() =>
                          append({ dayOfWeek: day, openTime: "09:00", closeTime: "17:00" })
                        }
                      >
                        <PlusIcon className="size-4" /> Add hours
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {overlapMessage && (
            <p className="text-sm text-destructive" role="alert">
              {overlapMessage}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" className="min-h-11" disabled={saving}>
              {saving ? "Saving…" : "Save hours"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
