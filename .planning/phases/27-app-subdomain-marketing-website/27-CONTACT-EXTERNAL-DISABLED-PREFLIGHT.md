# Phase 27 — One external-network disabled guard probe

Prepared 2026-10-12T09:06:29.855Z. Not approved, created, or executed.

The owner confirms separate physical internet for computer and phone. The exact phone POST was WAF Allowed and handler 503; current active firewall version 8 is valid, enabled, and published with no draft. A read-only operator-IP preset reports seven requests during the phone minute, but does not establish that phone's original IP. Do not diagnose shared IP or rule failure as fact.

## Proposed exact scope

Authorize at most one new empty-body POST to https://fitout.live/api/contact from one fresh Vercel Sandbox. This is a separate one-request disabled preflight budget; the previous two-request budget is exhausted and stays incomplete. It does not renew the enabled live window.

- Team team_EZAfhT8qJ6msqrCzas3rvdjG, web project prj_my7iigeFoojFO2QmXYYfr49p8uiz.
- Create once: official vercel/sandbox/node:24 image, iad1, one vCPU / included 2 GB RAM, timeout 120000 ms, persistent false, no ports/source/mounts/env/secrets/snapshots.
- Egress allow-list only fitout.live. No auth, cookie, bypass, injected IP headers, redirects or retries. Empty body, Origin https://fitout.live, unique User-Agent FitOut-P27-External-Guard-a1016a9d-d6fb-4a73-8cf9-e43bef480d7c.
- Fixed Node HTTPS request: ten-second deadline, 64 KiB response ceiling, no response body persistence. An exclusive in-VM lock prevents a second execution in that session.
- Verify Hobby before creation. Use only its included Sandbox quota; if feature/quota/billing acceptance or upgrade is required, stop. No plan upgrade or paid add-on. Official pricing states Hobby quota is free and creation pauses at exhaustion: https://vercel.com/docs/sandbox/pricing .
- Re-read public baseline Cogas, saved Contact and verification flags false, Ops5WY, active guard version and primary quota0/alert1/pending0 before sending. If drift appears, stop.
- After the response, stop only this newly created session in finally. Confirm it stopped; the two-minute platform expiry is a fallback. Never recreate or rerun on uncertain result.
- Correlate the unique UA and request ID/time in Vercel. Pass only on the exact published restriction's Deny plus trustworthy source-IP evidence different from the exempt operator IP. HTTP403 alone is insufficient. An Allowed503 is another gap, not success.
- Read-only primary after-check must retain quota0/alert1/pending0. Contact savedflags false and public aliases stay Cogas; Ops and both Inngest destinations stay unchanged.

No alias promotion, firewall mutation, quota fixture/cleanup, mail, financial job or release completion is included.

## Prepared artifacts

C:/Users/Admin/Roaming/FitOut/playwright/.cache/phase27-08/per-ip-external-preflight-7781be9b-3b1e-4530-9e83-1c033a98d5a0
probe.mjs, create-request.json, command-template.json, authority.json.
Probe SHA256 41cb23f7a544b9519f61f4488d7bf46c2f41ac7a1070c72850a59aa661f4d820.

If denial passes, use it as an alternative independent-network preflight observation. Reconcile the live packet/verifier binding explicitly before requesting a later exact bounded window. Do not rewrite the failed phone observation or treat this as either completed Contact control.
