// Host availability editor (RSC). Clones edit/page.tsx: reads the session, re-checks canHost (defense in
// depth on top of the (host) layout gate), loads the caller's OWN non-deleted listing, and 404s via
// notFound() if the listing isn't theirs (IDOR — T-03-IDOR-HOURS; existence is never leaked). Then it
// fetches the listing's operating hours + close-only blocks and seeds the two client editors.
//
// CRITICAL round-trip fix (the plan BLOCKER): Postgres `time` round-trips as "HH:mm:ss", but the editor
// Selects and the shared weeklyHoursSchema are on "HH:mm". DB-read openTime/closeTime are therefore
// NORMALIZED via .slice(0, 5) before seeding initialWindows — otherwise re-saving an untouched, DB-origin
// window after a reload would false-reject on server validation.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing, operatingHours, availabilityBlock } from "@/lib/db/schema";
import { getOpenHoursLockState } from "@/lib/listing/hours-lock";
import { composeDateLabel } from "@/lib/booking/when-label";
import { HOURS_LOCKED_MESSAGE } from "@/lib/validation/availability";
import { WeeklyHoursEditor } from "@/components/availability/weekly-hours-editor";
import { BlocksEditor } from "@/components/availability/blocks-editor";
import { PageHeader } from "@/components/patterns/page-header";
import { PanelCard } from "@/components/patterns/panel-card";
import { HOST_PANEL_SHELL } from "@/lib/design/measurements";
import { Toaster } from "@/components/ui/sonner";

/** 0=Sun..6=Sat — the `operating_hours.day_of_week` convention the lock state below reports its weekdays in.
 *  (weekly-hours-editor.tsx keeps its own copy: it is a client component, and the acceptance gate for this
 *  change forbids touching it — so the two lists are deliberately left as they are rather than refactored
 *  into a shared export as a side effect of a lock fix.) */
const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** "Monday", "Monday and Tuesday", "Monday, Tuesday and Wednesday" — never a bare comma list. */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Current short GMT offset for an IANA zone, e.g. "GMT+8" for Asia/Manila. */
function gmtLabelFor(timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    if (name) return name.replace("UTC", "GMT");
  } catch {
    // fall through to the launch-region default
  }
  return "GMT+8";
}

/** A friendly city label: the listing's city, else the IANA tz's city segment (e.g. "Manila"). */
function cityLabelFor(city: string | null, timezone: string): string {
  if (city && city.trim()) return city.trim();
  const seg = timezone.split("/").pop();
  return seg ? seg.replace(/_/g, " ") : "your city";
}

export default async function HostAvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/login");
  }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) {
    redirect("/");
  }

  const rows = await db
    .select()
    .from(listing)
    .where(and(eq(listing.id, id), isNull(listing.deletedAt)));
  const row = rows[0];
  // IDOR guard: not found OR not the caller's → 404 (don't reveal another host's listing exists).
  if (!row || row.hostId !== session.user.id) {
    notFound();
  }

  const [hours, blocks, hoursLock] = await Promise.all([
    db.select().from(operatingHours).where(eq(operatingHours.listingId, id)),
    db.select().from(availabilityBlock).where(eq(availabilityBlock.listingId, id)),
    // CR-03 layer 2 — computed HERE, on the server, from the DB clock, and only for a drop-in listing (the
    // result is empty by construction for an exclusive one, so the query is simply not worth paying for).
    // `saveOperatingHours` is the gate; this render is the courtesy that stops the host discovering the
    // refusal only after they have edited a row (Security V4 / the D-77 courtesy-vs-gate split).
    row.occupancyMode === "open_capacity" ? getOpenHoursLockState(db, id) : Promise.resolve(null),
  ]);

  // BLOCKER fix: Postgres `time` round-trips as "HH:mm:ss"; normalize to "HH:mm" so an untouched,
  // DB-origin window re-validates cleanly against the on-the-hour Selects + shared weeklyHoursSchema.
  const initialWindows = hours.map((h) => ({
    dayOfWeek: h.dayOfWeek,
    openTime: h.openTime.slice(0, 5),
    closeTime: h.closeTime.slice(0, 5),
  }));

  const initialBlocks = blocks.map((b) => ({
    id: b.id,
    unit: b.unit,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    reason: b.reason,
  }));

  const cityLabel = cityLabelFor(row.city, row.timezone);
  const gmtLabel = gmtLabelFor(row.timezone);

  // The advisory's sentence, assembled as ONE string (the cancellation-fee-notice.tsx lesson: SWC's JSX
  // whitespace transform strips the leading space of text following an expression container, which is how
  // "₱300.00in cancellation fees" once shipped). Rendered only when something is actually frozen; the
  // unlock date is formatted server-side, venue-local with the zone named (D-105).
  const lockedDays = hoursLock?.lockedWeekdays ?? [];
  const lockNotice =
    hoursLock && lockedDays.length > 0 && hoursLock.unlocksAt
      ? `${HOURS_LOCKED_MESSAGE} ${joinNames(lockedDays.map((d) => WEEKDAY_LABELS[d]))} ` +
        `${lockedDays.length === 1 ? "is" : "are"} held by ${hoursLock.lockedByCount} ` +
        `pass${hoursLock.lockedByCount === 1 ? "" : "es"} still to come — the last is for ` +
        `${composeDateLabel(hoursLock.unlocksAt, row.timezone, row.city)}. To change them sooner, ` +
        `cancel those passes first — that refunds those guests in full. `
      : null;

  return (
    // The container is the DECLARED host-panel shell; the section rhythm stays at this call site,
    // because vertical rhythm BETWEEN a container's children is not a measurement of the container
    // (the constant's own docblock says so, and folding it in would hand this route's rhythm to three
    // others). Same composition as `/host` and its plate.
    <div className={`${HOST_PANEL_SHELL} space-y-8`}>
      {/* WR-04: mount Toaster exactly once at the shared ancestor so a toast from either editor
          (WeeklyHoursEditor / BlocksEditor) renders a single time, not once per mounted region. */}
      <Toaster />

      {/* The title block is the DECLARED pattern with the two SHIPPED strings. The `<h1>` moves one
          step down the type scale in doing so — the pattern's contract is the heading step every other
          host page's title already renders at, and this route was the outlier. */}
      <PageHeader
        title="Availability"
        lede="Set when your space is open and block off any dates you can't host."
      />

      {/* THE TWO ADVISORIES, EACH ON THE DECLARED ADVISORY SURFACE at the muted tone. Both were bare
          paragraphs stacked under the heading, which is the one place on this route where an advisory
          had no surface of its own. Every word is byte-identical; only the box is new.

          They compose the pattern through DIFFERENT slots, and the split is forced rather than a
          preference: the drop-in note is one sentence and rides the `description` prop, which renders
          exactly the muted paragraph element it had. The lock notice ends in a LINK, and `description`
          is typed as a string — so it renders through `children`, keeping its own paragraph and its
          own way out. */}
      {/*
        09-UI-SPEC § 1g — ONE line, no redesign. This editor is UNCHANGED for a drop-in listing: the same
        weekly hours still define when the space is open. What changes is what those hours MEAN. For a
        whole-space listing they are the bookable slots; for a drop-in listing they are the entry window
        a pass is good for (OC-03), and the booker never picks an hour at all. A host who reads this
        screen as "the times people can book" would be quietly wrong about their own calendar, which is
        why the line is here and not left to be inferred.
      */}
      {row.occupancyMode === "open_capacity" && (
        <PanelCard
          tone="muted"
          description="These are the hours your drop-in passes are good for. A pass covers the whole day you're open."
        />
      )}
      {/*
        CR-03 layer 2 / 09-UI-SPEC O7 — WHY those weekdays are frozen, WHEN the freeze lifts, and the WAY
        OUT. Calm muted information, never an alarm (§ Color — this phase ships no alert variant on any
        host surface): nothing has gone wrong, the host simply cannot move hours that passes are already
        sold against. It names weekdays and a date only — never a booker — and renders inside the
        already owner-gated (host) page from the same `row` that page loaded. The sentence is still
        ASSEMBLED above from the shared constant and this listing's own lock state; nothing about it is
        retyped here, and no weekday, date or duration appears in this element.
      */}
      {lockNotice && (
        <PanelCard tone="muted">
          <p className="text-sm text-muted-foreground">
            {lockNotice}
            <Link href="/host/bookings" className="underline underline-offset-4">
              View your bookings
            </Link>
          </p>
        </PanelCard>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Weekly hours</h2>
        <WeeklyHoursEditor
          listingId={row.id}
          cityLabel={cityLabel}
          gmtLabel={gmtLabel}
          initialWindows={initialWindows}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Blocked dates</h2>
        <BlocksEditor
          listingId={row.id}
          unitCount={row.unitCount}
          timezone={row.timezone}
          cityLabel={cityLabel}
          initialBlocks={initialBlocks}
        />
      </section>
    </div>
  );
}
