"use client";

// Host close-only blocks editor (AVAIL-02 · D-24). Lists existing blocks and composes an AddBlockDialog
// (calendar + whole-day/partial + whole-listing/unit) that calls the Plan-03 addBlock/removeBlock server
// actions. Client RHF + Zod is UX only; the server re-validates with the SAME blockSchema and owns the
// write (CLAUDE.md "never trust the client"; mirrors edit/wizard.tsx + the shadcn dialog usage).
//
// Blocks are close-only/subtractive: "add" inserts a row the read model subtracts; removing a block opens
// those times for booking again. Every removal is REVERSIBLE and NEUTRAL (never a hard/red action) — a
// light confirm dialog, a neutral Remove button (UI-SPEC Color). Unit targeting is shown ONLY when the
// listing has more than one unit (unitCount > 1); otherwise the block always targets the whole listing.
//
// Block start/end are stored as UTC timestamptz by the server (from the venue tz); here we render them
// back in the venue's local time with date-fns + @date-fns/tz so the host sees their own wall clock.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT PLAN 14-13 CHANGED: THE CONTAINERS AND THE OVERLAY. NOTHING ELSE IN THIS FILE MOVED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The block CRUD, the reason mapper, the date/time derivation, the validation message and every
// server call are byte-unchanged. Three shapes were swapped, each forced by a recorded decision:
//
//   1. D-155 — THIS FILE LEAVES THE RAW-CARD EXEMPTION, AND ITS ALLOW-LIST ROW IS DELETED IN THE SAME
//      COMMIT. `11-13-SUMMARY.md:234-235` held two exemptions open for exactly this phase; plan 14-12
//      spent the weekly-hours half and this plan spends the second. A row for a file with no raw box
//      left is not harmless — 13-08's finding is that a row exempts a file in BOTH directions,
//      forever, so it would go on licensing the next hand-rolled box somebody adds here.
//
//   2. THE NO-BLOCKED-DATES BOX IS A GENUINE EMPTY LIST, so it takes the shared empty-state pattern.
//      This is the distinction the hours editor's guidance box did NOT satisfy and its own inventory
//      row records: there, seven day rows always render, so the box is an advisory about a form that
//      is fully present. Here the list is really absent. `actions={null}` on purpose — the `Add block`
//      control is already adjacent and above, and a second copy of it inside the panel would be one
//      affordance rendered twice.
//
//   3. THE TWO OVERLAYS MOVE ONTO THE APP'S ONE OVERLAY PRIMITIVE (RESP-01). `ResponsiveDialog`
//      composes the SAME vendored dialog this file used directly; what it adds is the below-`sm:`
//      bottom-sheet presentation, which is the whole reason a host confirming on a phone gets a
//      reachable footer. Both confirms keep their copy byte-for-byte. Two consequences worth naming:
//      the dismiss buttons close through the SAME state handler the overlay's own dismissals run
//      (so the add-block form still resets on every close, which a bare state setter would have
//      skipped), and neither overlay supplies a distinct close-control name — that prop exists for a
//      route where two overlays are reachable AT ONCE, and these two are mutually exclusive by
//      construction: the open one traps focus, so the other's trigger cannot be pressed.
//      `onCloseAutoFocus` is left undefined in both, which is correct for a stable trigger — the
//      pattern's own prop docs name that as the condition.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { CalendarOffIcon, PlusIcon } from "lucide-react";

import { blockSchema, type BlockInput } from "@/lib/validation/availability";
import { blockReasonLabel } from "@/lib/availability/block-reason";
import { addBlock, removeBlock } from "@/app/actions/blocks";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/empty-state";
import { PanelCard } from "@/components/patterns/panel-card";
import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";

export type BlockRow = {
  id: string;
  unit: number | null; // null = whole listing
  startsAt: string; // ISO (UTC)
  endsAt: string; // ISO (UTC)
  reason: string | null;
};

/** On-the-hour "HH:mm" options (00:00..23:00) for a partial-range block. */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const value = `${String(h).padStart(2, "0")}:00`;
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { value, label: `${hour12}:00 ${period}` };
});

export function BlocksEditor({
  listingId,
  unitCount,
  timezone,
  cityLabel,
  initialBlocks,
}: {
  listingId: string;
  unitCount: number;
  timezone: string;
  cityLabel: string;
  initialBlocks: BlockRow[];
}) {
  const inTz = tz(timezone);

  function describe(b: BlockRow): { date: string; time: string; target: string } {
    const start = new Date(b.startsAt);
    const end = new Date(b.endsAt);
    const startHM = format(start, "HH:mm", { in: inTz });
    const endHM = format(end, "HH:mm", { in: inTz });
    const isAllDay = startHM === "00:00" && endHM === "00:00";
    return {
      date: format(start, "EEE, MMM d, yyyy", { in: inTz }),
      time: isAllDay
        ? "All day"
        : `${format(start, "h:mm a", { in: inTz })} – ${format(end, "h:mm a", { in: inTz })}`,
      target: b.unit === null ? "Whole space" : `Unit ${b.unit}`,
    };
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {`Times shown in ${cityLabel} time.`}
        </p>
        <AddBlockDialog listingId={listingId} unitCount={unitCount} timezone={timezone} />
      </div>

      {initialBlocks.length === 0 ? (
        // The absence of a LIST, which is what this pattern is for. The sentence is the shipped one,
        // word for word; `titleAs="h3"` because the page already heads this region with its own
        // second-level "Blocked dates", and a heading level is a property of the outline it sits in.
        // The tone is left neutral: an unblocked calendar is the normal state of a working listing,
        // not an achievement and not a failure.
        <EmptyState
          icon={CalendarOffIcon}
          titleAs="h3"
          title="No blocked dates"
          body="Block off dates or times when your space isn't available — holidays, maintenance, or personal use. Bookers won't see blocked times."
          actions={null}
        />
      ) : (
        <PanelCard>
          {/* The dividing rule stays on the LIST rather than on the panel — the pattern owns the box
              and takes no class name, and the rule between date rows is a property of the rows. The
              list itself adds no padding: the panel's own is the outer bound, so the first and last
              rows give their vertical rhythm back rather than paying it twice. */}
          <div className="divide-y">
            {initialBlocks.map((b) => {
              const d = describe(b);
              const reasonLabel = blockReasonLabel(b.reason);
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="space-y-0.5 text-sm">
                    <p className="font-semibold">{d.date}</p>
                    <p className="text-muted-foreground">
                      {d.time} · {d.target}
                      {reasonLabel ? ` · ${reasonLabel}` : ""}
                    </p>
                  </div>
                  <RemoveBlockButton listingId={listingId} blockId={b.id} />
                </div>
              );
            })}
          </div>
        </PanelCard>
      )}
    </div>
  );
}

/** The light, reversible, NEUTRAL confirm for opening blocked times back up. */
function RemoveBlockButton({ listingId, blockId }: { listingId: string; blockId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    const res = await removeBlock(listingId, blockId);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Block removed");
    setOpen(false);
    router.refresh();
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title="Remove this block?"
      description="Those times will open for booking again."
      trigger={
        <Button type="button" variant="secondary" size="sm" className="min-h-11">
          Remove block
        </Button>
      }
      footer={
        <>
          {/* The dismiss was a vendored close primitive; it is the same neutral control with the same
              word, closing through the state this overlay is already driven by. */}
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setOpen(false)}
          >
            Keep block
          </Button>
          <Button type="button" variant="secondary" className="min-h-11" disabled={busy} onClick={confirm}>
            {busy ? "Removing…" : "Remove block"}
          </Button>
        </>
      }
    />
  );
}

/** Add a close-only block: date → whole-day/partial → whole-listing/unit → optional reason. */
function AddBlockDialog({
  listingId,
  unitCount,
  timezone,
}: {
  listingId: string;
  unitCount: number;
  timezone: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const form = useForm<BlockInput>({
    resolver: zodResolver(blockSchema),
    defaultValues: {
      date: "",
      wholeDay: true,
      startTime: undefined,
      endTime: undefined,
      unit: null,
      reason: "",
    },
  });

  const wholeDay = useWatch({ control: form.control, name: "wholeDay" });
  const unit = useWatch({ control: form.control, name: "unit" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function reset() {
    form.reset({
      date: "",
      wholeDay: true,
      startTime: undefined,
      endTime: undefined,
      unit: null,
      reason: "",
    });
    setSelectedDate(undefined);
  }

  function onDatePick(d: Date | undefined) {
    setSelectedDate(d);
    form.setValue("date", d ? format(d, "yyyy-MM-dd", { in: tz(timezone) }) : "", {
      shouldValidate: false,
    });
    form.clearErrors("date");
  }

  async function onSave() {
    // The calendar always yields a valid YYYY-MM-DD, so the only date failure is "none picked" —
    // show the friendly copy rather than the schema's raw-format message.
    if (!form.getValues("date")) {
      form.setError("date", { message: "Choose a date to block." });
      return;
    }
    await form.handleSubmit(async (values) => {
      setSaving(true);
      const res = await addBlock(listingId, {
        date: values.date,
        wholeDay: values.wholeDay,
        startTime: values.wholeDay ? undefined : values.startTime,
        endTime: values.wholeDay ? undefined : values.endTime,
        unit: values.unit ?? null,
        reason: values.reason?.trim() ? values.reason.trim() : undefined,
      });
      setSaving(false);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Block added");
      setOpen(false);
      reset();
      router.refresh();
    })();
  }

  /** Every close runs through here — the overlay's own dismissals AND the footer's Cancel. */
  function onOpenChange(o: boolean) {
    setOpen(o);
    if (!o) reset();
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Block dates"
      description="Close off a whole day or a time range. Bookers won't see blocked times."
      trigger={
        <Button type="button" className="min-h-11">
          <PlusIcon className="size-4" /> Add block
        </Button>
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" className="min-h-11" disabled={saving} onClick={onSave}>
            {saving ? "Saving…" : "Save block"}
          </Button>
        </>
      }
    >
      <Form {...form}>
        <div className="space-y-4">
          {/* Date -------------------------------------------------------------- */}
          <div className="space-y-2">
            <Label>Date</Label>
            <div className="rounded-lg border">
              <Calendar
                mode="single"
                timeZone={timezone}
                selected={selectedDate}
                onSelect={onDatePick}
                disabled={{ before: today }}
                className="w-full"
              />
            </div>
            {form.formState.errors.date && (
              <p className="text-sm text-muted-foreground" role="alert">
                {form.formState.errors.date.message}
              </p>
            )}
          </div>

          {/* Whole day vs partial --------------------------------------------- */}
          <div className="space-y-2">
            <Label>How much of the day?</Label>
            <RadioGroup
              value={wholeDay ? "whole" : "partial"}
              onValueChange={(v) => form.setValue("wholeDay", v === "whole")}
              className="gap-2"
            >
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                <RadioGroupItem value="whole" /> <span className="text-sm">Whole day</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                <RadioGroupItem value="partial" /> <span className="text-sm">Part of the day</span>
              </label>
            </RadioGroup>
          </div>

          {!wholeDay && (
            <div className="flex items-start gap-2">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>From</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full" aria-label="Block start time">
                          <SelectValue placeholder="Start" />
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
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>To</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-11 w-full" aria-label="Block end time">
                          <SelectValue placeholder="End" />
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
            </div>
          )}

          {/* Whole listing vs one unit (only when unitCount > 1) --------------- */}
          {unitCount > 1 && (
            <div className="space-y-2">
              <Label>What&apos;s blocked?</Label>
              <Select
                value={unit === null || unit === undefined ? "whole" : String(unit)}
                onValueChange={(v) =>
                  form.setValue("unit", v === "whole" ? null : parseInt(v, 10))
                }
              >
                <SelectTrigger className="h-11 w-full" aria-label="Blocked unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whole">Whole space</SelectItem>
                  {Array.from({ length: unitCount }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      Unit {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Block one unit and the rest of your space stays bookable.
              </p>
            </div>
          )}

          {/* Optional reason -------------------------------------------------- */}
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason (optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Court resurfacing"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </ResponsiveDialog>
  );
}
