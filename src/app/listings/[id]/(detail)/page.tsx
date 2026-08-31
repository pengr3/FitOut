// The PUBLIC, un-authenticated listing detail page (LIST-06 / D-13).
//
// This RSC is placed OUTSIDE the (app)/(host) route groups on purpose: those layouts call
// auth.api.getSession() and redirect, whereas LIST-06 requires that ANYONE — with no session — can
// view a PUBLISHED listing. It inverts the gate of (app)/profile/page.tsx: no redirect, render for the
// anonymous public.
//
// IT NOW LIVES IN A ROUTE GROUP OF ITS OWN, AND THAT DOES NOT WEAKEN THE SENTENCE ABOVE (plan 11-10).
// The file moved from `listings/[id]/page.tsx` to `listings/[id]/(detail)/page.tsx`. The URL is
// unchanged — a parenthesised segment is erased from the path — and no ancestor of this route reads a
// session and redirects. The move exists so that `/listings/[id]/book`, which is a SIBLING of
// `(detail)` rather than a child of this page's layout, can present the minimal SHELL-03 header while
// this page gets the full public one. See `(detail)/layout.tsx` for the whole argument.
//
// Security boundaries enforced here:
//   - T-05-NONPUB: only status === "published" (and non-deleted) listings render; draft/unlisted and
//     missing ids notFound() (404) so non-public listings are never viewable by link.
//   - T-05-PII: the row is projected through publicListing() — the exact street + exact coordinates are
//     withheld unless the host set showExactAddress (D-09); the map draws a fuzzed circle otherwise.
//   - T-05-OWNERLEAK: host info shown comes from the Phase-1 publicProfile() allow-list, never raw user.
//   - T-05-BOOKABLE: the book CTA is derived from deriveBookable() (status + emailVerified +
//     payoutsEnabled), never from status alone — a published-but-not-payable listing shows a disabled
//     "Not bookable yet" affordance (payoutsEnabled is false until Plan 06 wires PayMongo). Real
//     booking is Phase 4+, so the coral CTA is a state-reflecting placeholder.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { format } from "date-fns";
import { tz, TZDate } from "@date-fns/tz";
import { UsersIcon } from "lucide-react";

import { db } from "@/lib/db";
import { getAvailability, getOpenMonthAvailability } from "@/lib/availability/read-model";
import { DISPLAY_CURRENCY } from "@/lib/money";
import { allInRateParts } from "@/lib/booking/all-in-rate";
import { buildAllInTable } from "@/lib/booking/all-in-table";
import {
  listing,
  user,
  hostPayout,
  hostVerification,
  listingPhoto,
  listingAmenity,
  listingActivityTag,
} from "@/lib/db/schema";
import { deriveBookable } from "@/lib/bookability";
import { isPubliclyViewable } from "@/lib/listing/public-listing";
import { listingHasOperatingHours } from "@/lib/listing/hours-signal";
import { publicListing } from "@/lib/listing-public";
import { publicProfile } from "@/lib/profile";
import {
  SPACE_TYPE_LABELS,
  AMENITY_LABELS,
  ACTIVITY_TAG_LABELS,
  type AmenityValue,
  type ActivityTagValue,
} from "@/lib/listing-vocab";
import { PhotoGallery } from "@/components/listing/photo-gallery";
import { ListingMapPanel } from "@/components/listing/listing-map-panel";
import { DropInBadge } from "@/components/listing/drop-in-badge";
import { HostBlock } from "@/components/listing/host-block";
import { KeyFacts } from "@/components/listing/key-facts";
import { Badge } from "@/components/ui/badge";
import { PanelCard } from "@/components/patterns/panel-card";
import { Separator } from "@/components/ui/separator";
import {
  AvailabilityCalendar,
  BookingSelectionProvider,
} from "@/components/availability/availability-calendar";
// RESP-02 / D-48 — the booking interaction as ONE component, mounted twice. Everything the rail used to
// spell out inline (the summary, the CTA and the not-bookable affordance) lives there now, so the sheet
// renders the identical thing rather than a second copy of it. See that file's header for what
// `placement` selects and, more importantly, for what it may never select.
import { BookingPanel } from "@/components/availability/booking-panel";
import { BookingStickyBar } from "@/components/booking/booking-sticky-bar";
import { CancellationPolicyDisclosure } from "@/components/booking/cancellation-policy-disclosure";
import { RailRateHeadline } from "@/components/booking/rail-rate-headline";
import { placeHold, placeOpenHold } from "@/app/actions/booking";
import {
  NO_SEARCHED_WINDOW,
  openHoldSchema,
  searchedWindowSchema,
  slotSelectionSchema,
} from "@/lib/validation/booking";
import { BOOKING_HORIZON_DAYS } from "@/lib/availability/horizon";
import type { DayAvailability } from "@/lib/availability/read-model";
// Type-only, so nothing from the picker's client module enters this RSC's graph — the shape is defined
// in the DOM-free gesture core the picker itself re-exports.
import type { SlotSelectionValue } from "@/components/availability/slot-selection";
// venue-tz labels + the shared DISPLAY_CURRENCY are now imported (Plan 07 promoted both out of this file
// so the reserve + confirmation surfaces share ONE source and can never drift from the listing page).
import { gmtLabelFor, cityLabelFor } from "@/lib/venue-time";
import { listingCardFacts, listingShareDescription } from "@/lib/listing/og-facts";
import { devTodayOverride } from "@/lib/dev/today-override";

/**
 * SHELL-04 — what this page's link says about itself when it is pasted somewhere.
 *
 * THIS ROUTE HAD NO `metadata` EXPORT AT ALL before this change, so every space in the catalogue
 * shared the root layout's tab title ("FitOut") and the root description. A marketplace whose
 * listing links are indistinguishable from each other in a browser's history, a bookmark bar, a
 * search result and a chat preview is a marketplace whose links are not worth sharing.
 *
 * THE TITLE IS RETURNED BARE. `src/app/layout.tsx:107` declares `template: "%s · FitOut"`, so
 * returning `"Poblacion Pickleball Court"` renders `<title>Poblacion Pickleball Court · FitOut</title>`
 * — and returning the suffix here would render it twice. That template is exactly why route files
 * must not hand-write the suffix.
 *
 * ⚠ THERE IS NO `openGraph` KEY HERE, AND ADDING ONE IS THE REGRESSION TO WATCH FOR. It reads like an
 * omission — `og:title` and `og:description` are separate tags from `<title>` and
 * `<meta name="description">`, so declaring them looks like the thorough thing to do. It is the
 * opposite. MEASURED on Next 16.2.7, dev, `/listings/seed_listing_1`, with the `opengraph-image.tsx`
 * file in place and nothing else changed between the two runs:
 *
 *   with `openGraph: { type: "website", description }`   →  og:title, og:description, og:type.
 *                                                           NO og:image. NO og:image:width/height/
 *                                                           type/alt. twitter:card = "summary".
 *   with the key absent (what ships)                     →  og:title, og:description, og:image,
 *                                                           og:image:type, :width, :height, :alt,
 *                                                           twitter:card = "summary_large_image"
 *                                                           and the four twitter:image tags.
 *
 * Declaring `openGraph` REPLACES the resolved object, and the `opengraph-image.tsx` file convention
 * merges into it only while it is undefined. So the thorough-looking edit deletes the share card and
 * downgrades the Twitter card to the small one, with every tag it *did* add still present — i.e. it
 * looks more complete and is strictly worse. Absent the key, Next derives `og:title` / `og:description`
 * from the two fields below and supplies the image, its dimensions, its type and its alt for free.
 * `tests/design/og-routes.test.ts` does not assert this; a `curl` of the head does, and both runs are
 * recorded in 11-20-SUMMARY.md.
 *
 * ONE READ, SHARED WITH THE CARD. `listingCardFacts` is `cache()`d, and the composed sentence lives
 * beside it, so the description and the image can never name different spaces.
 *
 * A LISTING THAT DOES NOT RESOLVE RETURNS `{}` rather than a "not found" title: this function runs
 * for the same ids the page below 404s on, and the not-found boundary owns what that says. Inventing
 * a title here would put copy about a missing listing in two places.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const facts = await listingCardFacts(id);
  if (!facts) return {};

  const description = listingShareDescription(facts);
  return {
    title: facts.title,
    description,
  };
}

/**
 * Turn a searched venue-local hour window into a slot selection — but ONLY if the read model says every
 * hour in it is free (D-59 #1 · T-12-02-SEEDTRUST).
 *
 * THE SERVER DECIDES, and it decides from the SAME `DayAvailability` the grid is about to render, so the
 * seeded run and the chips can never disagree. The returned instants are the read model's OWN slot
 * boundaries — never recomputed from the hour integers — because deriving an instant from a wall-clock
 * hour is where DST bugs enter a booking app (CLAUDE.md), and the read model has already done it once.
 *
 * Any miss returns null: an hour that is occupied, blocked, past, too-soon or simply outside the host's
 * operating hours. That is the honest outcome — the booker lands on the day they searched with nothing
 * pre-picked, rather than on a highlighted run that would be refused at hold time.
 */
function seedSelectionFromWindow(
  dayAvail: DayAvailability | null,
  timezone: string,
  startHour: number | null,
  endHour: number | null,
): SlotSelectionValue | null {
  if (!dayAvail || startHour === null || endHour === null || endHour <= startHour) return null;

  const inTz = tz(timezone);
  const free = dayAvail.slots.filter((s) => s.state === "available");
  const hourOf = (iso: string) => Number(format(new Date(iso), "H", { in: inTz }));

  const run = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const slot = free.find((s) => hourOf(s.startUtc) === hour);
    if (!slot) return null; // any hour in the searched window is not free → seed the day, not the window
    run.push(slot);
  }

  const first = run[0];
  const last = run[run.length - 1];
  if (!first || !last) return null;
  return { startUtc: first.startUtc, endUtc: last.endUtc, fullDay: false };
}

export default async function PublicListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    start?: string;
    end?: string;
    fullDay?: string;
    resume?: string;
    /** Phase-9 (OPEN-02) — the drop-in resume pair; a pass has a date and a count, never a window. */
    date?: string;
    passes?: string;
    /**
     * 17-D26 — the venue-local "today" override, honoured OUTSIDE production ONLY and ignored
     * everywhere else. It exists so the GATE-01 visual baselines that photograph this page's calendar
     * stop expiring at the next day-rollover. See `@/lib/dev/today-override`, which owns both guards.
     */
    today?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  // Sign-in resume (D-41): after signing in at Book, the CTA returns here with the selected window in the
  // URL + resume=1. Re-validate the SHAPE (end>start, ISO) and hand it to the CTA to auto-resume checkout,
  // so the booker never re-picks the slot. Anything malformed simply drops the resume (no crash).
  const resumeParsed =
    sp.resume === "1"
      ? slotSelectionSchema.safeParse({ startUtc: sp.start, endUtc: sp.end, fullDay: sp.fullDay === "1" })
      : null;
  const resumeWindow = resumeParsed?.success ? resumeParsed.data : null;

  // D-59 #1 — THE WINDOW THE BOOKER SEARCHED, finally read (plan 12-02).
  //
  // `search-result-card.tsx` has written `?date=YYYY-MM-DD&start=HH:mm&end=HH:mm` onto every listing
  // link since Phase 3, and its header has always said the purpose is "so the listing calendar can
  // pre-open that day". Nothing read it: the block above parsed `start`/`end` ONLY behind `resume=1`,
  // and `initialDate` further down was unconditionally venue-local today. A booker who told us Friday
  // 9–11 AM on the search page was asked for it a second time on arrival.
  //
  // PARSED UNCONDITIONALLY, AND THAT IS SAFE PRECISELY BECAUSE IT IS ITS OWN SHAPE. `start` carries two
  // formats on this route — a venue-local `HH:mm` from the card and a UTC ISO instant on the `resume=1`
  // path — so this reads through `searchedWindowSchema` while the block above keeps its untouched
  // `slotSelectionSchema` parse. `resume=1` stays the discriminator, `slotSelectionSchema` stays
  // byte-unchanged, and the two schemas are asserted to reject each other's format in
  // `tests/validation/search-window.test.ts`. A malformed value yields no window and the default view —
  // never a throw, never a 404 (T-12-02-PARAMTAMPER).
  const searchedParsed = searchedWindowSchema.safeParse({
    date: sp.date,
    start: sp.start,
    end: sp.end,
  });
  const searched = searchedParsed.success ? searchedParsed.data : NO_SEARCHED_WINDOW;

  // Fetch the listing + host + cached payout flag + ops verification row in one query (LEFT JOIN so a
  // host with no payout row and no verification row still resolves — payoutsEnabled just defaults false
  // and verificationStatus defaults "unverified"). deletedAt IS NULL excludes soft-deleted rows.
  //
  // The phase-18 verification read JOINS THIS EXISTING QUERY rather than becoming a fifth element of the
  // Promise.all below: this select was already reaching the host row, so the sixth deriveBookable term
  // costs one more LEFT JOIN and zero extra round trips.
  const rows = await db
    .select()
    .from(listing)
    .innerJoin(user, eq(listing.hostId, user.id))
    .leftJoin(hostPayout, eq(hostPayout.userId, user.id))
    .leftJoin(hostVerification, eq(hostVerification.userId, user.id))
    .where(and(eq(listing.id, id), isNull(listing.deletedAt)));
  const row = rows[0];

  // Draft/unlisted/missing → 404 to the public (D-13). Only published listings are viewable by link.
  //
  // ⚠ THIS GUARD NO LONGER SETS THE HTTP STATUS, AND IT IS STILL REQUIRED. `loading.tsx` puts a
  // Suspense boundary around this page, so by the time this line runs the shell has been flushed and
  // the status line is spent — `(detail)/layout.tsx` is what wins the 404 now, by asserting the same
  // rule above the boundary. This call remains because it is what narrows `row` for everything below
  // and what keeps the BODY honest if the two ever disagree. Both go through `isPubliclyViewable` so
  // they cannot: one rule, one expression, two call sites.
  if (!row || !isPubliclyViewable(row.listing.status, row.listing.deletedAt)) {
    notFound();
  }

  const [photoRows, amenityRows, tagRows, hasOperatingHours] = await Promise.all([
    db
      .select()
      .from(listingPhoto)
      .where(eq(listingPhoto.listingId, id))
      .orderBy(asc(listingPhoto.position)),
    db.select().from(listingAmenity).where(eq(listingAmenity.listingId, id)),
    db.select().from(listingActivityTag).where(eq(listingActivityTag.listingId, id)),
    // The FOURTH deriveBookable term (v1.0 audit finding #4). Added as an element of the Promise.all
    // this page was ALREADY awaiting, so it costs no added latency — it rides an existing concurrent
    // batch, and is itself a short-circuiting EXISTS probe on operating_hours_listing_idx.
    listingHasOperatingHours(db, id),
  ]);

  // The sell-gate (never status alone). payoutsEnabled is false until Plan 06 → "Not bookable yet".
  // Moved BELOW the batch above so it can read `hasOperatingHours`; safe because `bookable` is not read
  // until far further down the render, well after this point.
  const bookable = deriveBookable(
    { status: row.listing.status, hasOperatingHours, reviewState: row.listing.reviewState },
    {
      emailVerified: row.user.emailVerified,
      payoutsEnabled: row.host_payout?.payoutsEnabled ?? false,
      // Fail closed on the LEFT JOIN's nullable side, the same shape as payoutsEnabled one line up: a
      // host with no host_verification row is UNVERIFIED, never verified (phase 18, D-224).
      verificationStatus: row.host_verification?.status ?? "unverified",
    },
  );

  // Project to ONLY the public shape — withholds exact street/coords unless showExactAddress (D-09).
  const pub = publicListing(
    {
      ...row.listing,
      photos: photoRows.map((p) => ({ id: p.id, url: p.url, position: p.position })),
      amenities: amenityRows.map((a) => a.amenity),
      activityTags: tagRows.map((t) => t.tag),
    },
    { showExactAddress: row.listing.showExactAddress },
  );

  // Host info via the Phase-1 allow-list (no private fields leak — T-05-OWNERLEAK).
  const host = publicProfile(row.user);

  const title = pub.title ?? "Untitled space";
  const spaceTypeLabel = pub.primarySpaceType ? SPACE_TYPE_LABELS[pub.primarySpaceType] : null;
  const amenityLabels = pub.amenities.map((a) => AMENITY_LABELS[a as AmenityValue] ?? a);
  const activityLabels = pub.activityTags.map((t) => ACTIVITY_TAG_LABELS[t as ActivityTagValue] ?? t);

  // Location summary line + map caption honor the approximate/exact toggle.
  const coarseLocation = [pub.neighborhood, pub.city, pub.region].filter(Boolean).join(", ");
  const exactLocation = [pub.addressLine1, pub.city, pub.region].filter(Boolean).join(", ");
  const mapCaption = pub.showExactAddress
    ? exactLocation || coarseLocation
    : coarseLocation
      ? `Approximate area — ${coarseLocation}. The exact address is shared after booking.`
      : "Approximate area. The exact address is shared after booking.";

  // D-75: search and listing pages display the ALL-IN rate so the number never goes up between browsing
  // and paying. These surfaces create no hold, so nothing is frozen here and the frozen-quote contract is
  // unaffected — the invariant holds because both surfaces and checkout use the SAME SERVICE_FEE_BPS.
  //
  // A RATE, never a promised total. 5% of an hourly rate × N hours can differ by one centavo from 5% of
  // (rate × N hours). Labelling these `/hr` and `/day` means no total is promised until checkout, so the
  // rounding edge cannot break D-75's "never goes up". Do NOT add a computed "estimated total" here —
  // that would create a promise the checkout could break by a centavo.
  //
  // Composed by the SHARED helper both browse surfaces use, so this page and the search grid cannot drift.
  //
  // Phase-9 (OC-01/D-125): the mode and the per-head price are read straight off the LISTING ROW rather
  // than from `pub`, which carries neither. Without them this page quoted a drop-in listing's leftover
  // hourly rate — 09-06 requires a price per person but never CLEARS the exclusive rate columns, and OC-17
  // permits switching modes, so "open listing ⇒ null rates" is never a safe assumption (09-07's lesson).
  const isOpenCapacity = row.listing.occupancyMode === "open_capacity";

  // The drop-in half of the D-41 sign-in resume: `?date=YYYY-MM-DD&passes=N&resume=1`. Re-validated with
  // the SAME schema placeOpenHold enforces, so this page can never hand the CTA a pair the action would
  // then reject. Exactly one resume shape survives, chosen by the LISTING's persisted mode — a
  // window-shaped resume on a drop-in listing (or a date-shaped one on an hourly listing) is dropped
  // rather than auto-fired into a refusal the booker did nothing to earn.
  const openResumeParsed =
    sp.resume === "1" && isOpenCapacity
      ? openHoldSchema.safeParse({ listingId: id, date: sp.date, requestedPasses: sp.passes })
      : null;
  const resumeOpen = openResumeParsed?.success
    ? { dateIso: openResumeParsed.data.date, passes: openResumeParsed.data.requestedPasses }
    : null;
  const resumeWindowForMode = isOpenCapacity ? null : resumeWindow;

  const priceParts = allInRateParts(
    {
      ...pub,
      occupancyMode: row.listing.occupancyMode,
      perHeadPriceCents: row.listing.perHeadPriceCents,
    },
    DISPLAY_CURRENCY,
  );

  // D-130 / GATE-05 — the rail's every possible price, computed HERE and handed down as finished centavos.
  //
  // The rail summaries used to receive `SERVICE_FEE_BPS` and call `computeServiceFee` themselves, from a
  // `"use client"` module. Threading the rate already fixed the value; this fixes the BOUNDARY, which is
  // what `import "server-only"` now fails the build over. Note `computeServiceFee`'s rate argument is
  // omitted deliberately: its default IS SERVICE_FEE_BPS, so this table is computed by the same call
  // checkout makes, and there is no second place for a rate to be passed differently.
  //
  // A TABLE rather than a unit rate, because the fee is rounded ONCE over the whole space price: shipping
  // `allIn(hourly)` for the client to multiply would round N times and drift from the frozen quote by up to
  // N−1 centavos, breaking the byte-identity both rail comments claim (D-75). Keys the booker can actually
  // select, and nothing else — an unlisted key renders no estimate line.
  const allIn = buildAllInTable({
    hourlyRateCents: pub.hourlyRateCents,
    dayRateCents: pub.dayRateCents,
    perHeadPriceCents: row.listing.perHeadPriceCents,
    passCap: row.listing.maxOccupancy,
  });

  // OC-04 — a drop-in listing's cap is a DAILY admissions count, not a room size, so the line has to say
  // which it is. Written out per branch rather than assembled from a suffix: this is booker-facing copy,
  // and copy that only exists as a concatenation cannot be read or reviewed in one place.
  const capacityLine =
    pub.maxOccupancy === 1
      ? isOpenCapacity
        ? "Up to 1 person a day"
        : "Up to 1 person"
      : isOpenCapacity
        ? `Up to ${pub.maxOccupancy} people a day`
        : `Up to ${pub.maxOccupancy} people`;

  // Availability (AVAIL-03) — always render in the venue's local timezone (SC#2). Seed the FIRST day
  // server-side via the read model; the client calendar fetches later day-changes.
  const timezone = row.listing.timezone;
  const cityLabel = cityLabelFor(pub.city, timezone);
  const gmtLabel = gmtLabelFor(timezone);
  const nowInTz = tz(timezone);
  const now = new Date();
  // 17-D26 — venue-local today, OR the non-production `?today=` override when one is supplied.
  //
  // The override is `null` in production unconditionally (a build-time constant prunes the branch, not
  // a runtime check) and `null` for any value that is not a real calendar date, so this expression is
  // byte-equivalent to the wall-clock read it replaces on every shipped request. What it buys is that
  // the four GATE-01 baselines photographing this calendar can pin the day they were shot on, instead
  // of encoding whichever day the dispatch happened to run and going red at the next rollover.
  //
  // It is applied HERE, at the single origin, rather than at the three `todayDate={…}` call sites:
  // `todayStart`, `horizonEnd` and the `initialDate` fallback below are all derived from this one
  // value, and an override that moved the ring without moving the disabled set would be a worse lie
  // than the wall clock.
  const todayOverride = devTodayOverride(sp.today);
  const todayLocal = todayOverride ?? {
    year: Number(format(now, "yyyy", { in: nowInTz })),
    month: Number(format(now, "M", { in: nowInTz })),
    day: Number(format(now, "d", { in: nowInTz })),
  };

  // D-59 #1 — WHICH DAY THE PAGE OPENS ON. The searched day when we can honour it, venue-local today
  // otherwise, and the fallback is SILENT: a stale link naming a past date, or a date past the horizon,
  // must render the listing with today's calendar rather than a 404, an empty grid or an error region.
  //
  // The three conditions, each for its own reason:
  //   • inside the booking horizon — the same [today, today+90] bounds the calendar's own `disabled`
  //     matchers use, computed with the same venue-tz instants, so the page can never open on a day the
  //     grid would then refuse to show as selected.
  //   • the listing is bookable — a published-but-not-payable listing is a read-only preview; opening it
  //     on a day the booker cannot act on adds nothing and costs a paint.
  //   • the listing is EXCLUSIVE — the drop-in surface (DatePassPicker) owns its own day state and its
  //     own month/full-date reads, and a searched drop-in link carries a date with no window at all.
  //     Seeding it is a separate change on a surface this plan does not open; leaving it at today keeps
  //     that branch byte-identical to what shipped.
  const todayStartMs = new TZDate(
    todayLocal.year,
    todayLocal.month - 1,
    todayLocal.day,
    timezone,
  ).getTime();
  const horizonEndMs = new TZDate(
    todayLocal.year,
    todayLocal.month - 1,
    todayLocal.day + BOOKING_HORIZON_DAYS,
    timezone,
  ).getTime();
  const searchedDayMs = searched.date
    ? new TZDate(
        searched.date.year,
        searched.date.month - 1,
        searched.date.day,
        timezone,
      ).getTime()
    : null;
  const openOnSearchedDay =
    searched.date !== null &&
    searchedDayMs !== null &&
    searchedDayMs >= todayStartMs &&
    searchedDayMs <= horizonEndMs &&
    bookable &&
    !isOpenCapacity;

  const initialDate = openOnSearchedDay
    ? { year: searched.date!.year, month: searched.date!.month, day: searched.date!.day }
    : todayLocal;

  // The SAME server read as before, with a different argument. Not a new data path — the first paint
  // simply already carries the day the booker asked about.
  const initialDay = await getAvailability(db, id, initialDate);

  // D-59 #1, the second half: the WINDOW, not just the day. Seeded only when the read model says those
  // hours are actually free — THE SERVER DECIDES (T-12-02-SEEDTRUST). A window that has been taken since
  // the search seeds the day and nothing else, so the booker lands on the right calendar page with an
  // honest, empty selection rather than a highlighted run they cannot book.
  //
  // This remains ADVISORY in every sense: `placeHold` re-derives availability and price inside its own
  // transaction and the GiST EXCLUDE constraint is the sole booking authority (D-130). Seeding a
  // selection is stating a request, never granting one.
  const initialSelection = openOnSearchedDay
    ? seedSelectionFromWindow(initialDay, timezone, searched.startHour, searched.endHour)
    : null;

  // Phase-9 (OPEN-02) — a drop-in listing needs the visible month's fully-booked dates on the FIRST paint,
  // so the grid never briefly offers a date that is already gone.
  const initialFullDates = isOpenCapacity
    ? (
        await getOpenMonthAvailability(db, id, {
          year: initialDate.year,
          month: initialDate.month,
        })
      ).fullDates
    : [];

  return (
    // ⚠ `STICKY_BAR_CLEARANCE` IS NOT HERE ANY MORE — it moved to `(detail)/layout.tsx`'s wrapper on
    // 2026-08-30 (quick `260830-r4b`, closing `[17-D9]` + `[17-D10]`). It sat on this `<main>` from
    // plan 12-10, and it was measurably INERT there: `SiteFooter` renders after `<main>`, so the
    // bottom of the DOCUMENT is footer and 80px inside `<main>` never reached the control that was
    // actually under the bar — the footer's `a("Privacy")` at `{y: 515, bottom: 533}` against a bar
    // at `{y: 504, bottom: 568}`. The layout's wrapper is the smallest element containing both this
    // `<main>` and the footer, so that is where the 80px now hangs (with `lg:pb-0`, since both bars
    // are `lg:hidden`). The full argument is written at that class site. `book/page.tsx` still
    // carries its own on `<main>` because that route renders no footer.
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <PhotoGallery photos={pub.photos} title={title} />

      {/* Phase-12 seam A: the provider owns the DAY, not just the selection, so the sheet's second
          booking view and the D-55 collision recovery share one day and one availability read. The
          RSC still seeds the first paint — `initialDay` is the same server read it always was. */}
      <BookingSelectionProvider
        listingId={id}
        // SC#2 / D-55 — the LISTING's zone, from the row. Every label the client composes from a booking
        // instant reads this and never the browser's; plan 12-13's collision notice is the first
        // consumer, and it names an hour a booker in another country must still read as the venue's.
        timezone={timezone}
        initialDate={initialDate}
        initialDay={initialDay}
        initialSelection={initialSelection}
      >
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
        {/* Main content column */}
        <div className="space-y-8">
          <header className="space-y-2">
            <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-display">
              {title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {[spaceTypeLabel, coarseLocation].filter(Boolean).join(" · ") || "Fitness space"}
            </p>
            {host.firstName && (
              <p className="text-sm text-muted-foreground">Hosted by {host.firstName}</p>
            )}
          </header>

          {/* D-43 — the key-facts strip, immediately after the title and before the description slot.
              `PublicListing` needed NO projection change for this: `bookingMode`, `occupancyMode` and
              `unitCount` are read off the listing row directly, exactly as the rest of this file
              already reads them, while `maxOccupancy` and `primarySpaceType` come off the public
              projection that has always carried them. */}
          <KeyFacts
            occupancyMode={row.listing.occupancyMode}
            bookingMode={row.listing.bookingMode}
            primarySpaceType={pub.primarySpaceType}
            maxOccupancy={pub.maxOccupancy}
            unitCount={row.listing.unitCount}
          />

          {/* ── THE DESCRIPTION SLOT: `About this space` then `Amenities`, ONE section ──────────────
              BFLOW-02 resolves the requirement's one ambiguity here. Its order names six headings and
              Amenities is not among them, because amenities are DESCRIPTIVE content: they finish the
              answer to "what is this space" that the description starts. So they render immediately
              after the description INSIDE the same slot, with the section break AFTER the pair rather
              than between them. Promoting them to a key fact was refused for a mechanical reason —
              activity and amenity badges are a wrapping list of unbounded length and the strip is a
              fixed four cells. */}
          <Separator />
          <section className="space-y-6">
            {pub.description && (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">About this space</h2>
                <p className="text-base leading-relaxed whitespace-pre-line text-foreground">
                  {pub.description}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="text-xl font-semibold">Amenities</h2>
              {amenityLabels.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {amenityLabels.map((label) => (
                    <li key={label}>
                      <Badge variant="secondary">{label}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No amenities listed yet.</p>
              )}
              {activityLabels.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1">
                  {activityLabels.map((label) => (
                    <li key={label}>
                      <Badge variant="outline">{label}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ── AVAILABILITY, NOW ABOVE THE MAP (BFLOW-02, move 1 of 2) ─────────────────────────────
              This section used to sit BELOW Location. The requirement's order puts it above, and the
              reason is the booker's own sequence: whether a space is free when they need it decides
              whether the map matters at all. A booker who scrolls past a map to find out the space is
              taken has been made to read the wrong fact first. */}
          <Separator />
          <section className="space-y-3">
            {/* Heading stays server-rendered; the calendar itself is the client boundary (SC#2).
                09-UI-SPEC § 2: the section NAMES the mode before the picker is used, so a booker knows
                what they are about to buy without having to infer it from a missing hour grid. */}
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              Availability
              {isOpenCapacity && <DropInBadge />}
            </h2>
            <AvailabilityCalendar
              listingId={id}
              timezone={timezone}
              cityLabel={cityLabel}
              gmtLabel={gmtLabel}
              unitCount={row.listing.unitCount}
              bookable={bookable}
              initialDate={initialDate}
              initialDay={initialDay}
              occupancyMode={row.listing.occupancyMode}
              initialFullDates={initialFullDates}
              // D-59 #1: `initialDate` may now be the SEARCHED day, so the horizon needs today told to
              // it separately — otherwise every day before the searched one would render disabled.
              todayDate={todayLocal}
            />
          </section>

          <Separator />
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Location</h2>
            {pub.lat != null && pub.lng != null ? (
              <ListingMapPanel
                lat={pub.lat}
                lng={pub.lng}
                showExactAddress={pub.showExactAddress}
                caption={mapCaption}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{coarseLocation || "Location coming soon."}</p>
            )}
          </section>

          {/* ── CANCELLATION POLICY AS A SECTION OF ITS OWN (BFLOW-02, move 2 of 2 · D-46) ──────────
              ⚠ THIS IS THE SECOND OF TWO RENDERS OF THE SAME COMPONENT ON THIS PAGE, ON PURPOSE.
              The compact line in the rail is KEPT (see the rail below, which carries the other half of
              this comment). The two placements answer two different questions and neither substitutes
              for the other:
                • THE RAIL puts the refund terms at the moment of commitment, beside the price and the
                  CTA — but the rail is a `lg:` column, so on a phone it is below the fold at best.
                • THIS SECTION is the ONLY place the policy appears on mobile at all. Before it existed,
                  a booker on a phone could reach checkout having never been shown the refund terms —
                  and D-81's whole claim is that "a refund promise the booker demonstrably saw is the
                  only kind enforceable in spirit".
              Duplication here is the requirement, not an oversight. Deleting either one silently
              removes the disclosure from a whole class of device.

              GATED ON THE TIER, exactly as the rail's copy is: `CancellationPolicyDisclosure` renders
              NOTHING for a null tier (its own header explains why a legacy row must not be shown a
              policy its host never chose), so an unconditional heading here would print
              `Cancellation policy` over empty space on those rows. The two sites therefore appear and
              disappear together, which is the property that keeps them one disclosure rather than two.
              After D-77 a listing cannot be published without a tier, so this is a legacy-row branch. */}
          {row.listing.cancellationPolicy && (
            <>
              <Separator />
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">Cancellation policy</h2>
                <CancellationPolicyDisclosure
                  tier={row.listing.cancellationPolicy}
                  openCapacity={isOpenCapacity}
                  // WR-05 — false for the same reason the rail's is: this page has no booking and no
                  // picked date, so no particular pass's day can have opened yet.
                  windowAlreadyOpen={false}
                />
              </section>
            </>
          )}

          <Separator />
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Your host</h2>
            <HostBlock
              // Every field comes from the Phase-1 allow-list projection above — `host` IS
              // `publicProfile(row.user)`, and `HostBlockProps` is a `Pick` of that same type, so this
              // call site cannot pass a private column even by accident (T-05-OWNERLEAK / T-12-08-PII).
              avatarUrl={host.avatarUrl}
              firstName={host.firstName}
              bio={host.bio}
              createdAt={host.createdAt}
              bookingMode={row.listing.bookingMode}
            />
          </section>
        </div>

        {/* Booking rail — price + state-reflecting CTA.

            THE OFFSET IS NOT WRITTEN HERE ANY MORE, AND THAT IS THE POINT (SHELL-01, plan 11-13).
            It used to be a raw pin-plus-offset class pair written out on this line, which meant the
            number could be edited back down by anyone who never read why it was 80px. It now
            arrives through `PanelCard`'s `sticky` BOOLEAN, so the arithmetic (the 64px shell header
            + a 16px gap = the 20th spacing step) lives in exactly one file —
            `patterns/panel-card.tsx` — and `tests/design/sticky-offset.test.ts` asserts that there
            is only one.

            The classes are named DESCRIPTIVELY rather than quoted, following the precedent
            `panel-card.tsx:103-106` and `booking-row.tsx:112` already set in this repo: the rule is
            checked by a source scan, and a scan for a class must not be tripped by the comment
            explaining that the class is gone.

            The container swap is container-only: every child below is byte-identical to what this
            rail shipped, and `PanelCard` renders the same `ui/card.tsx` primitive this line used to
            render by hand. What changed is the padding, which is now the pattern's `p-4 sm:p-6`
            rather than this file's `py-6` on top of `Card`'s own `py-4` (the double-block-padding
            trap `deferred-items.md` measured at 112px vs 80px on the row cards).

            ── `max-lg:hidden` IS THE MECHANISM, AND IT IS LOAD-BEARING (RESP-02 / D-48, plan 12-10) ──
            Below `lg:` this whole rail leaves the page, because the sticky bottom bar and the sheet are
            what carry the price and the action at those widths. `hidden` rather than `sr-only` or
            `opacity-0` on purpose: it removes the rail from the ACCESSIBILITY TREE, which is what makes
            "exactly one Book button at 375px and exactly one at 1280px" true when it is counted with a
            role query. An `sr-only` rail would satisfy the eye and leave a screen-reader user with two
            Book buttons, one of them a ghost.

            NOTHING IS LOST AT THOSE WIDTHS, and that was checked rather than assumed: the capacity line
            is `KeyFacts`' `Capacity` cell in the main column (12-08), the cancellation policy is the
            main column's own section (D-46 — the duplication that exists precisely because there is no
            rail on a phone), and the all-in rate is the sticky bar's left column. */}
        <aside className="max-lg:hidden">
          <PanelCard sticky>
            {/* D-41 — the all-in rate headline, which now RENDERS ONLY WHILE THERE IS NO SELECTION.
                It moved out of this file into a client leaf because the condition is a fact about the
                browser's state, not the request's. The three `<p>` elements below are byte-identical to
                the ones that stood here; what changed is that they can now be absent. The reason they
                must be — two correct rates, same `/hr` suffix, 60px apart, on the panel where money
                commits — is written in the component, together with the alternative that was rejected,
                so nobody "restores" the headline as a regression fix. */}
            <RailRateHeadline parts={priceParts} />

            {/* D-81 — the refund promise, next to the price it qualifies. GENERIC mode: there is no
                booking yet, so rungs are stated relative to the listing's own deadline anchor; checkout
                re-states the same ladder as concrete dates once a window is picked. A NULL tier renders
                nothing.

                09-UI-SPEC § 5b: the anchor is the LISTING's persisted occupancy mode — a drop-in listing
                sells passes for a DATE, so its deadline is when the space opens, not when a session
                starts. The ladder itself is byte-identical in both modes (OC-15). */}
            {/* ⚠ D-46 — THE COMPACT LINE IS KEPT, AND THE FULL SECTION ABOVE IS NOT A DUPLICATE OF IT.
                This is the other half of the comment at the `Cancellation policy` section in the main
                column. Short version: there is no rail on mobile, so the section is the only place the
                policy appears there; and the rail line is what keeps the refund terms at the moment of
                commitment on desktop, beside the price and the CTA. Removing either one deletes the
                disclosure for a whole class of device rather than tidying a repetition. */}
            {/* WR-05 — ALWAYS false here, and that is a decision rather than a default. This page has no
                booking and no picked date at render time, so there is no specific pass whose day could
                have opened: the disclosure describes the LISTING's policy in general, and the concrete
                "already open, so nothing comes back" statement belongs on the surface where a particular
                pass is being paid for (the reserve page, which does have both). Making the prop required
                is what forced this question to be answered out loud instead of inherited. A date-aware
                version of this page is not in scope. */}
            <CancellationPolicyDisclosure
              tier={row.listing.cancellationPolicy}
              openCapacity={row.listing.occupancyMode === "open_capacity"}
              windowAlreadyOpen={false}
            />

            {pub.maxOccupancy != null && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <UsersIcon className="size-4" aria-hidden="true" />
                {capacityLine}
              </p>
            )}

            {/* ── THE RAIL PLACEMENT OF `BookingPanel` (RESP-02 / D-48, plan 12-10) ────────────────
                The selection summary, the CTA and the not-bookable affordance used to be spelled out
                here. They are ONE COMPONENT now, mounted twice — here and inside the mobile sheet —
                which is what makes "the rail and the sheet show the same fact" a construction rather
                than two blocks that agree today. `placement` selects the ARRANGEMENT and nothing else;
                the measurement that decided which parts each arrangement holds is in that file's header.

                Neither placement composes money: both LOOK UP figures this RSC already computed with the
                same `computeServiceFee` checkout freezes, so the rail and the charge agree to the
                centavo (D-75) and no fee input reaches the browser (D-130). The RAW rate props feed the
                run line's LABEL only (`₱473.33/hr × 2 hours`); every VALUE rendered is one of the three
                finished figures.

                ⚠ THE RESUME PROPS ARE PASSED HERE AND NOWHERE ELSE. `BookCta` auto-submits a restored
                selection once on mount (D-41), and it is now mounted up to three times on this route;
                threading them into a second mount would place two holds for one return from `/login`.
                This mount is the one that carries them because it exists at every width — it is
                `display:none` below `lg:`, which still runs effects — while the sheet's is mounted only
                while the sheet is open. */}
            <BookingPanel
              placement="rail"
              listingId={id}
              timezone={timezone}
              cityLabel={cityLabel}
              gmtLabel={gmtLabel}
              unitCount={row.listing.unitCount}
              occupancyMode={row.listing.occupancyMode}
              initialDate={initialDate}
              initialDay={initialDay}
              initialFullDates={initialFullDates}
              todayDate={todayLocal}
              allIn={allIn}
              currency={DISPLAY_CURRENCY}
              hourlyRateCents={pub.hourlyRateCents}
              dayRateCents={pub.dayRateCents}
              perHeadPriceCents={row.listing.perHeadPriceCents}
              bookable={bookable}
              placeHold={placeHold}
              placeOpenHold={placeOpenHold}
              resumeWindow={resumeWindowForMode}
              resumeOpen={resumeOpen}
            />
          </PanelCard>
        </aside>
      </div>

      {/* ── RESP-02: THE MOBILE PATH, INSIDE THE SAME PROVIDER ────────────────────────────────────────
          The bar is `lg:hidden`, the rail above is `max-lg:hidden`, and they are the SECOND placement
          of one component rather than a second component: the sheet's contents are
          `<BookingPanel placement="sheet">`, the same panel the rail mounts, reading the same selection
          and the same day from the one provider that wraps both. Two views, one state, one fetch —
          asserted as exactly ONE availability request per day selection at 375px and at 1280px.

          THE `lg:hidden` WRAPPER IS BELT AND BRACES rather than the load-bearing part: the only thing
          that can open this sheet is the bar's trigger, and the bar is already `lg:hidden`. It is here
          so that a viewport resized while the sheet is open cannot leave a mobile booking surface
          mounted over the desktop layout, and so that the two placements' mechanisms read as a pair. */}
      <BookingStickyBar
        rateParts={priceParts}
        allIn={allIn}
        currency={DISPLAY_CURRENCY}
        listingId={id}
        occupancyMode={row.listing.occupancyMode}
        placeHold={placeHold}
        placeOpenHold={placeOpenHold}
        sheet={
          <div className="lg:hidden">
            <BookingPanel
              placement="sheet"
              listingId={id}
              timezone={timezone}
              cityLabel={cityLabel}
              gmtLabel={gmtLabel}
              unitCount={row.listing.unitCount}
              occupancyMode={row.listing.occupancyMode}
              initialDate={initialDate}
              initialDay={initialDay}
              initialFullDates={initialFullDates}
              todayDate={todayLocal}
              allIn={allIn}
              currency={DISPLAY_CURRENCY}
              hourlyRateCents={pub.hourlyRateCents}
              dayRateCents={pub.dayRateCents}
              perHeadPriceCents={row.listing.perHeadPriceCents}
              bookable={bookable}
              placeHold={placeHold}
              placeOpenHold={placeOpenHold}
              // NOT the resume props — see the rail placement above. One mount auto-submits a restored
              // selection; a second would place a second hold for one return from `/login`.
            />
          </div>
        }
      />
      </BookingSelectionProvider>
    </main>
  );
}
