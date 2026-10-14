# Phase 27 — Per-IP retry with served-route readiness

Prepared 2026-10-12T09:54:21.303Z; approval pending. Contact remains disabled. This document does not renew the closed window.

## Actual stopped attempt

The approved window began09:38:32.232Z on12October and restoredCogas by09:40:28.575Z (116.343seconds conservatively). Three APOSTs returned503, but the first request c7294-1791797921540-6fa215d80665 was actually served by old disabledCogas, confirmed in Vercel's provider trace. Only the nexttwo reachedA and logged reserved with runtimeUUID4ee4b3af-fe71-449b-a0ca-f3f7700a1562; global/IP counts2. The mismatch stopped the window beforeB/spoof. One empty recoveryPOST returned503/no-store. Exactlytwo owned quota rows with their complete two-timestamp arrays and expiry captures were removed under advisorylock27018,1; primaryquota0/alert1/pending0. TemporaryDeny disabled/publishedv9, originalLog/systemmitigations preserved. PublicpinsCogas/Ops5WY, savedflagsfalse.

No accepted control row. Actual4newPOSTs plus3priorpreflight=7charged of12. This incomplete window is closed; its unused5 requests cannot silently fund another window. Earlier incompletepreflights remain datedhistory.

Evidence C:/Users/Admin/Roaming/FitOut/playwright/.cache/phase27-08/per-ip-external-preflight-7781be9b-3b1e-4530-9e83-1c033a98d5a0/bounded-window/outcome.json, first-request-baseline-trace.txt/.png, stage-A-captures.json, cleanup-capture.json, after-primary.json, disabled-recovery.json, watchdog-restoration.json and guard-cleanup-published.json.

## Repair prepared without a public change

An alias-assignment API success is control-plane evidence, not proof that the operator's next request reaches that deployment. Before the first APOST and before any BPOST, require two consecutive distinct GET /api/contact requests from the same operator network, both405, and their exact Vercel provider traces showing the intended current deployment. Match requestIDs, method/path/time/windowrun/source to the currentassignment; retain hash-bound captures. A bare405 or generic health200 is insufficient. Wrong or unavailable deployment evidence permits only the bounded read-only readiness GETs; never use a quota POST to wait for propagation.

Preparedhelpers C:/Users/Admin/Roaming/FitOut/playwright/.cache/phase27-08/per-ip-route-readiness-38e870d8-5302-46b3-b0bf-09a9036f465c. route-readiness-get.mjs allows at most6GETs perstage and stops before180seconds; revised bounded-probe.mjs fails closed unless the two exact currentroute captures exist. No new production endpoint/header/source/build is needed. Source588 and existing A/B remain unchanged.

## Proposed fresh scope, requiring separate approval

- Re-enable/publish only the same exact temporaryDeny (currentlydisabledv9), preserving its privateoperatorIPfingerprint and all otherrules/systemmitigations. Stop on draft/config/IPdrift rather than changing the exemption.
- Fresh disabledpreflight at most2POSTs: one uniquely marked operator503 and one new marked externalSandbox403 matched to exactDeny with distinctoriginalIP. At mostone new nonpersistent1vCPU Sandbox,120-secondtimeout, fitout.live-onlyegress, includedHobbyquota, explicitstop. Noupgrade/bypass/secrets/source/ports. A failed or missingmatch ends this attempt.
- Start a fresh300-secondmaximum apex-only A/Bwindow using existing exact588 protected no-mail builds; independent240-secondrestoration. Apply the two-current-route-capture barrier perstage. Preserve app/Ops/fallback pins, savedflagsfalse, originalfinancialreceiver14 and separateContact app.
- Seven enabled no-mailPOSTs only: A3reservations503; B2reservations503 thenshared429; one forged-header429. Require distinctruntimeUUIDs, Bbelowlocalcap, exactsharedcounts5/unchangedfingerprints, retry1..900, no inquirytransport.
- RestoreCogas; at mostone disabledrecovery503. Exactownedtwo-rowcleanup under27018,1 only with full keys/attempts/expiry match and no unknownrows. Disable/publish only temporaryDeny after disabled restoration; preserve originalLog/systemmitigations. Reconcile originalreceiver only if automaticrefresh occurred; no manualfinancialjobs.
- Fresh maximum10ContactPOSTs:2disabledpreflight+7enabled+1recovery. No automaticreplacement/retry or budgetextension; the priorclosed7-postsequence is retained separately. Maximum12read-onlyreadinessGETs (6perstage), without extending the timer. Any failure restoresdisabledbaseline.

Approval covers only this exact renewed attempt; global-budget alert, permanent Contactenablement, fixture99seed and all financialflows remain outside it. Matrix33/35; Plan09incomplete.


Final rollback checks 2026-10-12T09:56:52.803Z: allfour publichealth statuses pass(apex/app/Ops200, retiredfallback404); originalCogas financialreceiver14 and separateContactreceiver1 freshly confirmed unchanged. Readiness helpers syntax/check-only pass; missing routeproof blocksPOST, missingapprovedwindow blocksreadinessGET, zeroHTTPrequests in offlinechecks. No application sourcechange. Freshretrypacket remainsunapproved.


Readiness retry 2026-10-13T02:51:05.804Z: ownerapproved exactscope; activeguard re-enabledv10, one disabledoperatorPOST403 at02:46:15Z. ExactrestrictionDeny1/uniqueUA/currentIPfingerprint differs fromsavedexemption, providerConverge vs priorPLDT. StoppedonIPdrift perpacket; noSandbox/livewindow/alias/quota/mail. Guardcleanupdisabled/publishedv11, primaryquota0/alert1/pending0, publichealth/pins/savedflagsunchanged. Actual1POST consumed; no automaticretry/exemptionedit. Narrow reviewable11-totalPOST single-IP amendment27-CONTACT-CURRENT-OPERATOR-IP-AMENDMENT.md preparedunapproved. Evidence C:/Users/Admin/Roaming/FitOut/playwright/.cache/phase27-08/per-ip-route-readiness-38e870d8-5302-46b3-b0bf-09a9036f465c/outcome.json;33/35unchanged.
