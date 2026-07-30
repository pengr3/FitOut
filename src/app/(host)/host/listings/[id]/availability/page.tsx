// Host availability editor (RSC). Clones edit/page.tsx: reads the session, re-checks canHost (defense in
// depth on top of the (host) layout gate), loads the caller's OWN non-deleted listing, and 404s via
// notFound() if the listing isn't theirs (IDOR — T-03-IDOR-HOURS; existence is never leaked). Then it
// fetches the listing's operating hours + close-only blocks and seeds the two client editors.
//
// CRITICAL round-trip fix (the plan BLOCKER): Postgres `time` round-trips as "HH:mm:ss", but the editor
// Selects and the shared weeklyHoursSchema are on "HH:mm". DB-read openTime/closeTime are therefore
// NORMALIZED via .slice(0, 5) before seeding initialWindows — otherwise re-saving an untouched, DB-origin
// window after a reload would false-reject on server validation.

import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { listing, operatingHours, availabilityBlock } from "@/lib/db/schema";
import { WeeklyHoursEditor } from "@/components/availability/weekly-hours-editor";
import { BlocksEditor } from "@/components/availability/blocks-editor";
import { Toaster } from "@/components/ui/sonner";

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

  const [hours, blocks] = await Promise.all([
    db.select().from(operatingHours).where(eq(operatingHours.listingId, id)),
    db.select().from(availabilityBlock).where(eq(availabilityBlock.listingId, id)),
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
      {/* WR-04: mount Toaster exactly once at the shared ancestor so a toast from either editor
          (WeeklyHoursEditor / BlocksEditor) renders a single time, not once per mounted region. */}
      <Toaster />

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
        <p className="text-sm text-muted-foreground">
          Set when your space is open and block off any dates you can&apos;t host.
        </p>
        {/*
          09-UI-SPEC § 1g — ONE line, no redesign. This editor is UNCHANGED for a drop-in listing: the same
          weekly hours still define when the space is open. What changes is what those hours MEAN. For a
          whole-space listing they are the bookable slots; for a drop-in listing they are the entry window
          a pass is good for (OC-03), and the booker never picks an hour at all. A host who reads this
          screen as "the times people can book" would be quietly wrong about their own calendar, which is
          why the line is here and not left to be inferred.
        */}
        {row.occupancyMode === "open_capacity" && (
          <p className="text-sm text-muted-foreground">
            These are the hours your drop-in passes are good for. A pass covers the whole day
            you&apos;re open.
          </p>
        )}
      </div>

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
