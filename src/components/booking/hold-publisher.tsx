"use client";

// PublishExpiresAt (plan 12-03) — the page's one-line writer into the checkout hold context.
//
// WHY IT IS A COMPONENT AND NOT A LINE IN THE PAGE. `app/listings/[id]/book/page.tsx` is a Server
// Component and must stay one: it does the owner-gated hold read, the path-id cross-check and every
// money computation on this route (GATE-05). A server component cannot call `useHold()`, so the write
// needs one client leaf — this one. It RENDERS NOTHING; its entire output is a context write.
//
// WHY IT IS ITS OWN FILE. `hold-provider.tsx` exports exactly the provider and the hook, which is the
// contract 12-03's acceptance criteria pin: the context module is the thing every later plan (12-10,
// 12-11, 12-13) imports, and a third export that happens to be a component would invite the next
// reader to reach for it instead of the hook.
//
// IT RECEIVES AN ALREADY-AUTHORISED VALUE — it does not fetch one, and it must never grow the ability
// to. The hold behind `expiresAt` was read owner-gated in the RSC (T-04-RESERVEIDOR / T-12-03-HOLDIDOR)
// and cross-checked against the path id; both `notFound()` calls are upstream of this component ever
// being rendered. A second read path to a hold row is the exact thing the context exists to avoid.

import * as React from "react";

import { useHold } from "@/components/booking/hold-provider";

/**
 * Write the hold's deadline into the context on mount and whenever it changes.
 *
 * `publishExpiresAt` compares before setting (see `hold-provider.tsx`), so this effect is safe to run
 * on every render of a provider that re-renders this subtree.
 */
export function PublishExpiresAt({ expiresAt }: { expiresAt: string | null }) {
  const { publishExpiresAt } = useHold();

  React.useEffect(() => {
    publishExpiresAt(expiresAt);
  }, [expiresAt, publishExpiresAt]);

  return null;
}
