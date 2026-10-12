import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { validateEvidence, runnerSummary } from "../../scripts/verify-phase27-evidence.mjs";
import { CONTROL_ROWS, OBSERVER_FILES, OBSERVER_COMMAND, claimsForRole } from "../../scripts/phase27-contact-binding.mjs";
import { completeFixture } from "./fixtures/phase27-evidence.mjs";
const root=fileURLToPath(new URL("../../",import.meta.url));
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const functions=["checkout-retire-sweep","didit-reconcile","guest-email","guest-email (failure)","notify","notify (failure)","ops-alert-digest","payment-reconcile","payout-reconcile","payout-sweep","reminders-sweep","request-expiry-sweep","settlement-account-probe","settlement-reconcile"];
// All external observations/authority in this file are hypothetical fixtures only.
function controlledFixture(global=false){
 const f=completeFixture(),id=CONTROL_ROWS[global?1:0],row=f.live.hostProviderControlMatrix.find(r=>r.id===id);
 f.readLog=p=>{
  const rel=relative(root,p).replaceAll("\\","/");
  if(OBSERVER_FILES.includes(rel))return readFileSync(p);
  if(!f.logs.has(rel))throw Error("fixture artifact absent");return f.logs.get(rel);
 };
 const revision=f.live.deployedRevision,manifest=f.live.sourceManifestSha256,packetId="synthetic-current-packet";
 const put=(p,value)=>{const bytes=typeof value==="string"?value:JSON.stringify(value);f.logs.set(p,bytes);return{path:p,sha256:hash(bytes)};};
 const source={kind:"offline-observer",applicationRevision:revision,revision:"b".repeat(40),dirty:false,claim:"clean-revision",capturedAt:"2026-10-08T20:00:00.000Z",files:OBSERVER_FILES.map(p=>({path:p,sha256:hash(readFileSync(resolve(root,p)))}))};
 const sourceRef=put("playwright/.cache/phase27-08/observer-fixture-source.json",source);
 const log="ℹ pass 45\nℹ fail 0\nℹ skipped 0\nℹ cancelled 0\n",summary=runnerSummary("node-test",log);
 f.engineering.observerVerification={schemaVersion:1,source:sourceRef,gate:{command:OBSERVER_COMMAND,status:"pass",exitCode:0,startedAt:"2026-10-08T20:01:00.000Z",finishedAt:"2026-10-08T20:01:01.000Z",log:put("playwright/.cache/phase27-08/observer-fixture-test.log",log),...summary}};
 const authority={status:"approved",packetId,ownerInstruction:"Hypothetical bounded test approval fixture",approvedAt:"2026-10-08T20:00:00.000Z",revision,manifest,baselineId:f.live.deploymentId,opsId:f.live.deployments.ops.id,projectId:"prj_webFixture",maxWindowSeconds:300,maxPosts:12,recipient:"owner@example.test"};
 f.packet.contactTestAuthorities={[id]:authority};
 const ds=["dpl_variantA","dpl_variantB"].map(id=>({id,revision,manifest,projectId:authority.projectId,target:"production",readyState:"READY",autoAssignCustomDomains:false,createdAt:"2026-10-08T20:10:00.000Z",overrides:{CONTACT_PRODUCTION_ENABLED:"true",CONTACT_INGRESS_VERIFICATION_MODE:"true"}}));
 const b={schemaVersion:1,scenario:id,packetId,baselineId:f.live.deploymentId,restoredId:f.live.deploymentId,opsId:f.live.deployments.ops.id,revision,manifest,testDeployments:ds,
 savedContactFlag:false,savedVerificationFlag:false,originsUnchanged:true,opsUnchanged:true,financialInvocations:0,
 guard:{id:"rule_phase_27_restricted_contact_test_j9IM6v",environment:"production",host:"fitout.live",path:"/api/contact",method:"POST",action:"Deny",originalIpNotEqual:true,published:true,freshDifferentNetworkDenial:true,freshOperator503:true,provedAt:"2026-10-08T20:59:00.000Z"},
 window:{startedAt:"2026-10-08T21:00:00.000Z",restoredAt:"2026-10-08T21:04:00.000Z"},contactPosts:global?5:10,inquiryCalls:0,
 quota:{preRows:0,cleanupFingerprintMatched:true,cleanupRows:2,finalRows:0,cleanedAt:"2026-10-08T21:04:10.000Z"},
 restoration:{apexId:f.live.deploymentId,appId:f.live.deploymentId,opsId:f.live.deployments.ops.id,contactFlag:false,verificationFlag:false,contactStatus:503,healthySurfaces:4,pendingAlerts:0,priorSyntheticAlertsRetained:1,guardDisabled:true,originalLogPreserved:true,financialReceiverRestored:true,contactAppSeparate:true,financialFunctions:functions},
 perIp:{reserved:5,sharedDenials:2,globalCount:5,ipCount:5,keyCount:2,requestsInRuntimeAtFirstDenial:3,forgedHeadersDenied:true,fingerprintsUnchanged:true},alertsCreated:0,alertEmails:0,
 global:{seedReservations:99,httpReservation:1,finalReservations:100,ipReservations:1,naturalIncident:true,manualAlertInsert:false,incidents:1,syntheticFlag:false,otherRuntimeDenied:true,incidentId:"fixtureNaturalIncident",incidentCreatedAt:"2026-10-08T21:01:00.000Z"},
 alert:{recipient:authority.recipient,incidentId:"fixtureNaturalIncident",scheduledTimer:true,manualInvoke:false,firstRunId:"fixtureScheduled1",secondRunId:"fixtureScheduled2",firstPendingProcessed:1,secondPendingProcessed:0,providerAcceptances:1,providerId:"fixtureProviderAccepted",delivered:true,ownerReceived:true,ownedCleanupMatches:true,priorSentSyntheticRetained:true,finalPending:0,firstRunAt:"2026-10-08T21:06:00.000Z",secondRunAt:"2026-10-08T21:11:00.000Z",cleanedAt:"2026-10-08T21:12:00.000Z"}};
 b.requests=Array.from({length:global?2:7},(_,i)=>({at:new Date(Date.parse("2026-10-08T21:01:00.000Z")+i*1000).toISOString(),deploymentId:global?(i?ds[1].id:ds[0].id):(i<3?ds[0].id:ds[1].id),instanceId:global?(i?"runtimeB":"runtimeA"):(i<3?"runtimeA":"runtimeB"),requestId:"syntheticRequest"+i,host:"fitout.live",path:"/api/contact",method:"POST",noMailBranchObserved:true,status:global?(i?429:503):(i<5?503:429),reservation:global?(i?"limited":"reserved"):(i<5?"reserved":"limited"),...((global&&i)||(!global&&i>=5)?{retryAfter:global?3500:850}:{})}));
 row.deploymentId=ds[1].id;row.observedAt=global?"2026-10-08T21:12:30.000Z":"2026-10-08T21:05:00.000Z";
 const roles=["deployments","guard","runtime","quota","restoration",...(global?["scheduler","delivery","cleanup"]:[])];
 function writeBinding(refresh=true){
  if(refresh)b.artifacts=roles.map(role=>{
   const capture=put("playwright/.cache/phase27-08/fixture-capture-"+role+".txt","Hypothetical "+role+" captured bytes");
   return{role,...put("playwright/.cache/phase27-08/fixture-envelope-"+role+".json",{schemaVersion:1,role,packetId:b.packetId,revision:b.revision,claims:claimsForRole(b,role),captures:[capture]})};
  });
  row.controlTestProof=put("playwright/.cache/phase27-08/fixture-control-binding.json",b);row.proof=row.controlTestProof.path;
 }
 writeBinding();
 return{f,row,b,authority,writeBinding,put};
}
for(const global of[false,true])test("complete actual-checker controlled fixture "+(global?"global":"IP")+" passes only structural validation",()=>assert.deepEqual(validateEvidence(controlledFixture(global).f),[]));
const common=[
 ["source mismatch",x=>x.b.testDeployments[0].revision="c".repeat(40)],
 ["manifest mismatch",x=>x.b.testDeployments[0].manifest="c".repeat(64)],
 ["historical restore",x=>x.b.restoredId="dpl_oldBaseline"],
 ["historical authority",x=>x.b.packetId="oldCompletedPacket"],
 ["prepared authority",x=>x.authority.status="prepared"],
 ["missing owner instruction",x=>x.authority.ownerInstruction=""],
 ["wrong project",x=>x.b.testDeployments[0].projectId="prj_other"],
 ["same variants",x=>x.b.testDeployments[1].id=x.b.testDeployments[0].id],
 ["disabled baseline as variant",x=>x.b.testDeployments[0].id=x.f.live.deploymentId],
 ["Preview",x=>x.b.testDeployments[0].target="preview"],
 ["not ready",x=>x.b.testDeployments[0].readyState="BUILDING"],
 ["auto assigns public domains",x=>x.b.testDeployments[0].autoAssignCustomDomains=true],
 ["extra database override",x=>x.b.testDeployments[0].overrides.DATABASE_URL="forbidden"],
 ["extra origin override",x=>x.b.testDeployments[0].overrides.MARKETING_APP_URL="https://other.test"],
 ["absent no-mail mode",x=>delete x.b.testDeployments[0].overrides.CONTACT_INGRESS_VERIFICATION_MODE],
 ["saved enablement",x=>x.b.savedContactFlag=true],
 ["unpublished restriction",x=>x.b.guard.published=false],
 ["stale independent network",x=>x.b.guard.freshDifferentNetworkDenial=false],
 ["wrong guard host",x=>x.b.guard.host="app.fitout.live"],
 ["wrong guard action",x=>x.b.guard.action="Log"],
 ["synthetic IP condition",x=>x.b.guard.originalIpNotEqual=false],
 ["late guard",x=>x.b.guard.provedAt="2026-10-08T21:01:00.000Z"],
 ["excess window",x=>x.b.window.restoredAt="2026-10-08T21:05:00.001Z"],
 ["late request",x=>x.b.requests[0].at="2026-10-08T21:06:00.000Z"],
 ["missing requests",x=>x.b.requests=[]],
 ["duplicate requests",x=>x.b.requests[1].requestId=x.b.requests[0].requestId],
 ["fake executing ID",x=>x.row.deploymentId=x.f.live.deploymentId],
 ["same runtime",x=>x.b.requests.forEach(r=>r.instanceId="same")],
 ["status-only mode",x=>x.b.requests[0].noMailBranchObserved=false],
 ["inquiry call",x=>x.b.inquiryCalls=1],
 ["financial invocation",x=>x.b.financialInvocations=1],
 ["changed Ops",x=>x.b.opsUnchanged=false],
 ["origins drift",x=>x.b.originsUnchanged=false],
 ["wrong final app",x=>x.b.restoration.appId="dpl_other"],
 ["wrong scheduler",x=>x.b.restoration.financialFunctions[0]="unexpected"],
 ["missing restore receiver",x=>x.b.restoration.financialReceiverRestored=false],
 ["cleanup not owned",x=>x.b.quota.cleanupFingerprintMatched=false],
 ["preexisting quota",x=>x.b.quota.preRows=1],
 ["remaining quota",x=>x.b.quota.finalRows=1],
 ["cleanup before disabled restore",x=>x.b.quota.cleanedAt="2026-10-08T21:01:00.000Z"],
 ["local IP denial",x=>x.b.perIp.requestsInRuntimeAtFirstDenial=6],
 ["forged headers gain quota",x=>x.b.perIp.fingerprintsUnchanged=false],
 ["per-IP email",x=>x.b.alertEmails=1],
 ["over request budget",x=>x.b.contactPosts=13],
 ["bad observer version",x=>x.f.engineering.observerVerification.schemaVersion=2],
 ["missing observer",x=>delete x.f.engineering.observerVerification],
 ["missing authority",x=>delete x.f.packet.contactTestAuthorities],
];
for(const[name,change]of common)test("actual checker rejects "+name,()=>{const x=controlledFixture();change(x);x.writeBinding();assert.ok(validateEvidence(x.f).length>0);});
const globalCases=[
 ["manual incident",x=>x.b.global.manualAlertInsert=true],
 ["synthetic substituted incident",x=>x.b.global.syntheticFlag=true],
 ["no hundredth HTTP slot",x=>x.b.global.httpReservation=0],
 ["no other runtime denial",x=>x.b.global.otherRuntimeDenied=false],
 ["IP-cap retry",x=>x.b.requests[1].retryAfter=850],
 ["wrong recipient",x=>x.b.alert.recipient="another@example.test"],
 ["manual invocation",x=>x.b.alert.manualInvoke=true],
 ["mismatched incident",x=>x.b.alert.incidentId="other"],
 ["duplicate email",x=>x.b.alert.providerAcceptances=2],
 ["no second run",x=>x.b.alert.secondPendingProcessed=1],
 ["not delivered",x=>x.b.alert.delivered=false],
 ["missing owner receipt",x=>x.b.alert.ownerReceived=false],
 ["incorrect alert cleanup",x=>x.b.alert.ownedCleanupMatches=false],
 ["old synthetic removed",x=>x.b.alert.priorSentSyntheticRetained=false],
 ["alert outside bound",x=>x.b.alert.secondRunAt="2026-10-08T22:00:00.000Z"],
 ["cleanup before duplicate check",x=>x.b.alert.cleanedAt="2026-10-08T21:06:01.000Z"],
];
for(const[name,change]of globalCases)test("actual checker rejects global "+name,()=>{const x=controlledFixture(true);change(x);x.writeBinding();assert.ok(validateEvidence(x.f).length>0);});
test("ordinary marketing cannot claim a Contact exception",()=>{const x=controlledFixture();const marketing=x.f.live.hostProviderControlMatrix[0];marketing.controlTestProof=x.row.controlTestProof;marketing.deploymentId="dpl_variantB";assert.ok(validateEvidence(x.f).some(e=>e.includes("Contact-controls only")));assert.ok(validateEvidence(x.f).some(e=>e.includes("marketing-home: candidate identity mismatch")));});
test("current Contact rows without a variant retain original exact-ID validation",()=>{const x=controlledFixture();delete x.row.controlTestProof;assert.ok(validateEvidence(x.f).some(e=>e.includes(x.row.id+": candidate identity mismatch")));});
test("traversal and absolute proof paths fail closed",()=>{for(const path of["../outside.json","C:/outside.json","playwright/.cache/phase27-08/../outside.json"]){const x=controlledFixture();x.row.controlTestProof.path=path;assert.ok(validateEvidence(x.f).length>0);}});
test("proof byte tampering fails",()=>{const x=controlledFixture();x.f.logs.set(x.row.controlTestProof.path,"{}");assert.ok(validateEvidence(x.f).some(e=>e.includes("byte digest mismatch")));});
test("missing/contradictory capture bytes fail",()=>{const x=controlledFixture();const ref=x.b.artifacts[0];x.f.logs.set(ref.path,"{}");assert.ok(validateEvidence(x.f).length>0);});
test("typed envelope disagreement fails even with correct envelope digest",()=>{const x=controlledFixture();const ref=x.b.artifacts[0],envelope=JSON.parse(x.f.logs.get(ref.path));envelope.claims.savedContactFlag=true;x.b.artifacts[0]={role:ref.role,...x.put(ref.path,envelope)};x.writeBinding(false);assert.ok(validateEvidence(x.f).some(e=>e.includes("typed artifact claims contradict")));});
test("missing role and malformed binding fields do not throw",()=>{for(const change of[x=>x.b.artifacts.pop(),x=>x.b.testDeployments=null,x=>x.b.guard=null,x=>x.b.window=null]){const x=controlledFixture();change(x);x.writeBinding(false);assert.doesNotThrow(()=>validateEvidence(x.f));assert.ok(validateEvidence(x.f).length>0);}});
test("observer digest mismatch prevents variant acceptance",()=>{const x=controlledFixture();x.f.engineering.observerVerification.source.sha256="0".repeat(64);assert.ok(validateEvidence(x.f).some(e=>e.includes("observer source: artifact byte digest mismatch")));});
test("observer log cannot claim failures/skips as pass",()=>{const x=controlledFixture();const gate=x.f.engineering.observerVerification.gate;gate.log=x.put(gate.log.path,"ℹ pass 44\nℹ fail 1\nℹ skipped 0\nℹ cancelled 0\n");assert.ok(validateEvidence(x.f).some(e=>e.includes("observer gate command/runner totals invalid")));});
test("observer missing source files fail",()=>{const x=controlledFixture();const source=JSON.parse(x.f.logs.get(x.f.engineering.observerVerification.source.path));source.files.pop();x.f.engineering.observerVerification.source=x.put(x.f.engineering.observerVerification.source.path,source);assert.ok(validateEvidence(x.f).some(e=>e.includes("observer exact source files")));});
test("inventory/high-threat/inbox gates remain enforced after control binding",()=>{const x=controlledFixture();x.f.inventory.rows[0].status="partial";x.f.live.highThreats=["still-open"];assert.ok(validateEvidence(x.f).some(e=>e.includes("external inventory")));assert.ok(validateEvidence(x.f).some(e=>e.includes("high threats")));assert.ok(validateEvidence({...x.f,stage:"live"}).some(e=>e.includes("Actual owner-observed receipt")));});
