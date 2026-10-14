# Plan 09 — Bounded Contact test result

The owner-approved no-mail test completed on October 11, 2026. Contact is restored disabled; primary quota rows are zero and the temporary deny guard is disabled. The global HTTP control and scoped restoration are observed. Full Contact acceptance remains pending.

## Actual observations

- The owner's mobile-data submission produced one temporary WAF denial from a distinct original IP on Globe Telecoms. A fresh verifier request reached the disabled handler and returned503. Actual original IPs were kept private.
- Before promotion, one owned `contact:global:v1` fixture held100 recent reservations, with expiry06:20:45.006UTC. Exact attempts/expiry matched independent readback and remained valid beyond the test window. This was one synthetic row, not100emails.
- Customer build `dpl_FTxX4Sa4pq8jcW21kmuwiV5vxUFW` was READY and staged from exact source `d67fbecfa41e902cbf506c93dbcf53b60085e802`, Production environment. Auto-domain assignment was visibly Disabled before promotion; Production branch remaineddev. Ops was not promoted.
- The six enabled-window POSTs completed05:25:35–05:25:38UTC. The first schema-valid `.invalid` inquiry returned429 with Retry-After3311; malformed/empty requests returned400 four times; the sixth returned429 with Retry-After895 despite rotated synthetic forwarding headers. No request returned success.
- Request `rw7l5-1791696332669-a73a54cbd492` matched the temporary Production deployment and the synthetic test user agent. The dashboard recorded Firewall Allowed, handler429 and no outgoing HTTP calls. This trace does not establish instrumentation of direct PostgreSQL calls.
- Immediately after the probes, the operator promoted disabled customer pin `dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW` and restored saved Production Contact flagfalse. Apex/app deployment readback matched that pin; Ops remained `dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ`, with savedflagfalse.
- Recovery at05:26:14UTC returned503. Marketing, customer app and staff login all returned200. Fresh browser recovery retained synthetic form fields and re-enabled Send message.
- Exact-match cleanup returned the single100-reservation owned fixture: key, attempts JSONB and expiry all matched the captured fingerprint. Independent subsequent readback showed total_rows0. No other data or migration was changed.
- Only the temporary `rule_phase_27_restricted_contact_test_j9IM6v` was disabled and published after recovery. The original logging-only rule remained enabled. No paid upgrade, system bypass or rule deletion occurred.

## Acceptance limits and next work

The global fixture denial is actual deployed HTTP evidence. The sixth-request limit is sequential process evidence; it does not prove deployment-wide per-IP admission across separate instances. The original Log50/600s edge rule is still logging-only. Automatic quota alerts/notifications and ongoing monitoring have not been established. Manual active-operator restoration does not supply automatic notification proof.

The scoped enabled-to-disabled Contact rollback is observed. Full topology/session/provider rollback and failure-threshold evidence remain pending. Other staff capability, genuine issued-link, provider correspondence, real Contact receipt/Reply-To/reply and release-control gates remain unchanged. No broad public Contact enablement or real inquiry is authorized by this bounded test.

For subsequent planning, isolate the remaining Contact work into: observed shared per-IP ingress enforcement across instances; a concrete alert/monitoring owner, channel and verified delivery; and reviewed ongoing edge/control policy. Any app or account change needs its own concrete scoped plan. Existing test-window, cutover and database approvals are resolved and must not be requested again.

Counts remain20/21 phase plans,144/151 curated plans and29/35 fully observed matrix scenarios. All seven requirements and original Plan09 remain incomplete. Checkout, payout and legal HOLDs remain.

Required validation after recording the test: prepared PASS; deployed and live FAIL for retained partial inventory, high threats and six incomplete matrix gates. Live also reports missing actual inquiry authority/receipt/Reply-To/reply. These failures are acceptance gaps; recovery HTTP health passed. Validator logs are retained in the ignored proof cache as `contact-final-{prepared,deployed,live}-validation-20261011.log`.

## Evidence references

Ignored artifacts under `playwright/.cache/phase27-08/`: `contact-mobile-denial-20261011.json`, `contact-owned-quota-fixture-20261011.json`, `contact-bounded-http-20261011.json`, `contact-bounded-complete-20261011.json`, `contact-recovery-20261011.json`, `contact-shared-quota-trace-20261011.txt`, `contact-disabled-ui-20261011.txt`, `contact-disabled-ui-20261011.png`, `contact-guard-restored-20261011.png`. Exact fixture values are retained only in the private ignored proof cache.
