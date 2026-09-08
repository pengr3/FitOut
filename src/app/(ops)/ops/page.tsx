// THE review queue (OPS-02 route half · OPS-04 · D-246). ONE page, ONE list, hosts and listings
// interleaved, oldest first, everything needed to decide on the same screen.
//
// ⚠ THE ROUTE GROUP IS NOT THE AUTHORIZATION GATE FOR THE DATA — `(host)/host/requests/page.tsx:6-11`'s
// doctrine, restated here because the stakes are higher. `(ops)/ops/layout.tsx` awaits `assertStaff()`,
// but that layer exists to win the 404 STATUS LINE and its own header says, in `src/middleware.ts:1`'s
// words, that it is NOT the security boundary. Next's authentication guide is the argument rather than
// a preference: a layout "does not control whether the rest of the route renders", and it does not
// re-render on navigation under Partial Rendering. So this page calls `requireStaff()` ITSELF, first,
// every render — layer 2 of D-247's three, and one of the two that actually gate (D-216). The five
// server actions the rows below mount call it too; that is layer 3, and it is the only layer that
// covers a Server Action, which Next requires be treated as a public-facing API endpoint.
//
// EVERY VALUE THE ROW RENDERS ARRIVES FINISHED FROM HERE. `OpsQueueRow` takes `waitLabel`,
// `submittedLabel`, `accountSinceLabel` / `priceLabel` and — on a listing — a REQUIRED `impact`, and
// they are all composed on this side of the boundary. That is PROJECT D-130 / GATE-05 for the money
// (a client island that never receives a number cannot divide one) and the shipped `whenLabel` idiom
// for the dates (a viewer's clock and locale must not decide what a queue row says). Plan 18-10 made
// those props a COMPILE error rather than a note, deliberately.
//
// ONE CLOCK, READ ONCE, THREADED. `readDbNow` is awaited once and every wait figure is computed
// against it — the `/host/requests` rule, and the reason no row can disagree with its neighbour about
// what time it is. `Date.now()` appears nowhere: this page's whole subject is how long something has
// been waiting, and a wait measured against a web server's clock while the row's `submitted_at` came
// from Postgres is two clocks pretending to be one.

import { db } from "@/lib/db";
import { readDbNow } from "@/lib/booking/bookings-query";
import { allInRateParts } from "@/lib/booking/all-in-rate";
import { loadOpsCancelImpact } from "@/lib/ops/cancel-impact";
import { loadReviewQueue, type OpsQueueItem } from "@/lib/ops/review-queue";
import { requireStaff } from "@/lib/ops/staff";
import { formatMemberSince } from "@/lib/profile";
import {
  OpsQueueRow,
  type OpsQueueRowItem,
} from "@/components/ops/ops-queue-row";
import { EmptyState } from "@/components/patterns/empty-state";
import { PageHeader } from "@/components/patterns/page-header";
import { OPS_QUEUE_SHELL } from "@/lib/design/measurements";
import { readStaffManagementSnapshot } from "@/lib/ops/staff-management";
import { StaffManagementPanel } from "@/components/ops/staff-management-panel";

/**
 * The clock every date on this surface is rendered in.
 *
 * `src/lib/db/schema.ts:223` declares `Asia/Manila` as the default launch region and every listing
 * carries it as its venue timezone. A host's `host_verification` row carries NO venue — a host is not
 * a place — so there is no per-row zone to render in, and letting the SERVER's zone decide would make
 * the same row read differently on two machines. Naming the launch region here makes "Aug 26, 2026"
 * one fact rather than one deployment's opinion. When FitOut is in a second region this becomes a
 * decision to take, not a constant to widen quietly.
 */
const OPS_CLOCK_TZ = "Asia/Manila";

/** The locale dates are rendered in, for the same reason the zone is named rather than inherited. */
const OPS_LOCALE = "en-PH";

/** "Aug 26, 2026" — the date an operator quotes in a dispute, in the launch region's clock. */
function formatSubmitted(at: Date): string {
  return new Intl.DateTimeFormat(OPS_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: OPS_CLOCK_TZ,
  }).format(at);
}

/** Milliseconds in the two units the wait figure is ever expressed in. */
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * The row's LEAD — how long this thing has been waiting on FitOut.
 *
 * THREE BANDS, AND THE BOTTOM ONE IS NOT `Waiting 0 days`. A queue whose freshest row reads zero is
 * telling an operator the item arrived and was already overdue, which is both false and the wrong
 * feeling on the surface whose whole job is triage by age. Under an hour it says so in words; under a
 * day it counts hours; after that it counts days. The units agree with their nouns at 1 — the same
 * correction plan 18-10 had to make on the confirm button, for the same reason: ungrammatical copy on
 * the loudest element of a working surface is worse than a literal reading of a template.
 *
 * FLOORED, NEVER ROUNDED. "Waiting 6 days" must not be true of something that arrived 5 days and 20
 * hours ago: an operator reads this figure against an SLA, and a figure that rounds up overstates
 * every row by up to half a unit. `Math.floor` under-claims, which is the safe direction here.
 *
 * A NEGATIVE ELAPSED IS CLAMPED TO THE BOTTOM BAND rather than rendered. `submitted_at` and `now()`
 * both come from Postgres so it should not happen — but a hand-run backfill can seed a future
 * timestamp, and `Waiting -3 days` on a triage queue is the kind of nonsense that makes a reviewer
 * distrust every other figure on the row.
 */
function formatWait(submittedAt: Date, now: Date): string {
  const elapsed = now.getTime() - submittedAt.getTime();
  if (elapsed < MS_PER_HOUR) return "Waiting under an hour";
  if (elapsed < MS_PER_DAY) {
    const hours = Math.floor(elapsed / MS_PER_HOUR);
    return `Waiting ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.floor(elapsed / MS_PER_DAY);
  return `Waiting ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * The listing's advertised rate, as a BOOKER would read it.
 *
 * `allInRateParts` and not the raw columns, and that is the decision rather than a convenience: what
 * an ops reviewer is judging is the listing as it would SELL, and every browser-facing surface in this
 * product — the search card, the listing rail, the sticky bar, the OG card — quotes the fee-inclusive
 * rate through this one expression (D-75). Rendering the host's pre-fee columns here would show the
 * operator a number no booker will ever see, on the one screen whose job is to decide whether that
 * listing may be shown to bookers at all.
 *
 * `join(" · ")` and the `Price on request` fallback are `search-result-card.tsx:297` verbatim — a
 * listing may legitimately advertise only one of the two rates, or neither while it is still being
 * finished, and a blank cell reads as "fine" rather than as "there is nothing here to check".
 */
function formatPrice(item: Extract<OpsQueueItem, { kind: "listing" }>): string {
  const parts = allInRateParts(
    {
      hourlyRateCents: item.hourlyRateCents,
      dayRateCents: item.dayRateCents,
      perHeadPriceCents: item.perHeadPriceCents,
      occupancyMode: item.occupancyMode === "open_capacity" ? "open_capacity" : "exclusive",
    },
    item.currency,
  );
  return parts.length > 0 ? parts.join(" · ") : "Price on request";
}

export default async function OpsQueuePage() {
  // LAYER 2 — the security boundary (D-216). The layout is not it; see the header.
  await requireStaff();

  const [items, now, staffSnapshot] = await Promise.all([
    loadReviewQueue(db),
    readDbNow(db),
    readStaffManagementSnapshot(db),
  ]);

  // ONE `loadOpsCancelImpact` PER LISTING ROW, and it is not optional — `OpsQueueListingRow.impact`
  // is a required field precisely so this cannot be forgotten. Without it the reject dialog would
  // render with no money block and no escalation lever, and an operator would take the lighter lever
  // never having been offered the alternative. In parallel rather than in sequence: the reads are
  // independent, and a queue of twenty listings run serially would make the page's cost linear in a
  // number nobody is watching.
  const rows: OpsQueueRowItem[] = await Promise.all(
    items.map(async (item): Promise<OpsQueueRowItem> => {
      const shared = {
        waitLabel: formatWait(item.submittedAt, now),
        submittedLabel: formatSubmitted(item.submittedAt),
      };
      if (item.kind === "listing") {
        return {
          ...item,
          ...shared,
          priceLabel: formatPrice(item),
          impact: await loadOpsCancelImpact(db, item.listingId),
        };
      }
      return {
        ...item,
        ...shared,
        accountSinceLabel: formatMemberSince(
          item.accountCreatedAt,
          OPS_LOCALE,
          OPS_CLOCK_TZ,
        ),
      };
    }),
  );

  return (
    <div className={OPS_QUEUE_SHELL}>
      <PageHeader
        title="Review queue"
        // ⚠ THE WORD **new** IS LOAD-BEARING AND IS NOT A HEDGE. D-210 narrows the sell-gate to
        // listings created or materially edited after this phase — the grandfathered catalogue is
        // ungated — so "nothing sells on FitOut until someone here has checked it" would be FALSE,
        // on the one screen whose entire job is to be accurate about what has and has not been
        // checked. The same expression is carried character for character by `loading.tsx`.
        lede="Hosts and listings waiting on a decision, oldest first. Nothing new sells on FitOut until someone here has checked it."
      />

      <div className="mt-8">
        {rows.length === 0 ? (
          // FOR A WORK QUEUE, ZERO IS AN ACHIEVEMENT — STATE-04's inbox-zero clause and 14-CONTEXT's
          // `T-11-FALSEALARM` rule (an absence must never be dressed as a failure), applied to the one
          // queue where the absence means FitOut is caught up. `tone="positive"` is the whole
          // mechanism and it carries exactly one pixel of green: the glyph becomes `CheckCircle2` at
          // `text-success`. No `bg-success` anywhere.
          //
          // `actions={null}` ON PURPOSE — the pattern requires the prop precisely so this is a
          // decision. An ops reviewer cannot make a host submit a listing, and D-246 means there is no
          // second ops destination to point at. A CTA here would be a control that does not act on
          // this state.
          <EmptyState
            tone="positive"
            titleAs="h2"
            title="The queue is clear"
            body="Nothing is waiting on FitOut right now. New hosts and new listings land here the moment they're submitted, oldest first."
            actions={null}
          />
        ) : (
          // AN `<ol>`, NOT A `<div>`. The queue is an ordered list and its ORDER is the product —
          // `loadReviewQueue` interleaves both kinds strictly oldest-first, and a screen reader
          // announcing "list, 7 items" is telling an ops reviewer something true and useful. A `<div>`
          // would render the same pixels and say nothing.
          <ol className="space-y-4">
            {rows.map((row) => (
              <li key={row.kind === "listing" ? row.listingId : row.userId}>
                <OpsQueueRow row={row} />
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="mt-12">
        <StaffManagementPanel snapshot={staffSnapshot} />
      </div>
    </div>
  );
}
