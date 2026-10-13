# Phase 27 — OPS-11 disabled release packet

**Prepared for review; not yet approved or executed. Contact stays disabled.** All six exact-source engineering gates and the separate flags-on staff built-server proof passed. See27-OPS11-REPAIR-RESULT.md/.json. Execution still requires approval of this new exact revision.

## Exact candidate and scope

- Source: 6bb6e3f74e2acb4b3fe9ec7c8de4fecc7a5f05d3.
- Git archive SHA256: 8feb311adca91cbbfa5c0eb27991ebc8f8f7c0e2dcc4cebc24f6484c8eb9a8ea.
- Captured clean application/test manifest: a8b68c81fffbe53301b4c9b9566a80116ca02d2a16d5e3b563591098b293a499, 1,113 files. Documentation commits do not replace this tested application revision.
- Changes: positive customer role checks at booking/hosting/organizer/upload boundaries and protected pages, explicit customer-role test fixtures, local staff direct-call and built-server regressions. No migration, provider receiver, payment/payout algorithm, auth configuration, Contact implementation, origin or proxy change.
- At most two fresh protected Production-target builds, one in fitout-web/prj_my7iigeFoojFO2QmXYYfr49p8uiz and one in fitout-ops/prj_cUmYg0pQne8gkYKrHd8KY2O4rAQj, team_EZAfhT8qJ6msqrCzas3rvdjG. Export exact committed source; check archive/blob and deployment metadata rather than trusting CLI-inferred parent-checkout Git metadata. No diagnostic route is added.

## Baseline and recovery

Web baseline: dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg / fitout-6dr93opgm-pengr3s-projects.vercel.app. Serving web aliases fitout.live, app.fitout.live, www.fitout.live, fitout-web-psi.vercel.app and fitout-web-pengr3s-projects.vercel.app.

Ops baseline: dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4 / fitout-ajur9x7xb-pengr3s-projects.vercel.app. Serving Ops aliases ops.fitout.live, fitout-ops.vercel.app and fitout-ops-pengr3s-projects.vercel.app.

Read-only baseline 2026-10-13 confirms all those mappings and web/Ops CONTACT_PRODUCTION_ENABLED=false; web CONTACT_INGRESS_VERIFICATION_MODE=false. Preserve the owner's UI/older evidence Preview aliases. Refresh the exact maps, disabled values, protected staging policy, project domain-assignment control and provider metadata before executing; stop on unapproved drift.

## Proposed authorized operations

1. Stage the two exact disabled builds with the installed authenticated CLI and existing Production configuration. Do not edit project-wide settings, environment values, domains, firewall, provider configuration or database rows. Public domains remain on baseline while staging. If Vercel automatically moves only a generated project alias, point that exactly identified alias back to its captured baseline while preparing; do not expand the allowed alias set.
2. If the Vercel/Inngest integration moves the financial receiver during staging, restore the exact baseline receiver, privately preserving its provider-managed query, and verify the complete original 14 function IDs and 16 trigger entries. Keep the separate Contact alert app's one function and apex receiver. Never invoke/rerun financial jobs. Capture this baseline registration before any build so recovery is independently bound.
3. Verify READY, correct project/team/Production target/source binding, disabled flags and unchanged Contact/provider/auth/origin/proxy code. The owner enters credentials directly if a fresh staff session is needed; no passwords or cookies enter evidence or chat. Prepare this session before public promotion. If it is unavailable, stop with the builds protected and public aliases at baseline.
4. Promote Ops and web to their exactly identified candidate builds using only the captured eight production aliases. Verify independent host routing and both serving sources. This is a permanent disabled code release after acceptance, not a Contact-enabled test window.
5. Perform at most 40 ordinary health/authorization GETs and one isolated authenticated POST /start-hosting, which must deny staff without changing capabilities. GET coverage includes anonymous app/marketing/Ops routing, staff customer-page denial over HTML/Flight, existing customer access, session host isolation and disabled Contact page/configuration. Denial means the neutral not-found body and no protected data; streaming200 responses are reported separately from404 statuses, matching the actual local proof. No booking, cancellation, verification, payout, webhook or Contact POST is authorized. Clear only the tester's own newly created session; credentials/cookies are not persisted.
6. After promotion, intentionally reconcile the financial app to the exact new web /api/inngest receiver, preserving its managed query and the same 14 function IDs/16 triggers. Separate Contact app remains at https://fitout.live/api/contact-alerts/inngest with its same one function. This candidate receiver becomes the release receiver only after exact readback; no jobs are invoked. If the integration already did this, reconcile and record that automatic action rather than submitting another change unnecessarily.
7. Finish read-only alias/deployment/flag/provider metadata/registration and primary aggregate checks. Keep both Contact flags false. Record actual staff denial and customer control evidence against the new revision. If a source/host/session/flag/registration check fails, restore only the captured web/Ops aliases and exact original financial receiver, verify the disabled baseline, and stop. No automatic rebuild/retry or broadened test action.

Stage/probe preparation is limited to 60 minutes. Public cutover verification is limited to ten minutes with an eight-minute watchdog restoring the captured aliases/receiver on incomplete or failed verification. Do not start promotion without an available tester session and a functioning recovery coordinator. Preserve all failed/partial evidence.

## Separate account disposition and acceptance

This packet does **not** clear capabilities, change a role, edit sessions/credentials or transfer financial records. Existing staff account 987a6470-5c2a-4fab-8816-a1d4dd78209d (fr***@gmail.com) still has both flags true. The candidate denies that role regardless of those flags; formal OPS-11 data consistency remains open until the owner chooses the account's disposition and an exact attributed repair is prepared. Recommended disposition is retain staff, clear both customer flags through the existing role authority, and retain all historical records.

Do not relabel the 58897a94 35/35 matrix or provider/control observations as fresh candidate observations. Qualify unchanged-module continuity explicitly, retain the actual new runtime identities, and rerun the honest evidence validators. Phase 27, Plan 09, all seven requirements and independent money/legal HOLDs remain open. Provider signed delivery and actual Contact inquiry/reply remain separate packets.

The previous owner approvals covered exact older release/test/diagnostic scopes. They do not establish execution authority for this newly created application revision. Approval here is for the two builds, exact alias cutover/recovery, bounded nonfinancial checks and exact Inngest reconciliation above; it enables no public Contact delivery or account mutation.
