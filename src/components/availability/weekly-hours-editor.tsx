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
import { useForm, useFieldArray, useWatch } from "react-hook-form";
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

/** "HH:mm" (or "HH:mm:ss") → integer hour 0..23, for the client-side overlap math. */
const toHour = (t: string) => parseInt(t.slice(0, 2), 10);

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
    mode: "onChange", // validate live so overlap / close≤open surface as you pick — not only on Save
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "windows",
  });

  // Live window values, for the client-side overlap math below. The server action still
  // re-validates every write with the SAME weeklyHoursSchema — this only makes an overlap
  // impossible to *express* in the UI (never trust the client; the check is a safety net).
  const liveWindows = (useWatch({ control: form.control, name: "windows" }) ?? []) as Array<
    WeeklyHoursWindow | undefined
  >;

  /** Occupied [open, close) hour ranges from the OTHER windows on `day` (pass selfIndex -1 to include all). */
  const otherRangesOnDay = (day: number, selfIndex: number) => {
    const ranges: { s: number; e: number }[] = [];
    liveWindows.forEach((w, i) => {
      if (!w || i === selfIndex || w.dayOfWeek !== day) return;
      const s = toHour(w.openTime);
      const e = toHour(w.closeTime);
      if (Number.isFinite(s) && Number.isFinite(e) && e > s) ranges.push({ s, e });
    });
    return ranges;
  };

  // An open hour is blocked if it sits inside another window (can't start mid-block) or has no room after it.
  const isOpenDisabled = (h: number, day: number, selfIndex: number) =>
    h >= 23 || otherRangesOnDay(day, selfIndex).some((r) => h >= r.s && h < r.e);

  // A close hour is blocked if it isn't after open, or if the [open, close) run would cross another window.
  const isCloseDisabled = (c: number, open: number, day: number, selfIndex: number) =>
    !Number.isFinite(open) ||
    c <= open ||
    otherRangesOnDay(day, selfIndex).some((r) => r.s < c && r.e > open);

  /** A non-overlapping default for "Add hours": the first free hour at/after the day's latest close. */
  const nextDefaultWindow = (day: number) => {
    const ranges = otherRangesOnDay(day, -1);
    const isFree = (h: number) => !ranges.some((r) => r.s < h + 1 && r.e > h);
    const latest = ranges.length ? Math.max(...ranges.map((r) => r.e)) : 0;
    const from = Math.min(Math.max(latest, 0), 22);
    const hours = Array.from({ length: 23 }, (_, i) => i); // 0..22 (an open hour needs room for a close after it)
    const start = hours.find((h) => h >= from && isFree(h)) ?? hours.find(isFree) ?? 9;
    const hhmm = (n: number) => `${String(n).padStart(2, "0")}:00`;
    return { dayOfWeek: day, openTime: hhmm(start), closeTime: hhmm(start + 1) };
  };

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
                                      <SelectItem
                                        key={o.value}
                                        value={o.value}
                                        disabled={isOpenDisabled(toHour(o.value), day, index)}
                                      >
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
                                      <SelectItem
                                        key={o.value}
                                        value={o.value}
                                        disabled={isCloseDisabled(
                                          toHour(o.value),
                                          toHour(liveWindows[index]?.openTime ?? ""),
                                          day,
                                          index,
                                        )}
                                      >
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
                        onClick={() => append(nextDefaultWindow(day))}
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
