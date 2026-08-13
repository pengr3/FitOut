// SHELL-01 / T-11-NAVDUP — THE declared inventory of the host header's primary navigation.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// ONE SOURCE OF TRUTH FOR THE LINKS, TWO PLACEMENTS FOR THE DOM
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The host cluster measures 352px at 320px in grove and only 226px is available (11-UI-SPEC
// § Responsive behaviour), so `Earnings` and `Requests` move into a drawer below `md:`. That gives
// the same two links TWO homes in the markup — an inline bar and a drawer — and the obvious
// implementation writes them twice.
//
// Writing them twice is the defect, not the shortcut. Two copies of a link list drift in exactly the
// way nobody notices: a third destination is added to the desktop bar, the drawer keeps two, and the
// only people who ever see the shortfall are the ones on a phone. So the DATA is here, once, and
// `site-chrome.tsx`'s presentational `<NavLinks>` renders it into whichever placement is asking.
//
// The DOM duplication that remains is deliberate and is bounded by `hidden`, never by `sr-only` or
// `opacity-0`: `hidden` sets `display: none`, which removes the subtree from the accessibility tree
// entirely, so exactly ONE `navigation` landmark exists at any viewport. `sr-only` would keep both in
// the tree and a screen-reader user would hear the site's navigation twice at every width.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A TYPED INVENTORY AND NOT AN ARRAY OF `{href, label}`
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The shape follows `status-tones.ts` and `selector-contract.ts`: a `const` tuple, a union derived
// from it, and a TOTAL `Record` over that union. Adding an id to `HOST_NAV_IDS` without adding its
// row is a COMPILE error rather than a review comment, and every row carries a mandatory `why` for
// the same reason `contrast-pairs.ts` demands a `note` — a destination nobody can justify is a
// destination that should not be in the primary navigation of a two-sided marketplace.
//
// WHERE THIS FILE LIVES. `src/lib/` is outside the DS-13 leak gate's scanned tree
// (`config/design-leak-patterns.mjs` → `LEAK_SCAN_PREFIXES` covers `src/app/**` and
// `src/components/**`), which is the same reason `contrast-pairs.ts:11-14` gives for its location.
// This module holds no class strings today, so the placement is about company rather than necessity:
// it sits beside the app's other declared data.
//
// NOT COVERED — a real blind spot, stated so the next reader under-trusts this file:
//   • This is a DECLARATION. It cannot tell you the host header actually renders it — plan `11-12` is
//     what converts `(host)/host/layout.tsx` onto `SiteChrome` and this inventory, and until then the
//     shipped host header still writes its two links inline. Both lists say `Earnings` and
//     `Requests` today; nothing mechanical holds them together until that conversion lands.
//   • `badge` below says a row MAY carry a count. It does not say what the count is or where it comes
//     from — the pending-request query lives in the host layout, because it is owner-scoped on the
//     session and this module has no session.

/**
 * Every destination in the host header's primary nav. Closed, and the source of `HostNavId`.
 *
 * Ordered as they render, left to right, which is also the order they appear in the drawer — a list
 * whose declaration order is its render order cannot disagree with itself about which link is first.
 */
export const HOST_NAV_IDS = ["earnings", "requests"] as const;

/** The closed union every host nav row is typed against. */
export type HostNavId = (typeof HOST_NAV_IDS)[number];

/** One declared destination. Every field except `badge` is mandatory; none has a default. */
export type NavLink = {
  /** The visible link text. Bound by the copywriting contract — this is product copy, not a slug. */
  readonly label: string;
  /** The destination. An app-relative path, always, so `<Link>` can prefetch it. */
  readonly href: string;
  /**
   * WHY this destination earns a slot in the primary navigation.
   *
   * Mandatory, and load-bearing rather than documentation — the same rule `contrast-pairs.ts` applies
   * to its `note` and `selector-contract.ts` to its `why`. Primary nav is the scarcest surface in the
   * app: it is on every host screen, it competes with the mode switch and the bell for 226px at
   * 320px, and every addition makes the drawer one step further from the thing someone came for.
   */
  readonly why: string;
  /**
   * Does this row render a count badge beside its label?
   *
   * `true` for `Requests` only. The COUNT itself is not here: it is owner-scoped on the session
   * (`booking JOIN listing WHERE listing.host_id = session.user.id AND status = 'requested'`, D-65)
   * and this module has no session and no database. The flag says "this row has a badge slot"; the
   * host layout says how many.
   */
  readonly badge?: boolean;
};

/**
 * Every row. A TOTAL `Record` over the closed union, which is the compile gate.
 */
export const HOST_NAV: Record<HostNavId, NavLink> = {
  earnings: {
    label: "Earnings",
    href: "/host/earnings",
    why:
      "HOST-03. Money in is the reason a host is on the platform at all, and the payouts view is the " +
      "one screen that answers 'have I been paid'. It is reached from every host screen because the " +
      "question does not arrive on a schedule.",
  },
  requests: {
    label: "Requests",
    href: "/host/requests",
    badge: true,
    why:
      "D-65. A pending request is work the host OWES a booker, and it expires. It is the only host " +
      "destination with a deadline attached, which is exactly what a persistent nav slot plus a count " +
      "badge is for — the badge is hidden at zero, so the slot costs nothing when there is nothing to do.",
  },
};

/**
 * The rows in render order, derived from the id tuple rather than restated as a second array.
 *
 * Two spellings of one order is two things that can drift; there is only one here, and `HOST_NAV_IDS`
 * owns it.
 */
export const HOST_NAV_LINKS: readonly NavLink[] = HOST_NAV_IDS.map((id) => HOST_NAV[id]);
