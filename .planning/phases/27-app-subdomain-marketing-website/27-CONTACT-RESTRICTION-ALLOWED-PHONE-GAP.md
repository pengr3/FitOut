# Phase27 — Phone restriction prerequisite not satisfied

Recorded 2026-10-12T08:41:29.972Z. Contact remains disabled. Current exact release source58897a9459cf31b7c8937254dc17ab61ae0ce1d5; public baselineCogas, Ops5WY. Canonical matrix33/35; no new accepted Contact control row.

## Actual renewed preflight

Owner approved exactly two disabled preflight POSTs. Both are now used; do not repeat automatically.

1. Operator: requestt8f68-1791792973534-5d55c9db3920 at2026-10-12T08:16:13.534Z,503/no-store, marked UA, exact productionCogas, no outgoing calls.
2. Owner: reported4:23PM Manila. Vercel matched iPhone Safari18_7, refererhttps://fitout.live/contact, Production POST/api/contact at2026-10-12T08:23:17.319Z, requestt5hdj-1791793397319-fdc0daf1a39b, exactCogas. Firewall explicitlyAllowed; function returned503 and made no outgoing calls. This proves the disabled handler worked; it does not prove an independent network was denied.

Read-only primary snapshot08:32:36.348Z:quota0,retainedalert1,pending0. No enabled-window requests, quota fixture/cleanup, inquiry emails, alias/origin/project-setting changes, rule mutations or manual financial jobs in this renewed preflight. No public test window has started or been approved.

## Diagnosis and remaining uncertainty

CLI rule inspect confirms the existing restriction is active and its five conditions are exact path/api/contact, methodPOST, hostfitout.live, environmentproduction, and original ip_address eq withneg:true. Actiondeny. The private operator-IP value hash still matches the earlier uniquely marked discovery. The original edge rule remains active,50 per600seconds withip key andlog action. Neither is edited.

The phone's exact request context and UI trace do not expose its originalIP. Copied context was inspected privately for original/clientIP fields and then discarded; no raw context, credential or originalIP is persisted. Asked whether the computer shares the phone's hotspot or has separate internet; answer pending. Do not assert that the guard is broken or that the phone uses the exemptIP without that evidence.

Passive allowed-traffic UI narrowed to16:23–16:24 shows8 allowed requests. Its dimension cards retain larger totals and include the16:16 operator marker, so they cannot establish this phone request's originalIP. Do not equate a top-IP card to the phone by inference.

MCP active-config GET fails404 Seawall Config not found; do not treat that as proof no active rules exist. CLI overview fails402 because its IP Bypass inspection is unavailable onHobby, whereas both scoped rule-inspect reads succeed. No upgrade, bypass or broader access is requested. These inspection limitations are retained as diagnostics.

Official references: [custom rule execution](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules) and [rule configuration](https://vercel.com/docs/vercel-firewall/vercel-waf/rule-configuration). They state a Log rule continues execution and a matching Deny stops execution; these references do not establish the cause of thisAllowed request. Rule precedence, exemption/sharedIP, and actual deployed rule/config state remain diagnosis areas, not accepted conclusions.

## Next boundary

Resolve the device/network relationship and obtain trustworthy phone original-IP or equivalent matched provider enforcement evidence. Any further Contact POSTs require a new exact request budget. Any rule repair must be concrete and stay within owner authority; preserve the original Log/system mitigation and keep Contactfalse. Do not promote either protected no-mail variant, create global99 fixtures, send the global control alert or mark either remaining live test passed while this prerequisite is unsatisfied.

Proof directory:playwright/.cache/phase27-08/per-ip-preflight-retry-b98c8894-2acd-44cf-923a-a22d599f4371. Core files:authority.json,operator-provider-trace.txt,phone-provider-trace.txt/.png,owner-phone-report.json,firewall-cli-readback.json,firewall-overview-diagnostic.json,passive-phone-minute-traffic.txt,primary-after-two-requests.json,status.json.


## Read-only diagnosis continuation 2026-10-12T09:06:29.857Z

Owner confirms the computer uses separate internet. This resolves the physical-network handoff, not the phone original-IP attribution. Correct CLI list endpoint /v1/security/firewall/config returns active version8, firewallEnabled:true, two valid active rules, no IP rules, draft:null. Published at07:24:24.515Z. The earlier MCP /config/active404 was an endpoint inspection limitation, now resolved; no rules were edited.

Vercel preset Query Builder explicitly retained4:23pm–4:24pm and reported7 requests matching the exempt operator IP (PH/PLDT/ASN9299). This is passive aggregate evidence, not the exact phone original IP. Persisted redacted operator-ip-phone-minute-query.txt/.json. No further Contact POSTs. Rule-order/exemption cause remains unresolved. Prepared27-CONTACT-EXTERNAL-DISABLED-PREFLIGHT.md proposes exactly one cloud-network request with one nonpersistent two-minute Sandbox, approval pending. No livewindow/fixture/mail authority. Matrix33/35 unchanged.
