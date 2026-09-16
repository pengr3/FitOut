---
quick_id: 260916-jip
slug: switch-the-places-of-the-notification-ic
phase: quick-260916-jip
plan: 01
type: execute
wave: 1
depends_on: []
created: 2026-09-16
source: "Switch the places of the notification icon and nav icon; the navigation icon should be the rightmost header control."
autonomous: true
requirements: [QUICK-260916-JIP]
files_modified:
  - src/components/site/public-header.tsx
  - src/app/(app)/layout.tsx
  - src/app/(host)/host/layout.tsx
  - e2e/mode-switch.spec.ts
estimate:
  tokens: 12000
  raw_tokens: 12000
  tasks: 2
  confidence: low
must_haves:
  truths:
    - "A signed-in user sees the notification control before the navigation-menu icon, with the navigation-menu icon as the rightmost header control, on the public, authenticated-booker, and host header compositions."
    - "Keyboard focus follows the displayed order while the navigation-menu trigger remains reachable and operates exactly as before."
    - "The notification surface, mode-switching behavior, session/capability gates, and component props remain unchanged."
  artifacts:
    - path: "src/components/site/public-header.tsx"
      provides: "Signed-in public-header action order with the navigation-menu icon last."
    - path: "src/app/(app)/layout.tsx"
      provides: "Authenticated-booker header action order with the navigation-menu icon last."
    - path: "src/app/(host)/host/layout.tsx"
      provides: "Host-header action order with the navigation-menu icon last."
    - path: "e2e/mode-switch.spec.ts"
      provides: "Focused browser coverage of the rendered control and keyboard order."
  key_links:
    - from: "src/components/site/public-header.tsx, src/app/(app)/layout.tsx, src/app/(host)/host/layout.tsx"
      to: "src/components/patterns/site-chrome.tsx"
      via: "The existing actions fragment is laid out in sibling order by the shared header shell."
    - from: "e2e/mode-switch.spec.ts"
      to: "the three signed-in header compositions"
      via: "Accessible-control bounding boxes and keyboard traversal verify the user-visible order."
---

<objective>
Place the existing notification control before the existing navigation-menu icon in every signed-in
header composition, so the navigation-menu icon is the rightmost header control.

Purpose: the shared action cluster currently renders the navigation-menu icon before the notification
control, contrary to the intended scan and keyboard order.

Output: three reordered header action fragments and focused browser coverage that asserts the displayed
and keyboard order without changing either control's behavior.
</objective>

<execution_context>
@C:/Users/Admin/.codex/gsd-core/workflows/execute-plan.md
@C:/Users/Admin/.codex/gsd-core/templates/summary.md
</execution_context>

<context>
@AGENTS.md
@node_modules/next/dist/docs/01-app/01-getting-started/11-css.md
@src/components/site/public-header.tsx
@src/app/(app)/layout.tsx
@src/app/(host)/host/layout.tsx
@src/components/nav-icon-menu.tsx
@src/components/notifications/notification-bell.tsx
@e2e/mode-switch.spec.ts
</context>

<source_audit>

| Source | Item | Coverage |
|--------|------|----------|
| GOAL | The notification and navigation icons exchange positions; navigation is the rightmost header control. | Tasks 1 and 2 |
| REQ | No ROADMAP requirement is assigned to this quick item; `QUICK-260916-JIP` is its local execution contract. | Tasks 1 and 2 |
| RESEARCH | Level 0: all controls, header compositions, styling, and the Playwright menu harness already exist; this change introduces no dependency or external integration. | Tasks 1 and 2 |
| CONTEXT | No item-specific CONTEXT.md or locked/deferred decision is present. | No additional constraint |

</source_audit>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Prove and correct the signed-in public-header control order</name>
  <files>src/components/site/public-header.tsx, e2e/mode-switch.spec.ts</files>
  <behavior>
    - On a signed-in public page, the notification button appears to the left of the button named `Navigation menu`.
    - At the compact viewport, keyboard traversal reaches the notification button after the wordmark and the navigation-menu button after the notification button.
    - Opening the navigation menu from its keyboard focus still exposes the existing Profile and context actions.
  </behavior>
  <action>
First extend the existing navigation-menu browser spec with a reusable assertion that scopes both controls
to `data-testid="site-header"`, waits for the existing accessible notification button and the button
named `Navigation menu`, and compares their rendered horizontal positions so the navigation button is
farther right. In the current compact keyboard test, update the Tab traversal to account for the
notification control now preceding the menu trigger, while retaining the existing focus-ring and menu
keyboard assertions.

Then, in `PublicAuthSlot`, exchange only the two existing action siblings: render the existing
`AmbientNotifications` child before the existing `NavIconMenu` invocation. Preserve the server session
read, capability props, signed-out pair, and current async boundary arrangement; this is a layout-order
change, not a notification or menu behavior change.
  </action>
  <verify>
    <automated>npm exec eslint -- "src/components/site/public-header.tsx" "e2e/mode-switch.spec.ts" && npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium</automated>
  </verify>
  <done>The public signed-in header renders notifications before the navigation-menu icon, the navigation-menu icon is physically rightmost, and its compact keyboard path remains proven by the focused browser spec.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Apply the same order to authenticated-booker and host headers</name>
  <files>src/app/(app)/layout.tsx, src/app/(host)/host/layout.tsx, e2e/mode-switch.spec.ts</files>
  <behavior>
    - An authenticated booker on `/profile` sees notifications before the rightmost navigation-menu icon.
    - A host on `/host` sees notifications before the rightmost navigation-menu icon.
    - Existing host-to-booking and booker-to-hosting menu flows continue to pass.
  </behavior>
  <action>
In each existing `SiteChrome` `actions` fragment, place the current notification `Suspense` child before
the current `NavIconMenu` child. Keep each bell fallback, `surface` value, capability prop, blocking
session/capability guard, host navigation slot, and footer exactly where it is. Do not modify
`NavIconMenu`, `AmbientNotifications`, the notification query, or any server action: the change is
limited to sibling render order.

Reuse the focused browser assertion from Task 1 in the existing booker and host flows: verify the
public signed-in header, navigate the booker to `/profile` for the authenticated-booker composition,
and assert the host composition after host sign-up. Preserve the established mode-switch and sign-out
coverage while adding these order checks, so the spec proves all three headers without expanding into
unrelated route or API coverage.
  </action>
  <verify>
    <automated>npm exec eslint -- "src/app/(app)/layout.tsx" "src/app/(host)/host/layout.tsx" "e2e/mode-switch.spec.ts" && npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium</automated>
  </verify>
  <done>All three signed-in header compositions render the navigation-menu icon as their rightmost action control, and the focused browser spec verifies the public, authenticated-booker, and host surfaces alongside the existing menu flows.</done>
</task>

</tasks>

<threat_model>

Assessment: ASVS L1 (opportunistic). Apply a high blocking threshold: only a newly discovered critical
or high-severity regression to an existing security boundary blocks this visual quick task.

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Authenticated header composition -> client controls | Server-rendered session and capability facts reach the existing notification and navigation controls. |
| Header control -> existing protected flows | The navigation control can lead a user to flows whose authorization remains enforced by existing server gates. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260916-jip-01 | Tampering | Three `SiteChrome` action fragments | medium | mitigate | Reorder only the existing siblings; retain their props, `Suspense` fallbacks, and server gates. The focused browser spec proves both controls still render and the menu flows remain operational. |
| T-260916-jip-02 | Spoofing | Icon-only header controls | low | mitigate | Retain the existing accessible names and assert controls by role/name instead of by icon glyph; browser coverage checks the menu remains reachable after the changed tab order. |
| T-260916-jip-SC | Tampering | npm/pip/cargo installs | low | accept | No package install, lockfile mutation, or new dependency is in scope; existing components and Playwright tooling are reused. |

</threat_model>

<conditional_detectors>

- API coverage: not triggered; the task changes no route, request, response, or server-action contract.
- Assumption delta: not triggered; the requested ordering uses the current header components and has no new external or product assumption.
- Schema push: not triggered; the task changes no data model, migration, or database access.

</conditional_detectors>

<verification>

Run the task-level lint command and `npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium` after
each task. The browser run must establish physical notification-before-menu order across public,
authenticated-booker, and host headers, the revised compact Tab sequence, and the existing mode-switch
paths. Inspect the final diff to ensure it changes only the three action-fragment sibling orders and
the focused spec.
</verification>

<success_criteria>

- The navigation-menu icon is the rightmost signed-in header control on the public, authenticated-booker, and host surfaces.
- The notification button appears immediately before it, and compact keyboard focus reaches the controls in that order.
- Notification behavior, menu behavior, capability activation, and server-side route protection are unchanged.
- No new dependency, schema change, API change, or broader header redesign is included.
</success_criteria>

<output>
Create `.planning/quick/260916-jip-switch-the-places-of-the-notification-ic/260916-jip-SUMMARY.md` when done. Record the three verified header compositions, the updated compact keyboard traversal, and the focused browser-test result.
</output>
