---
quick_id: 260916-fgb
slug: introduce-a-nav-icon-menu-that-contains-the-profile-action-and-booking-mode-switch
phase: quick-260916-fgb
plan: 01
type: execute
wave: 1
depends_on: []
created: 2026-09-16
source: "Introduce a nav icon menu that contains the profile action and booking-mode switch."
autonomous: true
requirements: [QUICK-260916-FGB]
files_modified:
  - src/components/nav-icon-menu.tsx
  - src/components/patterns/site-chrome.tsx
  - src/app/(host)/host/layout.tsx
  - src/components/site/public-header.tsx
  - src/app/(app)/layout.tsx
  - e2e/mode-switch.spec.ts
files_deleted:
  - src/components/mode-switch.tsx
estimate:
  tokens: 26000
  raw_tokens: 26000
  tasks: 2
  confidence: low
must_haves:
  truths:
    - "A signed-in host can open one icon-triggered navigation menu, see a Profile action and the current booking/hosting context controls, and switch from hosting to booking."
    - "A signed-in booker sees the same menu on public and authenticated-booker headers; its context controls still activate the missing capability through the existing server action before routing."
    - "Profile remains an in-app link to /profile, and direct URL capability gates remain the authorization boundary rather than the menu."
  artifacts:
    - path: "src/components/nav-icon-menu.tsx"
      provides: "The reusable client-side account/navigation menu and the migrated capability-switch behavior."
    - path: "e2e/mode-switch.spec.ts"
      provides: "Browser coverage for the host and booker menu paths."
  key_links:
    - from: "src/app/(host)/host/layout.tsx, src/components/site/public-header.tsx, src/app/(app)/layout.tsx"
      to: "src/components/nav-icon-menu.tsx"
      via: "current surface and server-resolved canBook/canHost props"
    - from: "src/components/nav-icon-menu.tsx"
      to: "src/app/actions/capability.ts"
      via: "existing activation actions followed by router navigation and refresh"
    - from: "src/components/nav-icon-menu.tsx"
      to: "src/app/(app)/profile/page.tsx"
      via: "the Profile menu link targets /profile"
---

<objective>
Replace the separate profile affordance and booking/hosting dropdown with one reusable, icon-triggered
navigation menu in every signed-in header composition.

Purpose: signed-in controls are currently scattered across the header even though profile navigation and
context switching are both account-level actions. The menu consolidates them without altering the
server-side authorization or capability-activation contracts.

Output: a `NavIconMenu` client component, three header compositions wired to it, removal of the now
superseded standalone mode switch and profile-link export, and browser coverage of the two capability
paths. `260916-fgc` alone adds logout after this menu exists; `260916-fgd` alone owns any broader visual
standards audit.
</objective>

<execution_context>
@C:/Users/Admin/.codex/gsd-core/workflows/execute-plan.md
@C:/Users/Admin/.codex/gsd-core/templates/summary.md
</execution_context>

<context>
@AGENTS.md
@node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md
@node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
@src/components/mode-switch.tsx
@src/components/patterns/site-chrome.tsx
@src/components/site/public-header.tsx
@src/app/(app)/layout.tsx
@src/app/(host)/host/layout.tsx
@src/components/ui/dropdown-menu.tsx
@e2e/mode-switch.spec.ts
</context>

<source_audit>

| Source | Item | Coverage |
|--------|------|----------|
| GOAL | One nav icon menu contains profile navigation and booking/hosting switching. | Tasks 1 and 2 |
| REQ | No ROADMAP requirement is assigned to this quick item; `QUICK-260916-FGB` is its local execution contract. | Tasks 1 and 2 |
| RESEARCH | Level 0: existing `DropdownMenu`, capability actions, layouts, and E2E harness provide the required pattern; no dependency or external integration is introduced. | Tasks 1 and 2 |
| CONTEXT | No item-specific CONTEXT.md or locked/deferred decision is present. | No additional constraint |

</source_audit>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Deliver the host-header navigation-menu slice</name>
  <files>src/components/nav-icon-menu.tsx, src/components/mode-switch.tsx, src/components/patterns/site-chrome.tsx, src/app/(host)/host/layout.tsx, e2e/mode-switch.spec.ts</files>
  <behavior>
    - A signed-in host can open an icon-only button named "Navigation menu" from the host header.
    - The opened menu exposes an in-app Profile link to `/profile` and a context submenu whose booking option routes a host-capable user to `/`.
    - Missing `canBook` or `canHost` still invokes the existing server action before navigation; action failure remains visible as an alert and does not navigate.
    - The host layout's blocking session and `canHost` redirects remain before any header JSX, so the menu is never an authorization mechanism.
  </behavior>
  <action>
Create `src/components/nav-icon-menu.tsx` as the sole client-side owner of the existing `ModeSwitch`
transition and capability-activation behavior. It receives `current`, `canBook`, and `canHost` from the
server-rendered layouts. Use the repository's Radix dropdown primitive and its submenu primitives: one
icon-only trigger with an accessible name of `Navigation menu`; a `DropdownMenuItem asChild` Profile
link to `/profile`; and a labelled context submenu whose two items retain the existing `Switch to` versus
`Start` copy, `data-mode-target` hooks, transition-pending protection, and failure alert. Do not nest
separate dropdown roots to simulate the context control, because the existing submenu primitive supplies
the focus and arrow-key model for this composition.

Retain `data-mode-switch` and `data-current` on the new trigger so the established host E2E hook keeps
meaning, even though the trigger changes from a text button to a navigation icon. Preserve the existing
`activateBooking`/`activateHosting` actions, `router.push`, and `router.refresh` semantics exactly; the
menu may improve discoverability but cannot relax the app and host layouts' server guards.

Replace the host layout's separate `ModeSwitch` and `ProfileLink` action children with `NavIconMenu`,
passing its already-read capability values and `current="host"`. Do not move its session/capability gate
or its notification Suspense boundary. Remove the obsolete `mode-switch.tsx` file. Remove the unused
`ProfileLink` export and any now-unused icon import from `site-chrome.tsx`, while leaving its shared
geometry and navigation-landmark behavior unchanged.

Extend the existing host E2E path before implementation so it opens the new menu by accessible name,
asserts that the Profile entry is a `/profile` link, opens the context submenu, selects booking, and
waits for `/`. Keep the existing direct-URL host-gate test unchanged; it proves the separate security
boundary the new UI must not replace.
  </action>
  <verify>
    <automated>npm run lint && npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium</automated>
  </verify>
  <done>A host sees one accessible navigation icon menu in the host header; the menu contains a working Profile link and booking-mode action, all prior activation/error semantics survive, and the focused browser spec proves the end-to-end host path.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Expand the shared menu to public and authenticated-booker headers</name>
  <files>src/components/site/public-header.tsx, src/app/(app)/layout.tsx, e2e/mode-switch.spec.ts</files>
  <behavior>
    - A signed-in user on the public booking surface sees the same Navigation menu instead of separate mode and profile controls.
    - A booker without hosting capability can select `Start hosting`, receive the existing server-side activation, and arrive at `/host`.
    - A signed-in user on an authenticated-booker route receives the same menu props and profile/context actions.
  </behavior>
  <action>
Wire `NavIconMenu current="book"` into `PublicAuthSlot` and `(app)/layout.tsx`, passing their existing
server-resolved `canBook` and `canHost` values. Remove only the direct imports and rendered instances of
the former mode switch and profile link; leave `AmbientNotifications`, session reads, Suspense fallbacks,
footer placement, and the public signed-out authentication pair as they are. Update stale header comments
only where they would otherwise describe controls that no longer render; do not recast the established
shell contract or layout geometry in this feature task.

Add the booker expansion to `e2e/mode-switch.spec.ts`: after a book-intent sign-up reaches `/`, the
accessible menu exposes Profile and the context option; choosing `Start hosting` follows the existing
action and reaches `/host`. This complements, rather than replaces, the current booker direct-navigation
test, which must keep asserting that a user who has not activated hosting is redirected away from `/host`.

Do not add logout, destructive-menu treatment, or a new dependency. Those are not needed to make the
profile and context actions operational and are owned by sibling quick items `260916-fgc` and
`260916-fgd` respectively.
  </action>
  <verify>
    <automated>npm run lint && npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium</automated>
  </verify>
  <done>Public and authenticated-booker headers render the shared icon menu, the booker activation path reaches the host surface through the existing server action, and the focused browser spec covers both host-to-booking and booker-to-hosting transitions.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Header UI -> protected routes | A menu action can suggest a route but cannot authorize access to it. |
| Client component -> capability action | Browser interaction requests booking/hosting capability activation. |
| Profile action -> `/profile` | The visible link crosses into an authenticated-booker route. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260916-fgb-01 | Elevation of privilege | `NavIconMenu` mode controls | high | mitigate | Reuse `activateBooking`/`activateHosting` and keep the layouts' blocking server gates; E2E retains the direct-URL rejection proof. |
| T-260916-fgb-02 | Spoofing | Icon-only menu trigger | medium | mitigate | Give the trigger the stable accessible name `Navigation menu`; test it by role/name rather than a visual glyph. |
| T-260916-fgb-03 | Denial of service | capability activation interaction | low | mitigate | Preserve the existing transition-pending disable state so a menu action cannot be submitted repeatedly while its server action is in flight. |
| T-260916-fgb-SC | Tampering | npm/pip/cargo installs | low | accept | The plan uses existing Radix and Lucide dependencies; no package-manager install or lockfile change is allowed. |

</threat_model>

<explicitly_out_of_scope>

- Adding the logout action. Item `260916-fgc` depends on this menu and owns that session mutation.
- Redesigning the menu's visual recipe beyond the existing Button and DropdownMenu primitives. Item `260916-fgd` owns the standards review.
- Changing `activateBooking`, `activateHosting`, their server validation, or either layout's direct-route security gates.
- Adding a dependency, schema migration, or new selector-contract entry; accessible role/name queries and retained hooks cover this feature.
</explicitly_out_of_scope>

<verification>

Run `npm run lint` and `npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium`. The focused
browser run must prove the host-to-booking switch, booker-to-host activation switch, Profile link, and
the pre-existing direct `/host` rejection. Inspect the final diff to confirm it contains only the six
listed modified files and the one deleted standalone switch component.
</verification>

<success_criteria>

- Exactly one shared `NavIconMenu` implements profile navigation and context switching across the host,
  public-booking, and authenticated-booker headers.
- The icon trigger is reachable by keyboard and screen readers as `Navigation menu`; the Profile entry
  is an in-app `/profile` link.
- Existing capability action, pending state, failure alert, and routing behavior are preserved.
- Direct access remains protected by the existing server-side layout gates.
- No logout behavior, package installation, or unrelated header redesign is included.
</success_criteria>

<output>
Create `.planning/quick/260916-fgb-introduce-a-nav-icon-menu-that-contains-the-profile-action-and-booking-mode-switch/260916-fgb-SUMMARY.md` when done. Record the host and booker E2E outcomes, the retained security-gate proof, and that logout/UI-audit follow-ups remain owned by `260916-fgc` and `260916-fgd`.
</output>
