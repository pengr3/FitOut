---
quick_id: 260916-fgd
slug: ensure-the-new-navigation-menu-adheres-to-the-established-ui-standards
phase: quick-260916-fgd
plan: 01
type: execute
wave: 3
depends_on: ["260916-fgb", "260916-fgc"]
created: 2026-09-16
source: "Ensure the new navigation menu adheres to the established UI standards."
autonomous: true
requirements: [QUICK-260916-FGD]
files_modified:
  - src/components/nav-icon-menu.tsx
  - e2e/mode-switch.spec.ts
  - src/lib/design/measurements.ts
  - src/components/patterns/auth-slot-skeleton.tsx
  - src/components/patterns/site-chrome.tsx
  - src/app/dev/theme/page.tsx
  - e2e/shell.spec.ts
estimate:
  tokens: 22000
  raw_tokens: 22000
  tasks: 2
  confidence: low
must_haves:
  truths:
    - "A signed-in booker or host encounters one compact, clearly named navigation control whose opened menu is navigable by keyboard and groups Profile, context switching, and Sign out consistently."
    - "The menu trigger and its content use FitOut's existing button, dropdown, focus, elevation, spacing, and destructive-action recipes instead of a bespoke header style."
    - "On session-aware public headers, the loading placeholder and the resolved menu-plus-notification cluster have identical 88 by 44 pixel geometry, so the header action slot does not move when the session resolves."
  artifacts:
    - path: "src/components/nav-icon-menu.tsx"
      provides: "The final shared menu composition built from the established Button and DropdownMenu primitives."
    - path: "src/lib/design/measurements.ts"
      provides: "The one declared 44-pixel-high, 88-pixel-wide reservation used by the authenticated header slot."
    - path: "src/components/patterns/auth-slot-skeleton.tsx"
      provides: "A loading placeholder that mirrors the final menu icon and notification bell geometry."
    - path: "e2e/mode-switch.spec.ts"
      provides: "Browser proof of accessible keyboard operation and the final menu semantic structure."
    - path: "e2e/shell.spec.ts"
      provides: "Session-resolution geometry proof for the compact header action cluster."
  key_links:
    - from: "src/components/nav-icon-menu.tsx"
      to: "src/components/ui/button.tsx, src/components/ui/dropdown-menu.tsx"
      via: "The icon trigger and menu groups inherit the shared focus, hover, portal elevation, motion, and destructive-item recipes."
    - from: "src/lib/design/measurements.ts"
      to: "src/components/patterns/site-chrome.tsx, src/components/patterns/auth-slot-skeleton.tsx"
      via: "AUTH_SLOT_BOX is the shared action-slot reservation in pending and resolved header states."
    - from: "e2e/mode-switch.spec.ts"
      to: "src/components/nav-icon-menu.tsx"
      via: "Accessible role/name queries and real keyboard events exercise the menu that signed-in headers render."
---

<objective>
Bring the finalized navigation menu from quick items `260916-fgb` and `260916-fgc` into conformance
with FitOut's established interaction and header-layout standards.

Purpose: the compact account menu replaces several familiar header controls. It must retain the
application's known affordances—clear accessible naming, visible keyboard focus, dropdown grouping,
portal treatment, and no session-resolution shift—so consolidation does not make navigation less
legible or less stable.

Output: a standards-aligned `NavIconMenu`, focused keyboard/browser coverage, and a menu-plus-bell
loading/resolved header reservation that stays geometrically stable.
</objective>

<execution_context>
@C:/Users/Admin/.codex/gsd-core/workflows/execute-plan.md
@C:/Users/Admin/.codex/gsd-core/templates/summary.md
</execution_context>

<context>
@AGENTS.md
@.planning/quick/260916-fgb-introduce-a-nav-icon-menu-that-contains-the-profile-action-and-booking-mode-switch/260916-fgb-PLAN.md
@.planning/quick/260916-fgc-add-a-logout-action-for-the-current-session-inside-the-new-nav-icon-menu/260916-fgc-PLAN.md
@node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
@node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md
@node_modules/next/dist/docs/03-architecture/accessibility.md
@src/components/ui/button.tsx
@src/components/ui/dropdown-menu.tsx
@src/components/patterns/nav-drawer-shell.tsx
@src/components/patterns/auth-slot-skeleton.tsx
@src/lib/design/measurements.ts
@e2e/helpers/focus.ts
@e2e/mode-switch.spec.ts
@e2e/shell.spec.ts
</context>

<source_audit>

| Source | Item | Coverage |
|--------|------|----------|
| GOAL | The new navigation menu follows FitOut's established visual, responsive, and accessible interaction standards. | Tasks 1 and 2 |
| REQ | No ROADMAP requirement is assigned to this quick item; `QUICK-260916-FGD` is its local execution contract. | Tasks 1 and 2 |
| RESEARCH | Level 0: the installed Next.js guidance, Button, DropdownMenu, menu-drawer, design-measurement, focus-helper, and shell-test patterns already establish the required client boundary and UI recipes; no package or external integration is introduced. | Tasks 1 and 2 |
| CONTEXT | No item-specific CONTEXT.md, locked decision, or deferred idea is present. | No additional constraint |

</source_audit>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Make the final shared menu conform to the header interaction recipe</name>
  <files>src/components/nav-icon-menu.tsx, e2e/mode-switch.spec.ts</files>
  <behavior>
    - A signed-in user can find a ghost icon button named `Navigation menu`; its decorative glyph is excluded from the accessible name and its trigger keeps the `data-mode-switch` and `data-current` hooks inherited from quick item `260916-fgb`.
    - Keyboard Tab, Enter or Space, arrow-key menu navigation, and Escape expose the shared focus treatment, open the menu, move through its controls, and restore focus to the trigger when the menu closes.
    - The opened menu presents the in-app Profile link, the existing context-switch submenu, and the Sign out action as distinct groups; the sign-out item retains its destructive dropdown treatment and all capability/logout behavior from the prerequisite items remains unchanged.
  </behavior>
  <action>
First extend `e2e/mode-switch.spec.ts` with a final-menu standards case before editing the component.
Use a fresh signed-in account and accessible role/name queries at the 320px header width. Drive the
trigger and menu with real keyboard events, use the repository `expectRing` helper to verify a
visible keyboard focus indicator on the trigger, assert the Profile entry is the `/profile` link,
assert that the context submenu and Sign out are reachable in the expected grouping, and confirm
Escape returns focus to the `Navigation menu` trigger. Keep the prerequisite host-to-booker,
booker-to-host, direct-route gate, and session-clearing cases intact; this case must observe actions
without ending its test session.

Then refine the `NavIconMenu` supplied by `260916-fgb` and `260916-fgc` to compose only the existing
`Button` and `DropdownMenu` primitives. Its root trigger must be the established ghost, 32px icon
button, source its size from `AUTH_SLOT_ICON`, and carry the accessible name `Navigation menu` with
an `aria-hidden` menu glyph. Preserve the prerequisite's data hooks and client-side capability/action
logic exactly. Use the existing dropdown content, labels, submenu, and separators to make Profile,
context switching, and the final Sign out action visually and semantically distinct. Keep Sign out
as the separated destructive dropdown item authored by `260916-fgc`; do not change its pending,
failure, session, or routing behavior. Do not introduce ad-hoc colours, elevation, duration, focus,
or responsive classes: the shared primitives already supply those recipes.
  </action>
  <verify>
    <automated>npm run lint && npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium</automated>
  </verify>
  <done>The final menu is one named ghost icon trigger with the standard focus behavior; keyboard users can discover and close its Profile, context, and destructive Sign out groups; existing navigation, activation, logout, and authorization behavior remains intact.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Reserve the compact menu-and-bell header geometry through session loading</name>
  <files>src/lib/design/measurements.ts, src/components/patterns/auth-slot-skeleton.tsx, src/components/patterns/site-chrome.tsx, src/app/dev/theme/page.tsx, e2e/shell.spec.ts</files>
  <behavior>
    - The signed-in action cluster reserves exactly 88px by 44px: the 32px navigation-menu trigger, a 12px standard header gap, and the 44px notification bell.
    - A session-aware public header shows two matching skeleton shapes while pending and the final compact cluster when resolved, without changing the action-slot rectangle at the tested widths or themes.
    - The design-theme preview presents the same resolved geometry beside its fallback so the existing visual measurement surface remains truthful.
  </behavior>
  <action>
Add a focused assertion to the existing session-resolution loop in `e2e/shell.spec.ts` before changing
the geometry. In addition to its current pending-versus-resolved equality check, assert that the
shared auth-slot reservation measures 88px wide and 44px high in both states. Keep the existing
coverage across public compositions, themes, and viewport widths; this test is the browser proof of
the layout contract, not a new visual-baseline lane.

Replace the obsolete wide-control reservation in `src/lib/design/measurements.ts` with the compact
cluster's declared `h-11 min-w-22` box. Retire `AUTH_SLOT_CONTROL` only after its sole preview use
is removed, while preserving `AUTH_SLOT_ICON` for the 32px navigation trigger and
`NOTIFICATION_BELL_BOX` for the 44px bell. Update `AuthSlotSkeleton` to render those two exact
placeholder shapes in the same gap and order as the resolved cluster. Update the narrow header
reservation documentation in `SiteChrome` so it describes the menu-plus-bell dimensions rather than
the replaced profile/mode controls, and keep `AUTH_SLOT_BOX` as the one imported source of the
resolved and pending dimensions.

Update the loading-shapes section of `src/app/dev/theme/page.tsx` to show the same ghost menu-icon
and bell-shaped resolved cluster beside `AuthSlotSkeleton`, using the measurement constants rather
than copied geometry. The preview stays a measurement illustration: do not make it a second menu
implementation or alter its page's audit role.
  </action>
  <verify>
    <automated>npm run test:design -- tests/design/skeleton-measurements.test.ts tests/design/button-variants.test.ts tests/design/focus-recipe.test.ts tests/design/elevation-z.test.ts && npm run test:e2e -- e2e/shell.spec.ts --project=chromium</automated>
  </verify>
  <done>Pending and resolved public-header action slots measure identically at 88 by 44 pixels, their skeleton and preview use the shared measurement constants, and the existing design and shell checks prove the standard primitives and no-shift contract still hold.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Header icon trigger -> account/context actions | An icon-only control exposes actions that navigate, activate a capability, or end the current browser session. |
| Client menu -> server-backed actions | Existing capability and sign-out handlers act on the authenticated browser session after a menu selection. |
| Session-loading fallback -> resolved header | Streaming replaces a non-interactive placeholder with authenticated controls. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260916-fgd-01 | Spoofing | `NavIconMenu` icon trigger | medium | mitigate | Use the stable accessible name `Navigation menu`, hide the decorative icon, and prove role/name keyboard discovery in the browser. |
| T-260916-fgd-02 | Elevation of privilege | context and logout menu items | high | mitigate | Preserve the prerequisite Better Auth, capability-action, and layout-gate implementations; this plan changes composition only and retains their browser proofs. |
| T-260916-fgd-03 | Denial of service | streamed header action slot | low | mitigate | Share the compact reservation between `SiteChrome` and `AuthSlotSkeleton`, with browser geometry checks across pending and resolved states to prevent layout churn. |
| T-260916-fgd-SC | Tampering | npm/pip/cargo installs | low | accept | The plan uses installed Next.js, Radix, Lucide, Playwright, and Vitest facilities; package-manager and lockfile changes are out of scope. |

</threat_model>

<explicitly_out_of_scope>

- Adding or changing profile, capability-activation, authorization-gate, Better Auth, or logout semantics; quick items `260916-fgb` and `260916-fgc` own those behavior changes.
- A new header layout, navigation destination, menu primitive, visual-baseline project, dependency, schema migration, or selector-contract entry.
- Changing the signed-out Log in / Sign up pair or the host navigation drawer.
</explicitly_out_of_scope>

<verification>

Run `npm run lint`, then the focused menu browser test, the listed design-contract tests, and the
header shell browser test. The menu test must use roles, names, real keyboard events, and the existing
focus helper rather than visual-glyph selectors. The shell test must show the same 88 by 44 action-slot
rectangle before and after session resolution across its declared route/theme/viewport matrix. Inspect
the final diff to confirm the plan touches only the seven files in frontmatter and adds no package or
authentication changes.
</verification>

<success_criteria>

- The shared final menu follows FitOut's Button and DropdownMenu recipes for its icon trigger, keyboard focus, overlay, grouping, and destructive account action.
- The menu remains accessible by the stable `Navigation menu` name and retains all functionality delivered by the prerequisite quick items.
- Session-aware public headers reserve and render the final menu-plus-bell geometry without a layout shift.
- The design preview and automated checks remain aligned with the actual header composition.
</success_criteria>

<output>
Create `.planning/quick/260916-fgd-ensure-the-new-navigation-menu-adheres-to-the-established-ui-standards/260916-fgd-SUMMARY.md` when done. Record the menu keyboard/focus result, the header pending/resolved geometry readings, and confirmation that capability and logout behaviors remained owned by `260916-fgb` and `260916-fgc`.
</output>
