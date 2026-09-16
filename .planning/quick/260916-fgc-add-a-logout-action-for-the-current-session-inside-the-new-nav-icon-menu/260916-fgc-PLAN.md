---
quick_id: 260916-fgc
slug: add-a-logout-action-for-the-current-session-inside-the-new-nav-icon-menu
phase: quick-260916-fgc
plan: 01
type: execute
wave: 2
depends_on: ["260916-fgb"]
created: 2026-09-16
source: "Add a logout action for the current session inside the new nav icon menu."
autonomous: true
requirements: [QUICK-260916-FGC]
files_modified:
  - src/components/nav-icon-menu.tsx
  - e2e/mode-switch.spec.ts
estimate:
  tokens: 14000
  raw_tokens: 14000
  tasks: 1
  confidence: low
must_haves:
  truths:
    - "A signed-in booker or host can choose Sign out from the shared navigation menu and reaches the regular login page only after the active browser session is ended."
    - "A failed logout leaves the user on the current authenticated surface with a visible, generic error instead of falsely navigating to the logged-out state."
    - "A browser test proves the logout route clears the session used by that browser and restores the existing protected-route redirect."
  artifacts:
    - path: "src/components/nav-icon-menu.tsx"
      provides: "A current-session Sign out menu item using the existing Better Auth browser client."
    - path: "e2e/mode-switch.spec.ts"
      provides: "Browser coverage for signing out through the common navigation menu."
  key_links:
    - from: "src/components/nav-icon-menu.tsx"
      to: "src/lib/auth-client.ts"
      via: "authClient.signOut sends the current browser's authenticated request to Better Auth."
    - from: "src/components/nav-icon-menu.tsx"
      to: "/login"
      via: "The client router navigates there only from the sign-out success callback."
    - from: "e2e/mode-switch.spec.ts"
      to: "/api/auth/get-session, /profile"
      via: "The test observes an absent session and the app's established protected-route handling after menu logout."
---

<objective>
Add a safe, discoverable current-session logout control to the navigation menu created by quick item
`260916-fgb`.

Purpose: every signed-in header now consolidates account actions in one menu, so ending the browser's
active session must be available in that same reachable place without creating a second authentication
implementation or affecting sessions on other devices.

Output: the shared `NavIconMenu` gains an accessible `Sign out` item backed by the existing Better Auth
browser client, plus a focused end-to-end proof that the current browser session ends and protected
navigation returns to the login journey.
</objective>

<execution_context>
@C:/Users/Admin/.codex/gsd-core/workflows/execute-plan.md
@C:/Users/Admin/.codex/gsd-core/templates/summary.md
</execution_context>

<context>
@AGENTS.md
@.planning/quick/260916-fgb-introduce-a-nav-icon-menu-that-contains-the-profile-action-and-booking-mode-switch/260916-fgb-PLAN.md
@node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
@node_modules/next/dist/docs/01-app/02-guides/authentication.md
@node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md
@src/components/nav-icon-menu.tsx
@src/lib/auth-client.ts
@src/components/ui/dropdown-menu.tsx
@e2e/mode-switch.spec.ts
</context>

<source_audit>

| Source | Item | Coverage |
|--------|------|----------|
| GOAL | A signed-in person can end their current session from the new navigation icon menu. | Task 1 |
| REQ | No ROADMAP requirement is assigned to this quick item; `QUICK-260916-FGC` is its local execution contract. | Task 1 |
| RESEARCH | Level 1 verification: the installed Better Auth client and its current official documentation support `authClient.signOut`, whose success callback can route to the login page. Existing client-component and dropdown patterns cover the rest; no package or external integration is needed. | Task 1 |
| CONTEXT | No item-specific CONTEXT.md, locked decision, or deferred idea is present. | No additional constraint |

</source_audit>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: End the active browser session from the shared navigation menu</name>
  <files>src/components/nav-icon-menu.tsx, e2e/mode-switch.spec.ts</files>
  <behavior>
    - A signed-in user can open the accessible Navigation menu and find a Sign out menu item after the profile and context actions.
    - Selecting Sign out ends only the current browser session through Better Auth and then routes to `/login`; a subsequent session read is empty and `/profile` uses the existing sign-in redirect.
    - While sign-out is pending, the menu cannot send a duplicate session-ending request; if Better Auth reports an error, the user stays on the authenticated route and receives a generic alert.
  </behavior>
  <action>
Extend the `NavIconMenu` produced by `260916-fgb` rather than adding a second header control or a new
server action. First add a focused browser case to `e2e/mode-switch.spec.ts`: create a fresh booker
through the existing signup helper, open the menu by its accessible name, select its Sign out item,
wait for `/login`, assert `/api/auth/get-session` no longer returns the signed-in session, and visit
`/profile` to prove the established protected-route redirect remains in effect. Keep the host/booker
mode-transition cases from the prerequisite plan intact.

Implement that behavior in the existing client component with `authClient` from `@/lib/auth-client`.
Use `authClient.signOut` for the current cookie-backed session; do not use session-list/revocation APIs
or import the server-only `auth` instance into this client boundary. Place a separated `Sign out` menu
item after the account and context controls, using the repository dropdown item's destructive variant
and the established icon/button semantics. Start the operation in the component's existing transition
handling, prevent a second selection while pending, and expose its pending label. Keep the menu open
until the request resolves so an error can remain discoverable; on an error, render the project-standard
generic alert without leaking transport details and do not navigate. On the Better Auth success callback,
use the existing App Router instance to navigate to the fixed `/login` destination, then refresh the
route state. Do not alter route guards, cookie configuration, capability activation behavior, other-device
sessions, or the ops-only sign-out flow.
  </action>
  <verify>
    <automated>npm run lint && npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium</automated>
  </verify>
  <done>The shared navigation menu has one accessible Sign out item; success clears the active browser session and reaches `/login`, failure stays authenticated with a generic alert, duplicate clicks are prevented while pending, and the focused browser spec confirms the cleared session plus protected-route behavior.</done>
</task>

</tasks>

<threat_model>

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Navigation menu client -> Better Auth endpoint | A browser event asks the authentication service to end the session represented by its cookie. |
| Logout success -> login route | Client-side state changes from authenticated controls to the public sign-in surface. |
| Browser test -> session endpoint | Test-only assertions inspect the session response after the browser action. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260916-fgc-01 | Elevation of privilege | `NavIconMenu` client boundary | high | mitigate | Use the typed Better Auth browser client, which sends the current cookie-backed request to the existing authenticated endpoint; never import server auth code or session-management primitives into client UI. |
| T-260916-fgc-02 | Denial of service | Sign out menu action | low | mitigate | Reuse transition pending state and disable repeated menu selection until the one request settles. |
| T-260916-fgc-03 | Tampering | Post-logout navigation | medium | mitigate | Route only to the fixed local `/login` path after the client reports success; no callback value is read from menu input or URL state. |
| T-260916-fgc-SC | Tampering | npm/pip/cargo installs | low | accept | This change uses existing Better Auth, Radix, and app-router dependencies; no package-manager action or lockfile change is permitted. |

</threat_model>

<explicitly_out_of_scope>

- Creating or changing any server-side authentication endpoint, session lifetime, cookie, or revocation policy.
- Ending sessions belonging to other browsers or devices.
- Altering host/booker capability activation, direct-route guards, profile navigation, or the ops-host sign-out flow.
- Broad menu visual redesign or standards audit, which remains the scope of `260916-fgd`.
</explicitly_out_of_scope>

<verification>

Run `npm run lint && npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium`. The browser case must
exercise the actual menu and Better Auth request, confirm the login destination, confirm the browser's
session endpoint is empty afterward, and confirm the current protected-route behavior rather than merely
checking that a menu label renders. Inspect the final diff to ensure only the shared menu and its focused
browser spec changed.
</verification>

<success_criteria>

- Every surface that receives `NavIconMenu` inherits the same Sign out action without a parallel header control.
- The action ends the current browser session through the existing Better Auth client and reaches `/login` only after success.
- Pending and failure behavior prevents misleading logout state and does not reveal service details.
- No capability, server-authorization, dependency, or cross-device-session behavior changes.
</success_criteria>

<output>
Create `.planning/quick/260916-fgc-add-a-logout-action-for-the-current-session-inside-the-new-nav-icon-menu/260916-fgc-SUMMARY.md` when done. Record the focused E2E outcome, the session-clearing proof, and that visual standards review remains with `260916-fgd`.
</output>
