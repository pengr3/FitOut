---
quick_id: 260916-kfp
slug: at-375px-replace-the-overflowing-switch-
phase: quick-260916-kfp
plan: 01
type: execute
wave: 1
depends_on: []
created: 2026-09-16
source: "At 375px, replace the overflowing Switch context submenu with one direct opposite-context action: bookers see Switch to hosting and hosts see Switch to booking."
autonomous: true
requirements: [QUICK-260916-KFP]
files_modified:
  - src/components/nav-icon-menu.tsx
  - e2e/mode-switch.spec.ts
---

<objective>
Replace the nested context-switch submenu with one direct menu item representing only the current user's opposite context. This removes the 375px overflow while preserving the existing capability activation and navigation behavior.
</objective>

<tasks>

<task type="auto" tdd="true">
  <name>Replace the nested context submenu with one direct destination action</name>
  <files>src/components/nav-icon-menu.tsx</files>
  <action>Remove the Radix submenu structure and its unused imports. In booking context, render only the existing hosting action with its current capability-aware label and handler; in hosting context, render only the existing booking action with its current capability-aware label and handler. Retain pending/error handling, navigation, activation server actions, profile, sign-out, and accessible menu semantics.</action>
  <verify>npm exec eslint -- "src/components/nav-icon-menu.tsx"</verify>
  <done>The menu is one panel at 375px and shows a single direct action: hosting from booking context or booking from hosting context.</done>
</task>

<task type="auto" tdd="true">
  <name>Cover direct context actions and compact keyboard behavior</name>
  <files>e2e/mode-switch.spec.ts</files>
  <action>Update host and booker flows to select their direct opposite-context action without hovering a submenu. Update the compact keyboard test to assert the direct item is focused after Profile, the obsolete Switch context item is absent, and the menu stays inside a 375px viewport.</action>
  <verify>npm exec eslint -- "e2e/mode-switch.spec.ts"; npm run test:e2e -- e2e/mode-switch.spec.ts --project=chromium</verify>
  <done>Browser coverage proves direct opposite-context labels, preserved switching flows, keyboard order, and a non-overflowing compact menu.</done>
</task>

</tasks>

<threat_model>
ASVS L1, high blocking threshold. Preserve existing server-side capability activation and do not add routes or authorization paths. The direct menu item must retain its current handler, disabled state, and error surface.
</threat_model>