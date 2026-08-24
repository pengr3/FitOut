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
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT PLAN 14-12 CHANGED: THE CONTAINER, AND THE PREVIEW ABOVE IT (HFLOW-04 · D-152, D-153, D-155)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// THE CONTAINER CHANGED, AND NOTHING ELSE ABOUT THIS FILE MOVED. Both hand-rolled boxes — the
// "no hours yet" advisory and the seven-day editor — compose the declared panel pattern now, at the
// muted advisory tone and the default tone. The copy is byte-identical, the dividing rule on the day
// list is preserved, and the seven rows render in the same order with the same controls. The advisory
// is deliberately NOT an empty state: the seven day rows always render, so it is an advisory about a
// form that is fully present rather than the absence of a list.
//
// D-155 — THIS FILE LEFT `ALLOWED_RAW_CARD`, IN THE SAME COMMIT. `11-13-SUMMARY.md:234-235` held that
// exemption open for exactly this structural pass. A row for a file with no raw box left is not
// harmless: 13-08's finding is that such a row exempts a file in BOTH directions, permanently, so it
// would go on quietly licensing the next box somebody adds here.
//
// UNTOUCHED, AND DELIBERATELY SO (D-130 / GATE-NOREG 6): the save path, the client-side overlap math,
// the validation message and `weeklyHoursSchema`. The client form is still never the authority, and
// nothing above or below is allowed to become a second opinion about what may be saved.
//
// THE PREVIEW IS NEW, AND IT IS FED FROM LIVE FORM STATE. `WeekStrip` draws the week the host is
// currently typing from the SAME watched value the overlap math already reads — not `initialWindows`,
// and not a re-read after a save. That is D-152's whole point: a window typed at the wrong end of the
// day is visible before the round-trip. The strip derives and announces; it validates nothing.
//
// THE WEEKDAY NAMES, THE ON-THE-HOUR OPTIONS AND THE HOUR PARSER NOW HAVE ONE OWNER. All three used to
// be declared here and again in `lib/availability/week-strip.ts`; the selects and the strip's sentences
// read from the same map now, so what a host picks and what a screen reader announces are the same
// string by construction rather than by two lists happening to agree. The parser came across in its
// STRICTER form — it refuses a one-character hour fragment — because 14-04 found the loose spelling
// drawing a bar for a value the shared schema would refuse, and a second parser here is how that
// returns. Nothing about the option values, their order or their rendered labels changed.

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// F-1 (QUICK 260824-dbc) — AN IMPOSSIBLE WINDOW NOW NAMES ITS REASON ON ITS OWN ROW
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// PHASE 14's UAT PASS FOUND THE STRIP'S EMPTY COLUMN WAS THE ONLY PRE-SAVE SIGNAL. A host whose Monday
// read 5 AM – 6 AM and who dragged the OPEN time to the evening landed on 6 PM → 6 AM, and the product
// said nothing else at all: no message under the row, no alert, Save still enabled. The PM ruled
// "explain on the row and leave the button pressable" — the host learns what is wrong without the UI
// second-guessing them, and the server stays the authority on what may be stored.
//
// THE MECHANISM WAS MEASURED, NOT ASSUMED. The UAT log offered a hypothesis and said in as many words
// that it was not a diagnosis. Probed before anything was built on it, and it holds: `hoursWindowSchema`
// hangs its refusal on the CLOSE field's path, while react-hook-form's onChange path looks an error up
// at the path of the field that CHANGED — walking `windows.N.openTime` → `windows.N`, finding nothing,
// and writing only that empty result into form state. The sibling's issue was computed by the resolver
// on every keystroke and then discarded. The proof it was computed: pressing Save in that same state
// rendered the sentence and did NOT call the server action.
//
// SO THE FIX ADDS NO RULE AND NO SENTENCE. The `<FormMessage />` under the close select was already
// correct and already wired; the open select simply asks the resolver about its own row's close field
// after a change, so the answer lands at the path the message reads. `weeklyHoursSchema` remains the
// ONE authority for both the rule and its wording, on the client and on the server.
//
// ⚠ SAVE IS NOT GATED ON CLIENT VALIDITY, AND MUST NOT BECOME SO (D-130). It is disabled only while a
// save is in flight. `saveOperatingHours` re-validates every write with this same schema and refuses
// what the schema refuses; a client that greys the button has quietly appointed itself a second
// authority on what can be stored. `tests/availability/week-strip.test.tsx` case (12) fails on it.

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
import { PanelCard } from "@/components/patterns/panel-card";
import { WeekStrip } from "@/components/availability/week-strip";
// The three values this file used to declare for itself, from their one owner. The weekday names keep
// their local name through an alias so the seven-row render below is textually unchanged — a container
// swap that also renamed an identifier in the body would make "nothing else moved" unverifiable by diff.
import {
  HOUR_OPTIONS,
  WEEKDAY_NAMES as WEEKDAYS,
  toHour,
} from "@/lib/availability/week-strip";

export type WeeklyHoursWindow = {
  dayOfWeek: number;
  openTime: string; // "HH:mm" (page normalizes the DB "HH:mm:ss" via .slice(0, 5))
  closeTime: string; // "HH:mm"
};

/** RHF stores an array-root custom issue (the overlap message) on `windows` — read it defensively. */
type WindowsRootError = { message?: string; root?: { message?: string } } | undefined;

export function WeeklyHoursEditor({
  listingId,
  cityLabel,
  gmtLabel,
  initialWindows,
}: {
  listingId: string;
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
      <p className="text-sm text-muted-foreground">
        {`These hours are in your space's local time — ${cityLabel} (${gmtLabel}).`}
      </p>

      {hasNoWindows && (
        // The advisory, at the muted tone. `title` and `description` land in the pattern's own
        // `space-y-1` pair, which is the spacing this box already had — the words are unchanged.
        //
        // `titleAs="h3"` because this advisory sits INSIDE the route's own `<h2>Weekly hours</h2>`
        // section and is subordinate to it (WR-03). It shipped as a real `<h3>` before 14-12 moved it
        // onto the pattern, and the pattern's fixed `<h2>` silently promoted it — the same reasoning
        // `blocks-editor.tsx` writes out beside its own `titleAs="h3"` one file over.
        <PanelCard
          tone="muted"
          titleAs="h3"
          title="Set your weekly hours"
          description="Tell bookers when your space is open. Add open and close times for each day — you can add more than one block per day."
        />
      )}

      {/* THE PREVIEW, ABOVE THE DAY EDITOR AND FED FROM THE LIVE VALUE (D-152). `liveWindows` is the
          same watched array the overlap math below reads, so the drawn week is what the host is
          typing rather than what was last saved. The strip's input type already accepts this sparse
          mid-edit shape, so it passes straight in with no cast and no pre-filter. */}
      <WeekStrip windows={liveWindows} cityLabel={cityLabel} />

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <PanelCard>
            {/* The dividing rule stays on the LIST rather than on the panel: the pattern owns the
                box and takes no class name, and the rule between day rows is a property of the rows. */}
            <div className="divide-y">
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
                                {/* F-1 — THE OPEN SELECT RE-ASKS ABOUT ITS OWN ROW'S CLOSE TIME, AND
                                    THAT IS THE WHOLE FIX. See this file's F-1 block above for the
                                    measured mechanism; in one line: the schema hangs its close-after-
                                    open refusal on `closeTime`, and RHF's onChange path only writes
                                    the error it finds at the path of the field that changed — so
                                    changing `openTime` computed the sibling's issue and threw it
                                    away. `trigger` re-runs the SAME resolver and writes the result at
                                    the named path, which is where the `<FormMessage />` below has
                                    been waiting all along. The sentence is deliberately NOT quoted
                                    here: it is `weeklyHoursSchema`'s to own, and a copy in a comment
                                    is the first step to a copy in the markup. */}
                                <Select
                                  value={field.value}
                                  onValueChange={(v) => {
                                    field.onChange(v);
                                    void form.trigger(`windows.${index}.closeTime` as const);
                                  }}
                                >
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
            </div>
          </PanelCard>

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
