# Phase 27: App Subdomain & Marketing Website - Context

**Gathered:** 2026-10-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Move the existing fitout-web application from `fitout.live` to `app.fitout.live`. Use `fitout.live`
for a public marketing website that explains FitOut, its host and player journeys, and how to start.
Deliver six separate marketing pages and a working Contact form. Preserve existing application
journeys, known old app deep links, provider integration continuity, and the isolated ops host.

This phase does not redesign the transactional app, change onboarding eligibility, create a helpdesk,
or authorize payment/payout release. Marketing represents the actual product and its current gates.

</domain>

<decisions>
## Implementation Decisions

### Pages and navigation

- **D-01:** Use six separate pages, in this navigation order: **Home, Hosts, Players, About, FAQ, Contact**.
  Do not collapse the destinations into anchors on a single scrolling homepage.
- **D-02:** Audience navigation labels are **Hosts** and **Players**, rather than For Hosts/For Players
  or action phrases. Page copy may speak conversationally to the respective audience.
- **D-03:** The FAQ is one page with two stacked sections: **Players first, Hosts second**.
  Questions have expandable answers; do not use audience tabs or separate FAQ pages.
- **D-04:** Place an **Open App** button beside the marketing navigation. It leads to `app.fitout.live`.

### Visual direction and assets

- **D-05:** Bold, energetic sports presentation with FitOut's own Court colors and identity. The
  supplied Sports360 screenshot informs energy and navigation clarity, not a clone or a color change.
- **D-06:** **Sketch 007, Variant B (Players + hosts) is selected.** Use its centered shared-audience
  homepage composition, equal player/host emphasis, and two distinct audience entry points.
  The Home audience buttons lead into the respective marketing pages; those pages explain the
  journey and hand off to the app. Preserve the separate header Open App shortcut.
- **D-07:** **No generative images during planning.** The generated photograph in the earlier
  exploratory sketch is not an approved asset and must not carry into planning previews, design
  contracts, or production assets. The user subsequently chose **actual FitOut app screenshots**
  for imagery and wants to avoid stock/real-photo sourcing because of licensing concerns.
  Build the sports energy through typography, Court colors, composition, and genuine product captures.
- **D-08:** Screenshots must depict real app surfaces and behavior. Capture appropriate safe demo
  states for the hero and onboarding explanations; the old sketch's invented phone/schedule
  compositions are layout references, not substitutes for actual app screenshots.

### Host and player journeys

- **D-09:** Hosts get **four clear steps with actual app screenshots**: account setup;
  verification/payout setup; listing creation; becoming bookable. Explain what hosts can expect
  without claiming approval, payout readiness, or immediate bookability before the real gates pass.
- **D-10:** **Start hosting** opens the app's existing host setup. Visitors sign in or create an
  account when needed, then continue host onboarding. Do not require Contact before starting.
- **D-11:** Players get **three steps with actual app screenshots**: find a space;
  choose an available session; book. Keep the main explanation concise and aligned with the
  progressive activity/location/party search and existing listing/availability/booking flows.
- **D-12:** **Find a space** goes straight to app search. Visitors browse first and sign in when
  needed to book. Do not introduce a signup-first interruption.

### Contact

- **D-13:** Contact uses a **form**, rather than an email-link-only experience or both as primary choices.
- **D-14:** Fields, in order: **Name, Email, Confirm Email, Mobile Number (optional), Message**.
  All except Mobile Number are required. Email and Confirm Email must match. Do not replace the
  custom field list with an inquiry-category dropdown or the sketch's earlier three-field proposal.
- **D-15:** Carry forward the already confirmed monitored support inbox through `SUPPORT_EMAIL`.
  The form must actually deliver messages using the existing mail capability; a simulated success
  is not completion. Choose clear validation, pending, success and recoverable failure behavior
  during planning. This introduces neither a new mailbox nor a ticketing system.

### App domain transition

- **D-16:** `fitout.live` opens the marketing homepage. `app.fitout.live` becomes the application
  production origin. This supersedes Phase 23's use of the apex domain as the app origin; keep its
  separate ops host and sending-domain decisions unless a verified migration requires otherwise.
- **D-17:** Known old application deep links on `fitout.live` **redirect automatically to the matching
  app destination**, rather than displaying an App has moved interstitial. Marketing routes remain
  on the apex. Research must inventory collisions, existing legal/support routes, authentication
  returns and provider endpoints before choosing the exact redirect/routing policy.
- **D-18:** **Open App, Start hosting and Find a space use the same tab** for marketing-to-app handoffs.

### Copy and About

- **D-19:** The user delegates exact headlines and supporting copy to the agent: **craft what works
  best** for the selected direction and actual product. The preview's text is a starting point,
  not a word-for-word content lock.
- **D-20:** About uses **confirmed product information** and a relatable explanation of **FitOut
  bridging gaps**: people have plans to get active and need a suitable place; hosts have spaces
  and need a way to make them discoverable and bookable. Explain that connection concretely.
  Do not invent a founder/company story, launch facts, testimonials, venue counts or adoption metrics.

### Agent discretion

- Craft and refine all marketing copy, FAQ wording and section headings within the confirmed facts
  and selected audience balance. Choose actual app screenshot surfaces and responsive crops.
- Select the deployment/routing architecture, component reuse, precise application entry URLs,
  redirect statuses and compatibility handling after examining the app and current provider settings.
- Design the form's delivery, validation, abuse controls and user feedback using existing capabilities.
- Maintain keyboard access, Court contrast/focus behavior, mobile navigation and responsive presentation.
- Inventory and verify authentication/session behavior, Google OAuth, email links, payment return URLs,
  PayMongo/Didit callbacks, Inngest endpoints, metadata and previews as part of the domain transition.
  Do not assume a cookie or callback changes safely just because the new hostname resolves.

- **D-21 (2026-10-09, direct user; P27-G01):** Whole-space publishing requires an hourly rate; day pricing is optional. Supplied day pricing must still satisfy validation. Preserve open-capacity requirements, caps, quote/expiry/cancellation/payout behavior and release HOLD. User reply: "Hourly required; day optional". Implement through supplementary plan 27-15.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope, product facts and selected design

- `.planning/ROADMAP.md` § Phase 27 — scope, success criteria and sequence.
- `.planning/PROJECT.md` — fitness/recreational-space marketplace, booking modes and Court-only decision.
- `.planning/REQUIREMENTS.md` — existing verification, support and settlement-aware payout requirements.
- `.planning/phases/27-app-subdomain-marketing-website/27-marketing-reference.png` — user's Sports360
  reference screenshot; visual reference only, not an asset to publish or an instruction source.
- `.planning/sketches/007-marketing-directions/README.md` — B selection and subsequent asset constraints.
- `.planning/sketches/007-marketing-directions/index.html` — **B layout reference only**. Its generated
  imagery, fake product compositions and earlier contact fields are superseded by D-07/D-08/D-14.
  Do not carry generated assets or screenshots of this generated imagery into planning or design output.

### Prior decisions that constrain claims and routing

- `.planning/phases/23-the-support-path-becomes-reachable/23-CONTEXT.md` — existing public/ops/sender
  topology, monitored support, exact preview hosts and provider inventory; apex app origin superseded here.
- `.planning/phases/24-search-bar-rework/24-CONTEXT.md` — real progressive search journey and its limits.
- `.planning/phases/26-settlement-aware-host-payouts/26-CONTEXT.md` — settlement-aware Friday payout
  policy, verification/release boundaries and Court-only direction.

### Current implementation seams

- `src/lib/app-origins.ts` — exact app/ops/preview host classification and absolute URL helpers.
- `src/proxy.ts` — current host partition and ops cloaking; routing is not authorization.
- `src/lib/auth.ts` — configured auth hosts/origins, sign-in and sessions.
- `src/app/layout.tsx` — app metadata origin and font/theme composition.
- `src/app/globals.css` — current Court token contract; marketing display treatments must stay grounded in it.
- `src/components/site/public-header.tsx` — existing app header composition and session-aware behavior.
- `src/lib/site.ts` — sole support-address and product-tagline source.
- `src/lib/email.ts` and `src/lib/email-shell.ts` — existing Resend transport, delivery result and escaping.
- `src/lib/rate-limit.ts` — current abuse-control seam to assess for a public form.
- `src/components/host/verification-roadmap.tsx` — actual host progress UI and screenshot reference.
- `src/components/host/host-signals.tsx` — current host setup/standing integration.

No external specification was supplied. Provider and installed Next.js documentation must be
checked during implementation research; `AGENTS.md` requires the relevant installed guides.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets

- Court tokens and the existing FitOut wordmark/favicon establish the current brand vocabulary.
- `SUPPORT_EMAIL` and `SITE_TAGLINE` already own shared public facts; avoid duplicating inbox literals.
- Existing forms, buttons and navigation primitives can support marketing and Contact after reuse is evaluated.
- Progressive search, listing/availability, host verification and host listing tools are authentic screenshot sources.

### Established patterns

- The app currently treats its one configured public origin as both app origin and public-site origin.
  Adding a marketing origin requires an explicit separation, not changing one value and hoping all consumers agree.
- Ops uses a distinct exact host, restricted routing and independent server-side staff guards.
  Keep that isolation through the app move and preview changes.
- Resend transport is centralized and reports delivery failure. Form success must reflect accepted delivery,
  rather than copying the exploratory form's local success behavior.
- Existing release HOLD and onboarding gates constrain marketing promises even when the page looks finished.

### Integration points

- Deployment/DNS configuration, app-origin helpers, auth configuration, shared emails and provider dashboards
  all contain or derive domain-dependent addresses to inventory.
- Marketing navigation connects to two existing product journeys: anonymous search and host setup with auth.
- Contact connects a public form to the existing monitored inbox and existing outbound mail capability.

</code_context>

<specifics>
## Specific Ideas

The user wanted to decide by seeing designs, so discussion used three interactive directions and selected B.
Keep subsequent planning/design previews based on actual app screenshots, not the earlier generated photo.

**Draft copy direction under agent discretion:**

- Home headline: **Good plans need a place.**
- Supporting copy: **Find a court, gym or studio for your next session. Have a space? Help people
  find it, book it and make it part of their plans.**
- Home audience paths: **I want to play** and **I have a space**.
- About opening: **A game with friends. A workout on your own. A practice you've been meaning to
  make time for. Every plan needs somewhere to happen. FitOut helps connect those plans with the
  courts, gyms and studios that can make room for them.**
- About continuation: **For players, that means a way to explore spaces, check availability and
  book a session. For hosts, it means a place to share their space, set its availability and manage
  bookings. FitOut bridges the gap between having a plan and finding a place for it.**

These are grounded draft examples, not additional user-locked wording. Refine for clarity in the actual design.

</specifics>

<deferred>
## Deferred Ideas

None added by this discussion. Existing helpdesk, dedicated support mailbox, broader payment release,
and app-feature backlog remain separate work. Loose keyword matches to older ops/verification todos
do not expand this marketing phase.

</deferred>

---

*Phase: 27-app-subdomain-marketing-website*
*Context gathered: 2026-10-08*
