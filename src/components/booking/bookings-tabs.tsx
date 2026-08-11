// BookingsTabs — the Upcoming / Past segmented control shared by /bookings and /host/bookings (D-103).
//
// This is a SERVER component and the "tabs" are real links, NOT Radix Tabs state. The researcher's call
// (07-UI-SPEC § 1, Open Question 5) and why it is load-bearing rather than stylistic:
//
//   - The Upcoming/Past partition is computed against the DB clock inside the query (bookings-query.ts), and
//     the "Load more" cursors are server-side. Client tab state would have to hold TWO independently-paged
//     datasets in the browser, each fetched at a different instant — so a booking whose session ends between
//     the two fetches could sit in both panes at once, or in neither. Server navigation re-partitions both
//     tabs against a single now() per render, which is the only way the D-103 invariant actually holds.
//   - Switching tabs must therefore also RESET paging: each link emits `?tab=` plus any extra params and
//     deliberately DROPS `cursor`, so a Past cursor can never be replayed against the Upcoming keyset
//     (opposite sort direction — it would silently return the wrong slice).
//
// There is no in-repo analog for a server-navigated tab control. search-results.tsx supplies the URL-param
// navigation idiom but is a client component driving router.push, so the styling below is composed from the
// installed `tabs` recipe (components/ui/tabs.tsx) rather than imported from it — the Radix primitives carry
// a client directive and require Tabs context that a plain anchor cannot provide.
//
// Accessibility: the active trigger carries aria-current so assistive tech announces which half is showing;
// both triggers clear the 44px minimum touch target (07-UI-SPEC § Spacing exceptions).

import Link from "next/link";

import { cn } from "@/lib/utils";
import type { BookingsTab } from "@/lib/booking/bookings-query";

/** Labels are locked by 07-UI-SPEC § 1; Upcoming is the default when `?tab=` is absent. */
const TABS: { key: BookingsTab; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "past", label: "Past" },
];

// The `tabs` list + trigger recipe, transcribed for anchors. Same tokens, same radius, same muted track.
// DS-05: the focus half is THE one app-wide recipe from button.tsx, kept byte-identical to the real
// `tabs.tsx` trigger it transcribes — a solid 2px ring plus a 2px offset band in --background. The
// half-alpha ring colour it replaces composited to 2.32:1 against a 3:1 non-text bar; no value of
// --ring rescues a half-alpha mix, which is why the alpha went rather than the token.
const LIST_CLASS =
  "inline-flex w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground";
const TRIGGER_CLASS =
  "inline-flex min-h-11 min-w-24 items-center justify-center rounded-md border border-transparent px-4 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-1 focus-visible:outline-ring";
const TRIGGER_ACTIVE = "bg-background text-foreground shadow-sm dark:bg-input/30";
const TRIGGER_IDLE = "text-foreground/60 hover:text-foreground dark:text-muted-foreground";

/**
 * One trigger. The active and idle branches are written out separately so the current-page announcement is
 * a plain static attribute rather than a conditional one — it is the only accessibility affordance this
 * control has, and a conditional prop is the kind of thing a later refactor drops silently.
 */
function TabLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  if (active) {
    return (
      <Link href={href} aria-current="page" className={cn(TRIGGER_CLASS, TRIGGER_ACTIVE)}>
        {label}
      </Link>
    );
  }
  return (
    <Link href={href} className={cn(TRIGGER_CLASS, TRIGGER_IDLE)}>
      {label}
    </Link>
  );
}

export function BookingsTabs({
  basePath,
  active,
  extraParams,
}: {
  basePath: "/bookings" | "/host/bookings";
  active: BookingsTab;
  /** Filters that must survive a tab switch (e.g. the host's `listing`). `cursor` is never carried over. */
  extraParams?: Record<string, string>;
}) {
  function hrefFor(tab: BookingsTab): string {
    const params = new URLSearchParams({ ...(extraParams ?? {}), tab });
    return `${basePath}?${params.toString()}`;
  }

  return (
    <nav aria-label="Bookings" className={LIST_CLASS}>
      {TABS.map(({ key, label }) => (
        <TabLink key={key} href={hrefFor(key)} label={label} active={key === active} />
      ))}
    </nav>
  );
}
