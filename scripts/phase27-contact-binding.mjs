import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";

export const CONTACT_BINDING_VERSION = 1;
export const CONTROL_ROWS = ["contact-trusted-ingress-per-ip", "contact-distributed-global-budget"];
export const OBSERVER_FILES = [
 "scripts/phase27-contact-binding.mjs",
 "scripts/verify-phase27-evidence.mjs",
 "tests/scripts/fixtures/phase27-evidence.mjs",
 "tests/scripts/phase27-contact-binding.test.mjs",
 "tests/scripts/phase27-evidence.test.mjs",
];
export const OBSERVER_COMMAND = "node --test --test-reporter=spec tests/scripts/phase27-evidence.test.mjs tests/scripts/phase27-contact-binding.test.mjs";
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const nonempty = v => typeof v === "string" && v.trim().length > 0;
const hash = v => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const deployment = v => typeof v === "string" && /^dpl_[A-Za-z0-9]+$/.test(v);
const utc = v => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(v) &&
 Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 19) === v.slice(0, 19);
const financialFunctions = [
 "checkout-retire-sweep", "didit-reconcile", "guest-email", "guest-email (failure)", "notify",
 "notify (failure)", "ops-alert-digest", "payment-reconcile", "payout-reconcile", "payout-sweep",
 "reminders-sweep", "request-expiry-sweep", "settlement-account-probe", "settlement-reconcile",
];
function safeArtifact(ref, root, readLog, check, label, json = false) {
 const p = ref?.path;
 const allowed = nonempty(p) && p.startsWith("playwright/.cache/phase27-08/") &&
  !p.includes("\\") && !p.split("/").includes("..") && !isAbsolute(p) &&
  /\.(?:json|log|txt|png)$/.test(p) && hash(ref?.sha256);
 check(allowed, label + ": contained artifact path/digest required");
 if (!allowed) return undefined;
 const target = resolve(root, p), r = relative(root, target);
 if (r === ".." || r.startsWith("../") || r.startsWith("..\\") || isAbsolute(r)) {
  check(false, label + ": artifact leaves workspace"); return undefined;
 }
 try {
  const bytes = readLog(target);
  check(digest(bytes) === ref.sha256, label + ": artifact byte digest mismatch");
  if (digest(bytes) !== ref.sha256) return undefined;
  return json ? JSON.parse(String(bytes)) : String(bytes);
 } catch { check(false, label + ": artifact unavailable/malformed"); return undefined; }
}


const canonical = value => JSON.stringify(value, (_key, v) =>
 v && typeof v === "object" && !Array.isArray(v)
 ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])) : v);
export function claimsForRole(b, role) {
 switch(role){
 case "deployments": return { baselineId:b.baselineId,opsId:b.opsId,revision:b.revision,manifest:b.manifest,
 testDeployments:b.testDeployments,savedContactFlag:b.savedContactFlag,savedVerificationFlag:b.savedVerificationFlag,
 originsUnchanged:b.originsUnchanged,opsUnchanged:b.opsUnchanged };
 case "guard": return {guard:b.guard};
 case "runtime": return {window:b.window,requests:b.requests,contactPosts:b.contactPosts,inquiryCalls:b.inquiryCalls,...(b.apiRouteProofs?{apiRouteProofs:b.apiRouteProofs}:{})};
 case "quota": return {quota:b.quota,...(b.scenario===CONTROL_ROWS[0]?{perIp:b.perIp}:{global:b.global})};
 case "restoration": return {restoredId:b.restoredId,restoration:b.restoration,financialInvocations:b.financialInvocations};
 case "scheduler": case "delivery": case "cleanup": return {global:b.global,alert:b.alert};
 default: return undefined;
 }
}

/** Offline observer provenance is separate from immutable application gate/source snapshots. */
export function validateBindingObserver(observer, { root, readLog, revision, summarize }) {
 const errors = []; const check = (v,m) => { if (!v) errors.push(m); };
 try {
  check(observer?.schemaVersion === CONTACT_BINDING_VERSION, "Contact observer version missing");
  const source = safeArtifact(observer?.source, root, readLog, check, "Contact observer source", true);
  const gate = observer?.gate;
  const log = safeArtifact(gate?.log, root, readLog, check, "Contact observer gate");
  check(source?.kind === "offline-observer" && source?.applicationRevision === revision &&
   /^[a-f0-9]{40}$/.test(source?.revision ?? "") && typeof source?.dirty === "boolean" &&
   source?.claim === (source?.dirty ? "working-tree" : "clean-revision") && utc(source?.capturedAt),
   "Contact observer captured context/application binding invalid");
  check(Array.isArray(source?.files) && source.files.length === OBSERVER_FILES.length &&
   source.files.every((f,i) => f.path === OBSERVER_FILES[i] && hash(f.sha256)),
   "Contact observer exact source files required");
  if (Array.isArray(source?.files)) for (const f of source.files) {
   if (!OBSERVER_FILES.includes(f?.path) || !hash(f?.sha256)) continue;
   try { check(digest(readLog(resolve(root, f.path))) === f.sha256, "Contact observer current file digest mismatch"); }
   catch { check(false, "Contact observer current file unavailable"); }
  }
  const result = log === undefined ? null : summarize("node-test", log);
  check(gate?.command === OBSERVER_COMMAND && gate?.exitCode === 0 && gate?.status === "pass" &&
   result?.failed === 0 && result?.resultData?.tests?.passed > 0 && result?.resultData?.tests?.skipped === 0 &&
   gate?.terminalSummary === result?.terminalSummary &&
   JSON.stringify(gate?.resultData) === JSON.stringify(result?.resultData),
   "Contact observer gate command/runner totals invalid");
  check(utc(gate?.startedAt) && utc(gate?.finishedAt) &&
   Date.parse(gate.finishedAt) >= Date.parse(gate.startedAt) &&
   Date.parse(source?.capturedAt) <= Date.parse(gate?.startedAt),
   "Contact observer gate chronology invalid");
 } catch { check(false, "Contact observer malformed evidence"); }
 return errors;
}

/** Only two Contact rows can reference actual, same-source controlled deployments. */
export function validateControlledContact({ row, live, packet, engineering, root, readLog }) {
 const errors = []; const check = (v,m) => { if (!v) errors.push(row.id + ": " + m); };
 try {
  check(CONTROL_ROWS.includes(row.id), "variant exception is Contact-controls only");
  if (!CONTROL_ROWS.includes(row.id)) return errors;
  check(engineering?.observerVerification?.schemaVersion === CONTACT_BINDING_VERSION,
   "tested observer provenance is required");
  const b = safeArtifact(row.controlTestProof, root, readLog, check, "Contact test binding", true);
  if (!b) return errors;
  const a = packet?.contactTestAuthorities?.[row.id], c = live.deployments?.customer, ops = live.deployments?.ops;
  check(b.schemaVersion === CONTACT_BINDING_VERSION && b.scenario === row.id, "controlled binding version/scenario");

  const apiEight = row.id === CONTROL_ROWS[0] && a?.maxWindowSeconds === 480 &&
   a.windowProfile === "api-trace-eight-minute-v1" &&
   a.routeProofMethod === "vercel-otel-actual-request" && a.watchdogSeconds === 360 &&
   nonempty(a.attemptId) && a.attemptId === b.attemptId && b.window?.attemptId === a.attemptId;
  check(a?.status === "approved" && nonempty(a?.packetId) && nonempty(a?.ownerInstruction) && utc(a?.approvedAt) &&
   a.revision === live.deployedRevision && a.manifest === live.sourceManifestSha256 &&
   a.baselineId === c?.id && a.opsId === ops?.id && nonempty(a.projectId) &&
   (a.maxWindowSeconds === 300 || apiEight) && Number.isInteger(a.maxPosts) && a.maxPosts > 0 && a.maxPosts <= 12 &&
   b.packetId === a.packetId, "exact current bounded authority missing");
  check(b.baselineId === c?.id && b.restoredId === c?.id && b.opsId === ops?.id &&
   b.revision === live.deployedRevision && b.manifest === live.sourceManifestSha256,
   "current release/source/restoration binding mismatch");
  check(row.revision === live.deployedRevision && row.proof === row.controlTestProof.path,
   "actual row source/proof mismatch");
  const ds = b.testDeployments;
  check(Array.isArray(ds) && ds.length === 2 && new Set(ds.map(d=>d?.id)).size === 2 &&
   ds.every(d=>deployment(d?.id) && d.id !== c?.id), "two distinct actual immutable test deployments");
  if (Array.isArray(ds)) for (const d of ds) {
   check(d.revision === live.deployedRevision && d.manifest === live.sourceManifestSha256 &&
    d.projectId === a?.projectId && d.target === "production" && d.readyState === "READY" &&
    d.autoAssignCustomDomains === false, "exact ready same-source/project variant");
   check(d.overrides && Object.keys(d.overrides).sort().join(",") ===
    "CONTACT_INGRESS_VERIFICATION_MODE,CONTACT_PRODUCTION_ENABLED" &&
    d.overrides.CONTACT_PRODUCTION_ENABLED === "true" && d.overrides.CONTACT_INGRESS_VERIFICATION_MODE === "true",
    "only two deployment no-mail flags may differ");
   const stagedBeforeWindowApproval = Date.parse(d.createdAt) < Date.parse(a?.approvedAt);
   const s = a?.stagingAuthority;
   const stagingApproved = !stagedBeforeWindowApproval || (s?.status === "approved" &&
    s.packetId === a?.packetId && nonempty(s.ownerInstruction) && utc(s.approvedAt) &&
    s.revision === live.deployedRevision && s.manifest === live.sourceManifestSha256 &&
    s.baselineId === c?.id && s.opsId === ops?.id && s.projectId === a?.projectId &&
    Date.parse(s.approvedAt) <= Date.parse(d.createdAt));
   check(utc(d.createdAt) && utc(a?.approvedAt) && stagingApproved &&
    Date.parse(a.approvedAt) <= Date.parse(b.window?.startedAt) &&
    Date.parse(d.createdAt) < Date.parse(b.window?.startedAt), "variant/authority chronology");
  }
  check(Array.isArray(ds) && ds.some(d=>d.id === row.deploymentId) &&
   b.requests?.at(-1)?.deploymentId === row.deploymentId, "retain actual final executing ID");
  check(b.savedContactFlag === false && b.savedVerificationFlag === false &&
   b.originsUnchanged === true && b.opsUnchanged === true && b.financialInvocations === 0,
   "saved gates/origins/Ops/financial boundaries");
  const g = b.guard;
  check(g?.id === "rule_phase_27_restricted_contact_test_j9IM6v" && g.environment === "production" &&
   g.host === "fitout.live" && g.path === "/api/contact" && g.method === "POST" && g.action === "Deny" &&
   g.originalIpNotEqual === true && g.published === true && g.freshDifferentNetworkDenial === true &&
   g.freshOperator503 === true && utc(g.provedAt) && Date.parse(g.provedAt) < Date.parse(b.window?.startedAt),
   "fresh exact published real-network restriction proof");
  const w = b.window;
  check(utc(w?.startedAt) && utc(w?.restoredAt) && Date.parse(w.restoredAt) > Date.parse(w.startedAt) &&
   Date.parse(w.restoredAt)-Date.parse(w.startedAt) <= (apiEight ? 480000 : 300000) &&
   utc(row.observedAt) && Date.parse(row.observedAt) >= Date.parse(w.restoredAt),
   apiEight ? "eight-minute window/restoration/observation chronology" : "five-minute window/restoration/observation chronology");

  if (apiEight) {
   check(w?.watchdogSeconds === 360, "explicit six-minute watchdog missing");
   const proofs = b.apiRouteProofs;
   check(Array.isArray(proofs) && proofs.length === 6 &&
    ["A","B","R"].every(phase=>proofs.filter(p=>p?.phase===phase).length===2),
    "API profile requires A/B/recovery route pairs");
   const seen = new Set();
   if (Array.isArray(proofs)) for (const p of proofs) {
    const http = safeArtifact(p?.http, root, readLog, check, "API route HTTP", true);
    const provider = safeArtifact(p?.provider, root, readLog, check, "API route provider", true);
    if (!http || !provider) continue;
    const expected = p.phase === "R" ? c?.id : ds?.[p.phase === "A" ? 0 : 1]?.id;
    const requestId = String(http.requestId ?? "").split("::").at(-1);
    const trace = provider.trace ?? provider;
    const roots = Array.isArray(trace.spans) ? trace.spans.filter(s=>!s.parentSpanId &&
     s.attributes?.["vercel.request_id"]===requestId) : [];
    const attr = roots[0]?.attributes;
    const firstPost = b.requests?.find(r=>r.deploymentId===expected)?.at;
    const chronology = utc(http.at) && (p.phase === "R"
     ? Date.parse(http.at)>=Date.parse(w?.restoredAt) && Date.parse(http.at)<=Date.parse(w?.startedAt)+480000
     : Date.parse(http.at)>=Date.parse(w?.startedAt) && Date.parse(http.at)<=Date.parse(firstPost));
    check(["A","B","R"].includes(p.phase) && http.stage===p.phase &&
     http.status===405 && nonempty(http.requestId) && nonempty(http.marker) &&
     !seen.has(http.requestId) && chronology && roots.length===1 &&
     attr?.["http.method"]==="GET" && attr?.["http.target"]==="/api/contact" &&
     attr?.["server.address"]==="fitout.live" && attr?.["deployment.environment"]==="production" &&
     attr?.["vercel.project_id"]===a.projectId && attr?.["vercel.deployment_id"]===expected &&
     attr?.["vcs.ref.head.revision"]===b.revision &&
     attr?.["http.request.header.user-agent"]===http.marker,
     "actual API route source/request/chronology mismatch");
    seen.add(http.requestId);
   }
  }
  const ip = row.id === CONTROL_ROWS[0], rs = b.requests, expectedCount = ip ? 7 : 2;
  check(Array.isArray(rs) && rs.length === expectedCount &&
   rs.every(r=>utc(r?.at) && Date.parse(r.at)>=Date.parse(w?.startedAt) && Date.parse(r.at)<=Date.parse(w?.restoredAt) &&
    ds?.some(d=>d.id===r.deploymentId) && nonempty(r.requestId) && nonempty(r.instanceId) &&
    r.host==="fitout.live" && r.method==="POST" && r.path==="/api/contact") &&
   new Set(rs.map(r=>r?.requestId)).size===expectedCount, "exact enabled HTTP request trace/chronology");
  if (Array.isArray(rs)) {
   check(new Set(rs.map(r=>r.instanceId)).size>=2, "distinct actual runtime markers");
   check(rs.every(r=>r.noMailBranchObserved===true) && b.inquiryCalls===0, "no-mail branch/inquiry transport boundary");
   check(rs.every((r,i)=>i===0||Date.parse(r.at)>=Date.parse(rs[i-1].at)), "request order");
  }
  check(Number.isInteger(b.contactPosts) && b.contactPosts>=expectedCount && b.contactPosts<=a?.maxPosts,
   "bounded total Contact request budget");
  const q=b.quota;
  check(q?.preRows===0 && q?.cleanupFingerprintMatched===true && q?.cleanupRows===2 &&
   q?.finalRows===0 && utc(q?.cleanedAt) && Date.parse(q.cleanedAt)>=Date.parse(w?.restoredAt),
   "strict owned two-row quota cleanup");
  const restore=b.restoration;
  check(restore?.apexId===c?.id && restore.appId===c?.id && restore.opsId===ops?.id &&
   restore.contactFlag===false && restore.verificationFlag===false && restore.contactStatus===503 &&
   restore.healthySurfaces===4 && restore.pendingAlerts===0 && restore.priorSyntheticAlertsRetained===1 &&
   restore.guardDisabled===true && restore.originalLogPreserved===true &&
   restore.financialReceiverRestored===true && restore.contactAppSeparate===true &&
   Array.isArray(restore.financialFunctions) &&
   restore.financialFunctions.slice().sort().join("|")===financialFunctions.slice().sort().join("|"),
   "disabled release/guard/provider restoration");
  const roles=["deployments","guard","runtime","quota","restoration",...(ip?[]:["scheduler","delivery","cleanup"])];
  check(Array.isArray(b.artifacts) && b.artifacts.length===roles.length &&
   new Set(b.artifacts.map(x=>x?.role)).size===roles.length &&
   b.artifacts.every(x=>roles.includes(x?.role)), "complete typed evidence artifact roles");
  if(Array.isArray(b.artifacts))for(const ref of b.artifacts){
   const envelope=safeArtifact(ref,root,readLog,check,"Contact "+ref.role,true);
   check(envelope?.schemaVersion===CONTACT_BINDING_VERSION&&envelope?.role===ref.role&&
    envelope?.packetId===b.packetId&&envelope?.revision===b.revision&&
    canonical(envelope?.claims)===canonical(claimsForRole(b,ref.role)),
    "typed artifact claims contradict controlled binding");
   check(Array.isArray(envelope?.captures)&&envelope.captures.length>0&&
    envelope.captures.every(x=>x?.path!==ref.path&&x?.path!==row.controlTestProof.path),
    "independent captured artifact bytes required");
   if(Array.isArray(envelope?.captures))for(const raw of envelope.captures)safeArtifact(raw,root,readLog,check,"Contact captured "+ref.role);
  }
  if(ip){
   const s=b.perIp;
   check(s?.reserved===5 && s.sharedDenials===2 && s.globalCount===5 && s.ipCount===5 && s.keyCount===2 &&
    s.requestsInRuntimeAtFirstDenial===3 && s.forgedHeadersDenied===true && s.fingerprintsUnchanged===true &&
    b.alertsCreated===0 && b.alertEmails===0, "shared per-IP counts/forgery/no-alert evidence");
   if(Array.isArray(rs)&&rs.length===7){
    check(rs.slice(0,5).every(r=>r.status===503&&r.reservation==="reserved") &&
     rs.slice(5).every(r=>r.status===429&&r.reservation==="limited"&&Number.isInteger(r.retryAfter)&&r.retryAfter>0&&r.retryAfter<=900),
     "per-IP real reservation/denial statuses");
    check(rs.slice(0,3).every(r=>r.deploymentId===ds?.[0]?.id) &&
     rs.slice(3).every(r=>r.deploymentId===ds?.[1]?.id) &&
     new Set(rs.slice(3).map(r=>r.instanceId)).size===1 &&
     !rs.slice(0,3).some(r=>r.instanceId===rs[3].instanceId), "A/B runtime sequencing below local cap");
   }
  }else{
   const s=b.global,z=b.alert;
   check(s?.seedReservations===99 && s.httpReservation===1 && s.finalReservations===100 && s.ipReservations===1 &&
    s.naturalIncident===true && s.manualAlertInsert===false && s.incidents===1 && s.syntheticFlag===false &&
    s.otherRuntimeDenied===true && nonempty(s.incidentId) && utc(s.incidentCreatedAt) &&
    Date.parse(s.incidentCreatedAt)>=Date.parse(w?.startedAt) && Date.parse(s.incidentCreatedAt)<=Date.parse(w?.restoredAt),
    "natural incident from real hundredth HTTP reservation");
   if(Array.isArray(rs)&&rs.length===2)check(rs[0].status===503&&rs[0].reservation==="reserved"&&
    rs[0].deploymentId===ds?.[0]?.id&&rs[1].status===429&&rs[1].reservation==="limited"&&
    rs[1].deploymentId===ds?.[1]?.id&&rs[0].instanceId!==rs[1].instanceId&&
    Number.isInteger(rs[1].retryAfter)&&rs[1].retryAfter>900&&rs[1].retryAfter<=3600,
    "different-runtime global denial distinguishes IP cap");
   check(nonempty(a?.recipient)&&z?.recipient===a.recipient&&z.incidentId===s?.incidentId&&
    z.scheduledTimer===true&&z.manualInvoke===false&&nonempty(z.firstRunId)&&nonempty(z.secondRunId)&&
    z.firstRunId!==z.secondRunId&&z.firstPendingProcessed===1&&z.secondPendingProcessed===0&&
    z.providerAcceptances===1&&nonempty(z.providerId)&&z.delivered===true&&z.ownerReceived===true&&
    z.ownedCleanupMatches===true&&z.priorSentSyntheticRetained===true&&z.finalPending===0,
    "matched scheduled delivery/Gmail/deduplication/owned incident cleanup");
   check(utc(z?.firstRunAt)&&utc(z?.secondRunAt)&&utc(z?.cleanedAt)&&
    Date.parse(z.firstRunAt)>=Date.parse(s?.incidentCreatedAt)&&Date.parse(z.secondRunAt)>Date.parse(z.firstRunAt)&&
    Date.parse(z.secondRunAt)<=Date.parse(w?.restoredAt)+900000&&Date.parse(z.cleanedAt)>=Date.parse(z.secondRunAt)&&
    Date.parse(row.observedAt)>=Date.parse(z.cleanedAt), "bounded alert/duplicate/cleanup chronology");
  }
 } catch { check(false,"malformed controlled evidence"); }
 return errors;
}
